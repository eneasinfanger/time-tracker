import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Activity, ActivitySummary } from '../utils/models';

@Component({
  selector: 'time-summary',
  imports: [],
  templateUrl: './time-summary.component.html',
  styleUrls: ['./time-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSummaryComponent {
  readonly summary = input.required<ActivitySummary>();
  readonly dateDisplay = input.required();

  hasSummary() {
    return this.summary().size > 0;
  }

  listTasks(activities: Activity[]) {
    return [...new Set(activities.map(a => a.task))].join('; ');
  }

  formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${ hours }h ${ mins }m` : `${ mins }m`;
  }
}

