import { Injectable } from '@angular/core';
import { Activity, ActivitySummary, Time } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class TimeCalculatorService {
  calculateTimePerActivity(activities: Activity[]): ActivitySummary {
    const activityTimes: ActivitySummary = {};

    activities.forEach(activity => {
      if (activity.type === 'activity' && activity.startTime && activity.endTime && activity.description) {
        const duration = this.calculateDuration(activity.startTime, activity.endTime);

        if (duration > 0) {
          if (!activityTimes[activity.description]) {
            activityTimes[activity.description] = 0;
          }
          activityTimes[activity.description] += duration;
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
