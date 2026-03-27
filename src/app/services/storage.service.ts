import { Injectable } from '@angular/core';
import { Activity, ISODate, Settings } from '../utils/models';
import { formatDateISO, parseISODate, subtractDuration } from '../utils/dates';
import { SettingsHolder } from '../utils/settings';
import { settingsMigrations } from './storage.migrations';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storagePrefix = 'timetracker_';
  private readonly settingsKey = 'timetracker_settings';

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
    this.saveSettings(settings);
    SettingsHolder.setSettings(settings);
    SettingsHolder.onSettingsChange(s => this.saveSettings(s));
  }

  saveActivitiesForDate(date: ISODate, activities: Activity[]) {
    const key = this.getStorageKey(date);

    if (activities.length > 1 || this.isNotEmpty(activities[0])) {
      localStorage.setItem(key, JSON.stringify(activities));
    } else {
      localStorage.removeItem(key);
    }
  }

  private isNotEmpty(activity?: Activity) {
    return activity?.startTime || activity?.endTime || activity?.description || activity?.task;
  }

  getActivitiesForDate(date: ISODate): Activity[] | null {
    const key = this.getStorageKey(date);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  getSortedActivitiesForDate(date: ISODate): Activity[] | null {
    return this.getActivitiesForDate(date)
      ?.sort((a, b) => {
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        } else if (a.endTime && b.endTime) {
          return a.endTime.localeCompare(b.endTime);
        }
        return 0;
      }) ?? null;
  }

  private getStorageKey(date: ISODate) {
    return `${ this.storagePrefix }${ date }`;
  }

  getPastActivities(currentDate: ISODate): Activity[] {
    const parsed = parseISODate(currentDate);
    const from = formatDateISO(subtractDuration(parsed, SettingsHolder.getSettings().durationThreshold));
    const allActivities: Activity[] = [];
    const dates = this.getAllStoredDates(from, currentDate);

    dates.forEach(date => {
      const activities = this.getActivitiesForDate(date);
      if (activities) {
        allActivities.push(...activities);
      }
    });

    return allActivities;
  }

  private getAllStoredDates(fromDate: ISODate, toDate: ISODate): ISODate[] {
    const fromDateKey = this.getStorageKey(fromDate);
    const toDateKey = this.getStorageKey(toDate);
    const dates: ISODate[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix) && key >= fromDateKey && key <= toDateKey) {
        dates.push(key.replace(this.storagePrefix, '') as ISODate);
      }
    }
    return dates;
  }

  saveSettings(settings: Settings) {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings));
  }

  getSettings(): Settings | null {
    const stored = localStorage.getItem(this.settingsKey);
    return stored ? JSON.parse(stored) : null;
  }
}
