import { ChangeDetectionStrategy, Component, computed, input, signal, Signal } from '@angular/core';
import {Activity, ActivitySummary, ActivitySummaryEntry, ActivityTotal} from '../utils/models';
import {TaskLinkComponent} from "../task-link/task-link.component";

@Component({
  selector: 'time-summary',
  imports: [
    TaskLinkComponent
  ],
  templateUrl: './time-summary.component.html',
  styleUrls: ['./time-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSummaryComponent {
  readonly summary = input.required<ActivitySummary>();
  readonly dateDisplay = input.required();

  readonly sortMode = signal<'start' | 'alpha'>('start');
  readonly sortReverse = signal(false);
  readonly viewMode = signal<'description' | 'task'>('description');

  readonly totalByViewMode: Signal<ActivityTotal> = computed(()=>{
    return this.viewMode() == 'description'
      ? this.summary().getTotalByDescription()
      : this.summary().getTotalByTask();
  });

  readonly sortedEntries: Signal<[string, ActivitySummaryEntry][]> = computed(() => {
    const entries = Array.from(this.totalByViewMode());

    if (this.sortMode() === 'alpha') {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (this.sortMode() === 'start') {
      const getEarliest = (activities: Activity[]) => activities.map(a => a.startTime).sort()[0];

      entries.sort((a, b) => {
        const ta = getEarliest(a[1].activities);
        const tb = getEarliest(b[1].activities);
        return ta.localeCompare(tb);
      });
    }

    if (this.sortReverse()) { entries.reverse(); }

    // move entries without task/description to end
    entries.sort((a, b) => Number(!a[0]) - Number(!b[0]));

    return entries;
  });

  readonly totalMinutes: Signal<number> = computed(() => {
    return [...this.totalByViewMode().values()]
      .map(entry => entry.totalMinutes)
      .reduce((a, b) => a + b, 0);
  });

  setSortMode(mode: 'start' | 'alpha') {
    this.sortMode.set(mode);
  }

  toggleReverse() {
    this.sortReverse.update(v => !v);
  }

  setViewMode(mode: 'description' | 'task') {
    this.viewMode.set(mode);
  }

  hasSummary() {
    return this.viewMode() === 'description'
      ? this.summary().hasActivitiesWithDescription()
      : this.summary().hasActivitiesWithTask();
  }

  listUnique(activities: Activity[], key: 'description' | 'task'): string[] {
    return [...new Set(activities.map(a => a[key]).filter(s => s))];
  }

  joinUnique(activities: Activity[], key: 'description' | 'task'): string {
    return this.listUnique(activities, key).join('; ');
  }

  formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${ hours }h ${ mins }m` : `${ mins }m`;
  }
}
