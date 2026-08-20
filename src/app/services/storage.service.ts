import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, Subscription, tap } from 'rxjs';
import { retry } from 'rxjs/operators';
import { Activity, ISODate, Settings, Time } from '../utils/models';
import { SettingsHolder } from '../utils/settings';
import { UUID } from '../utils/crypto';
import { env } from '../../environments/env';

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

interface BackendSettingsResponse {
  settings: Settings;
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
  private readonly activitiesApiUrl = `${env.apiBaseUrl}/activities`;
  private readonly settingsApiUrl = `${env.apiBaseUrl}/users/me/settings`;
  private readonly activitiesCache = new Map<ISODate, Activity[]>();
  private readonly emptySummary: BackendSummaryResponse = {
    byDescription: [],
    byTask: [],
  };
  private settingsSubscription: Subscription | null = null;
  private settingsInitialized = false;

  initSettings(): Observable<Settings> {
    if (this.settingsInitialized) {
      return of(SettingsHolder.getSettings());
    }

    return this.http.get<BackendSettingsResponse>(this.settingsApiUrl).pipe(
      map(response => this.normalizeSettings(response.settings)),
      catchError(() => of(SettingsHolder.getDefaultSettings())),
      tap(settings => {
        SettingsHolder.setSettings(settings);
        if (!this.settingsSubscription) {
          this.settingsSubscription = SettingsHolder.onSettingsChange(updatedSettings => {
            this.saveSettings(updatedSettings).subscribe();
          });
        }
        this.settingsInitialized = true;
      }),
    );
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

  saveSettings(settings: Settings): Observable<Settings> {
    const normalizedSettings = this.normalizeSettings(settings);
    return this.http.put<BackendSettingsResponse>(this.settingsApiUrl, {
      settings: normalizedSettings,
    }).pipe(
      map(response => this.normalizeSettings(response.settings ?? normalizedSettings)),
      catchError(() => of(normalizedSettings)),
    );
  }

  private normalizeSettings(settings: unknown): Settings {
    const defaults = SettingsHolder.getDefaultSettings();
    if (!settings || typeof settings !== 'object') {
      return defaults;
    }

    const candidate = settings as Partial<Settings> & { jiraSources?: Settings['issueTrackerSources'] };
    const issueTrackerSources = Array.isArray(candidate.issueTrackerSources)
      ? candidate.issueTrackerSources
      : (Array.isArray(candidate.jiraSources) ? candidate.jiraSources : defaults.issueTrackerSources);

    const filtered = Object.fromEntries(
      Object.entries(candidate).filter(([, value]) => value !== undefined),
    ) as Partial<Settings>;

    return {
      ...defaults,
      ...filtered,
      issueTrackerSources,
    };
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
