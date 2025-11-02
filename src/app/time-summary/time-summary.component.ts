import { ChangeDetectionStrategy, Component, computed, input, signal, Signal } from '@angular/core';
import { Activity, ActivitySummary, ActivitySummaryEntry } from '../utils/models';

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

  readonly sortMode = signal<'start' | 'alpha'>('start');
  readonly sortReverse = signal(false);
  readonly viewMode = signal<'description' | 'task'>('description');

  readonly sorted: Signal<[string, ActivitySummaryEntry][]> = computed(() => {
    const entries = Array.from(this.viewMode() == 'description'
      ? this.summary().getTotalByDescription()
      : this.summary().getTotalByTask());

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

    return entries;
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

  onSettingsChange(_settings: unknown) {
    // UI-only integration point for settings (no logic applied yet)
  }

  hasSummary() {
    return this.viewMode() === 'description'
      ? this.summary().hasActivitiesWithDescription()
      : this.summary().hasActivitiesWithTask();
  }

  listTasks(activities: Activity[]) {
    return [...new Set(activities.map(a => a.task))].join('; ');
  }

  listDescriptions(activities: Activity[]) {
    return [...new Set(activities.map(a => a.description))].join('; ');
  }

  formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${ hours }h ${ mins }m` : `${ mins }m`;
  }
}

