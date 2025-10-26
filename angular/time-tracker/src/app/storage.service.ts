import { Injectable } from '@angular/core';
import { Activity, FormattedDate, Time } from './models';

const storagePrefix = 'timetracker_';

@Injectable({ providedIn: 'root' })
export class StorageService {
  saveActivitiesForDate(date: FormattedDate, activities: Activity[]) {
    const key = this.getStorageKey(date);
    const filtered = activities.filter(ac => ac.startTime || ac.endTime || ac.description);

    if (filtered.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(key);
    }
  }

  getActivitiesForDate(date: FormattedDate): Activity[] | null {
    const key = this.getStorageKey(date);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  private getStorageKey(date: FormattedDate) {
    return `${storagePrefix}${date}`;
  }

  getPastActivities(fromDate: FormattedDate, toDate: FormattedDate) {
    const allActivities: Activity[] = [];
    const dates = this.getAllStoredDates(fromDate, toDate);

    dates.forEach(date => {
      const activities = this.getActivitiesForDate(date);
      if (activities) {
        allActivities.push(...activities);
      }
    });

    return allActivities;
  }

  private getAllStoredDates(fromDate: FormattedDate, toDate: FormattedDate): FormattedDate[] {
    const fromDateKey = this.getStorageKey(fromDate);
    const toDateKey = this.getStorageKey(toDate);
    const dates: FormattedDate[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(storagePrefix) && key >= fromDateKey && key <= toDateKey) {
        dates.push(key.replace(storagePrefix, '') as FormattedDate);
      }
    }
    return dates;
  }

  getLastEndTime(date: FormattedDate): Time | undefined {
    const activities = this.getActivitiesForDate(date) || [];
    const timedActivities = activities.filter(activity =>
      activity.type === 'activity' && activity.endTime
    );

    if (timedActivities.length === 0) return;

    return timedActivities
      .sort((a, b) => a.endTime.localeCompare(b.endTime))
      .pop()?.endTime;
  }
}
