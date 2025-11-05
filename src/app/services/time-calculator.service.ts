import { Injectable } from '@angular/core';
import {Activity, ActivitySummary, ActivitySummaryEntry, ActivityTotal, Time} from '../utils/models';

@Injectable({ providedIn: 'root' })
export class TimeCalculatorService {
  calculateTimePerActivity(activities: Activity[]): ActivitySummary {
    const getTotalMapByKey = this.getTotalMapByKey.bind(this, activities);
    const hasActivitiesWithKey = this.hasActivitiesWithKey.bind(this, activities);
    const cache: Partial<{
      totalByDescription: ActivityTotal,
      totalByTask: ActivityTotal,
      hasActivitiesWithDescription: boolean,
      hasActivitiesWithTask: boolean,
    }> = {};
    return {
      getTotalByDescription(): ActivityTotal {
        return cache.totalByDescription ?? (cache.totalByDescription = getTotalMapByKey('description'));
      },
      getTotalByTask(): ActivityTotal {
        return cache.totalByTask ?? (cache.totalByTask = getTotalMapByKey('task'));
      },
      hasActivitiesWithDescription(): boolean {
        return cache.hasActivitiesWithDescription ?? (cache.hasActivitiesWithDescription = hasActivitiesWithKey('description'));
      },
      hasActivitiesWithTask(): boolean {
        return cache.hasActivitiesWithTask ?? (cache.hasActivitiesWithTask = hasActivitiesWithKey('task'));
      },
    };
  }

  private hasActivitiesWithKey(activities: Activity[], key: 'description' | 'task'): boolean {
    return activities.filter(ac => ac.type == 'activity' && ac.startTime && ac.endTime && ac[key]).length > 0;
  }

  private getTotalMapByKey(activities: Activity[], key: 'description' | 'task'): ActivityTotal {
    const activityTimes: ActivityTotal = new Map();

    activities.forEach(activity => {
      if (activity.type === 'activity' && activity.startTime && activity.endTime) {
        const duration = this.calculateDuration(activity.startTime, activity.endTime);

        if (duration > 0) {
          const entry = activityTimes.get(activity[key]) ?? { activities: [], totalMinutes: 0 };
          entry.activities.push(activity);
          entry.totalMinutes += duration;
          activityTimes.set(activity[key], entry);
        }
      }
    });

    return activityTimes;
  }

  private calculateDuration(startTime: Time, endTime: Time) {
    if (!startTime || !endTime) return 0;

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    if (endMinutes < startMinutes) {
      return (24 * 60 - startMinutes) + endMinutes;
    }

    return endMinutes - startMinutes;
  }

  private timeToMinutes(timeString: Time) {
    if (!timeString) return 0;

    const [hours, minutes] = (timeString as string).split(':').map(Number);
    return hours * 60 + minutes;
  }
}
