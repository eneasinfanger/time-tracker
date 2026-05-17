import { Injectable } from '@angular/core';
import { Activity, ActivitySummary, ActivityTotal } from '../utils/models';
import { BackendSummaryResponse } from './storage.service';

@Injectable({ providedIn: 'root' })
export class TimeCalculatorService {
  fromBackendSummary(summary: BackendSummaryResponse, activities: Activity[]): ActivitySummary {
    const getTotalMapByKey = this.getTotalMapByKey.bind(this, summary, activities);
    const hasActivities = activities.length > 0;
    const cache: Partial<{
      totalByDescription: ActivityTotal,
      totalByTask: ActivityTotal,
    }> = {};

    return {
      getTotalByDescription(): ActivityTotal {
        return cache.totalByDescription ?? (cache.totalByDescription = getTotalMapByKey('description'));
      },
      getTotalByTask(): ActivityTotal {
        return cache.totalByTask ?? (cache.totalByTask = getTotalMapByKey('task'));
      },
      hasActivities(): boolean {
        return hasActivities;
      },
    };
  }

  private getTotalMapByKey(summary: BackendSummaryResponse, activities: Activity[], key: 'description' | 'task'): ActivityTotal {
    const entries = key === 'description' ? summary.byDescription : summary.byTask;
    const activityById = new Map<string, Activity>(activities.map(activity => [activity.id, activity]));
    const activityTimes: ActivityTotal = new Map();

    entries.forEach(entry => {
      activityTimes.set(entry.key, {
        activities: entry.activityIds
          .map(activityId => activityById.get(String(activityId)))
          .filter((activity): activity is Activity => !!activity),
        totalMinutes: entry.totalMinutes,
      });
    });

    return activityTimes;
  }
}
