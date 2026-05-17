import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { Activity, ISODate, Settings, Time } from '../utils/models';
import { formatDateISO, parseISODate, subtractDuration } from '../utils/dates';
import { SettingsHolder } from '../utils/settings';
import { settingsMigrations } from './storage.migrations';
import { UUID } from '../utils/crypto';

interface BackendDayActivitiesResponse {
  date: string;
  activities: BackendActivity[];
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
  private readonly activitiesApiUrl = 'http://localhost:5000/api/activities';
  private readonly activitiesCache = new Map<ISODate, Activity[]>();

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
    for (const migration of settingsMigrations) {
      migration.run(settings);
    }

    const themeFromStorage = localStorage.getItem('theme') as Settings['theme'] | null;
    if (themeFromStorage) {
      settings.theme = themeFromStorage;
    }

    this.saveSettings(settings);
    SettingsHolder.setSettings(settings);
    SettingsHolder.onSettingsChange(s => this.saveSettings(s));
  }

  loadActivitiesForDate(date: ISODate): Observable<Activity[]> {
    return this.http.get<BackendDayActivitiesResponse>(`${this.activitiesApiUrl}/day/${date}`).pipe(
      map(response => response.activities.map(activity => this.mapBackendActivity(activity))),
      tap(activities => this.activitiesCache.set(date, activities)),
      catchError(() => of(this.activitiesCache.get(date) ?? [])),
    );
  }

  syncActivitiesForDate(date: ISODate, activities: Activity[]): Observable<void> {
    const normalized = activities.filter(activity => this.isNotEmpty(activity) && activity.startTime);
    return this.http.put<BackendDayActivitiesResponse>(`${this.activitiesApiUrl}/day/${date}`, {
      activities: normalized,
    }).pipe(
      tap(response => this.activitiesCache.set(
        date,
        response.activities.map(activity => this.mapBackendActivity(activity)),
      )),
      map(() => void 0),
      catchError(() => of(void 0)),
    );
  }

  private isNotEmpty(activity?: Activity) {
    return !!(activity?.startTime || activity?.endTime || activity?.description || activity?.task);
  }

  getActivitiesForDate(date: ISODate): Activity[] | null {
    return this.activitiesCache.get(date) ?? null;
  }

  getSortedActivitiesForDate(date: ISODate): Activity[] | null {
    return [...(this.getActivitiesForDate(date) ?? [])].sort((a, b) => {
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      } else if (a.endTime && b.endTime) {
        return a.endTime.localeCompare(b.endTime);
      }
      return 0;
    });
  }

  getPastActivities(currentDate: ISODate): Activity[] {
    const parsed = parseISODate(currentDate);
    const from = formatDateISO(subtractDuration(parsed, SettingsHolder.getSettings().durationThreshold));
    return [...this.activitiesCache.entries()]
      .filter(([date]) => date >= from && date <= currentDate)
      .flatMap(([, activities]) => activities);
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
