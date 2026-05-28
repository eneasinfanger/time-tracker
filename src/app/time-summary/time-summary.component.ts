import { ChangeDetectionStrategy, Component, computed, input, signal, Signal } from '@angular/core';
import { Activity, ActivitySummary, ActivitySummaryEntry, ActivityTotal } from '../utils/models';
import { TaskLinkComponent } from '../task-link/task-link.component';
import { TASK_REGEX } from "../utils/task-parser";
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'time-summary',
  imports: [
    TaskLinkComponent,
    IconComponent,
  ],
  templateUrl: './time-summary.component.html',
  styleUrls: ['./time-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSummaryComponent {
  readonly summary = input.required<ActivitySummary>();
  readonly dateDisplay = input.required();

  readonly sortMode = signal<SortMode>(SortMode.START_TIME);
  readonly sortReverse = signal(false);
  readonly viewMode = signal<'description' | 'task'>('description');

  readonly totalByViewMode: Signal<ActivityTotal> = computed(() => {
    return this.viewMode() == 'description'
      ? this.summary().getTotalByDescription()
      : this.summary().getTotalByTask();
  });

  readonly sortedEntries: Signal<[string, ActivitySummaryEntry][]> = computed(() => {
    const entries = Array.from(this.totalByViewMode());
    this.sortMode().sort(entries);
    if (this.sortReverse()) {
      entries.reverse();
    }
    if (this.viewMode() === 'task') {
      this.groupSameTasks(entries);
    }
    // move entries without task/description to end
    const nonEmptyEntries = entries.filter(entry => Boolean(entry[0]));
    const emptyEntries = entries.filter(entry => !entry[0]);
    return [...nonEmptyEntries, ...emptyEntries];
  });

  private groupSameTasks(entries: [string, ActivitySummaryEntry][]) {
    const groupedByTaskSet = new Map<string, [string, ActivitySummaryEntry][]>();
    const groupOrder: string[] = [];
    for (const entry of entries) {
      const key = this.genKey(entry[0]);
      if (!groupedByTaskSet.has(key)) {
        groupedByTaskSet.set(key, []);
        groupOrder.push(key);
      }
      groupedByTaskSet.get(key)!.push(entry);
    }
    entries.length = 0;
    for (const key of groupOrder) {
      entries.push(...groupedByTaskSet.get(key)!);
    }
  }

  private genKey(taskText: string): string {
    const tasks = Array.from(taskText.matchAll(TASK_REGEX), match => match[0]);
    if (tasks.length === 0) {
      return `__no_tasks__:${ taskText }`;
    }
    return [...new Set(tasks)].sort().join('|');
  }

  readonly totalMinutes: Signal<number> = computed(() => {
    return [...this.totalByViewMode().values()]
      .map(entry => entry.totalMinutes)
      .reduce((a, b) => a + b, 0);
  });

  getSortModes(): SortMode[] {
    return [SortMode.START_TIME, SortMode.ALPHABETICAL];
  }

  setSortMode(mode: SortMode) {
    this.sortMode.set(mode);
  }

  toggleReverse() {
    this.sortReverse.update(v => !v);
  }

  setViewMode(mode: 'description' | 'task') {
    this.viewMode.set(mode);
  }

  hasSummary() {
    return this.summary().hasActivities();
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
    if (hours > 0 && mins > 0) {
      return `${ hours }h ${ mins }m`;
    }
    return hours > 0 ? `${ hours }h` : `${ mins }m`;
  }
}

class SortMode {
  static readonly START_TIME = new SortMode('Start Time', 'Sort by start time', items => {
    const getEarliest = (activities: Activity[]) => activities.map(a => a.startTime).sort()[0];
    items.sort((a, b) => {
      const ta = getEarliest(a[1].activities);
      const tb = getEarliest(b[1].activities);
      return ta.localeCompare(tb);
    });
  });

  static readonly ALPHABETICAL = new SortMode('Alphabetical', 'Sort by name', items => {
    items.sort((a, b) => a[0].localeCompare(b[0]));
  });

  constructor(
    public readonly label: string,
    public readonly meta: string,
    public readonly sort: (items: [string, ActivitySummaryEntry][]) => void
  ) {
  }
}

