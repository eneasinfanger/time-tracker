import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ActivitySummary } from '../models';

@Component({
  selector: 'time-summary',
  imports: [],
  templateUrl: './time-summary.component.html',
  styleUrls: ['./time-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeSummaryComponent {
  readonly visible = input(false);
  readonly summary = input<ActivitySummary>({});
  readonly dateDisplay = input('');

  entries() {
    return Object.entries(this.summary()).sort((a, b) => a[0] > b[0] ? 1 : -1);
  }

  hasSummary() {
    return Object.keys(this.summary()).length > 0;
  }

  formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${ hours }h ${ mins }m` : `${ mins }m`;
  }
}

