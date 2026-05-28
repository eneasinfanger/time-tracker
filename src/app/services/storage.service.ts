import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { retry } from 'rxjs/operators';
import { Activity, ISODate, Settings, Time } from '../utils/models';
import { SettingsHolder } from '../utils/settings';
import { UUID } from '../utils/crypto';
import { getApiBaseUrl } from './api-base-url';

interface BackendDayActivitiesResponse {
  date: string;
  activities: BackendActivity[];
  summary: BackendSummaryResponse;
}

interface BackendSummaryEntry {
  key: string;
  totalMinutes: number;
  activityIds: Array<string | number>;
}

export interface BackendSummaryResponse {
  byDescription: BackendSummaryEntry[];
  byTask: BackendSummaryEntry[];
}

interface DayActivitiesResult {
  activities: Activity[];
  summary: BackendSummaryResponse;
}

interface SuggestionRequest {
  date: ISODate;
  field: 'description' | 'task' | 'start' | 'end';
  value?: string;
  currentActivityId?: string;
  currentActivities?: Activity[];
  activityType?: 'activity' | 'text';
  durationThreshold?: Settings['durationThreshold'];
  alwaysShownActivities?: Array<{ id?: string; description: string; task: string }>;
}

interface BackendActivity {
  id: number;
  task_name: string;
  description: string | null;
  category: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly http = inject(HttpClient);
  private readonly settingsKey = 'timetracker_settings';
  private readonly activitiesApiUrl = `${getApiBaseUrl()}/activities`;
  private readonly activitiesCache = new Map<ISODate, Activity[]>();
  private readonly emptySummary: BackendSummaryResponse = {
    byDescription: [],
    byTask: [],
  };

  initSettings() {
    let settings = this.getSettings();
    const fullSettings = SettingsHolder.getDefaultSettings();
    if (!settings) {
      settings = fullSettings;
    } else {
      const filtered = Object.fromEntries(
        Object.entries(settings).filter(([, v]) => v !== undefined)
      ) as Partial<Settings>;
      settings = { ...fullSettings, ...filtered };
    }

    const themeFromStorage = localStorage.getItem('theme') as Settings['theme'] | null;
    if (themeFromStorage) {
      settings.theme = themeFromStorage;
    }

    this.saveSettings(settings);
    SettingsHolder.setSettings(settings);
    SettingsHolder.onSettingsChange(s => this.saveSettings(s));
  }

  loadActivitiesForDate(date: ISODate): Observable<DayActivitiesResult> {
    return this.http.get<BackendDayActivitiesResponse>(`${this.activitiesApiUrl}/day/${date}`).pipe(
      map(response => ({
        activities: response.activities.map(activity => this.mapBackendActivity(activity)),
        summary: response.summary ?? this.emptySummary,
      })),
      tap(result => this.activitiesCache.set(date, result.activities)),
      catchError(() => of({
        activities: this.activitiesCache.get(date) ?? [],
        summary: this.emptySummary,
      })),
    );
  }

  syncActivitiesForDate(date: ISODate, activities: Activity[]): Observable<DayActivitiesResult> {
    // Keep activities that have meaningful content. For text/comment activities allow missing startTime
    const normalized = activities.filter(activity => this.isNotEmpty(activity) && (activity.type === 'text' || activity.startTime));
    return this.http.put<BackendDayActivitiesResponse>(`${this.activitiesApiUrl}/day/${date}`, {
      activities: normalized,
    }).pipe(
      retry(2),
      map(response => ({
        activities: response.activities.map(activity => this.mapBackendActivity(activity)),
        summary: response.summary ?? this.emptySummary,
      })),
      tap(result => this.activitiesCache.set(date, result.activities)),
      catchError(() => of({
        activities: this.activitiesCache.get(date) ?? [],
        summary: this.emptySummary,
      })),
    );
  }

  /**
   * Send a best-effort keepalive sync for unload/visibilitychange.
   */
  sendKeepaliveSync(date: ISODate, activities: Activity[]) {
    try {
      const normalized = activities.filter(activity => this.isNotEmpty(activity) && (activity.type === 'text' || activity.startTime));
      const payload = JSON.stringify({ activities: normalized });
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`${this.activitiesApiUrl}/day/${date}`, blob as any);
      } else if (typeof fetch !== 'undefined') {
        // fetch keepalive as fallback
        fetch(`${this.activitiesApiUrl}/day/${date}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) {
      // swallow errors - best-effort only
    }
  }

  calculateSummary(activities: Activity[]): Observable<BackendSummaryResponse> {
    return this.http.post<{ summary: BackendSummaryResponse }>(`${this.activitiesApiUrl}/summary`, {
      activities,
    }).pipe(
      map(response => response.summary ?? this.emptySummary),
      catchError(() => of(this.emptySummary)),
    );
  }

  getDescriptionSuggestions(value: string, currentDate: ISODate, activityType: 'activity' | 'text', currentActivityId: string, currentActivities: Activity[], durationThreshold: Settings['durationThreshold'], alwaysShownActivities: Array<{ id?: string; description: string; task: string }>): Observable<string[]> {
    return this.getSuggestions({
      date: currentDate,
      field: 'description',
      value,
      currentActivityId,
      currentActivities,
      activityType,
      durationThreshold,
      alwaysShownActivities,
    });
  }

  getTaskSuggestions(value: string, currentDate: ISODate, currentActivityId: string, currentActivities: Activity[], durationThreshold: Settings['durationThreshold'], alwaysShownActivities: Array<{ id?: string; description: string; task: string }>): Observable<string[]> {
    return this.getSuggestions({
      date: currentDate,
      field: 'task',
      value,
      currentActivityId,
      currentActivities,
      activityType: 'activity',
      durationThreshold,
      alwaysShownActivities,
    });
  }

  getStartSuggestions(currentDate: ISODate, currentActivityId: string, currentActivities: Activity[]): Observable<string[]> {
    return this.getSuggestions({
      date: currentDate,
      field: 'start',
      currentActivityId,
      currentActivities,
    });
  }

  getEndSuggestions(currentDate: ISODate, currentActivityId: string, currentActivities: Activity[]): Observable<string[]> {
    return this.getSuggestions({
      date: currentDate,
      field: 'end',
      currentActivityId,
      currentActivities,
    });
  }

  private isNotEmpty(activity?: Activity) {
    return !!(activity?.startTime || activity?.endTime || activity?.description || activity?.task);
  }

  private getSuggestions(request: SuggestionRequest): Observable<string[]> {
    return this.http.post<{ suggestions: string[] }>(`${this.activitiesApiUrl}/suggestions`, request).pipe(
      map(response => response.suggestions ?? []),
      catchError(() => of([])),
    );
  }

  saveSettings(settings: Settings) {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
  }

  getSettings(): Settings | null {
    const stored = localStorage.getItem(this.settingsKey);
    return stored ? JSON.parse(stored) : null;
  }

  private mapBackendActivity(activity: BackendActivity): Activity {
    const type = activity.category === 'text' ? 'text' : 'activity';
    return {
      id: String(activity.id) as UUID,
      startTime: this.formatTime(activity.start_time),
      endTime: activity.end_time ? this.formatTime(activity.end_time) : '',
      description: activity.description?.trim() || (type === 'text' ? activity.task_name : ''),
      task: type === 'text' ? '' : activity.task_name,
      type,
    };
  }

  private formatTime(value: string): Time {
    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}` as Time;
  }
}
