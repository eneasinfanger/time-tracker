import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StorageService, BackendSummaryResponse } from '../services/storage.service';
import { TimeCalculatorService } from '../services/time-calculator.service';
import { TimeSummaryComponent } from '../time-summary/time-summary.component';
import { ActivityRowComponent } from '../activity-row/activity-row.component';
import { Activity, ActivitySummary, Theme } from '../utils/models';
import { unwrapSignal, wrapInSignal } from '../utils/signals';
import { formatDateISO, formatDateToDisplay, parseISODate } from '../utils/dates';
import { generateUUID, UUID } from '../utils/crypto';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';
import { SettingsHolder } from '../utils/settings';
import { SettingsButtonComponent } from "../settings-button/settings-button.component";

@Component({
  selector: 'app-site',
  imports: [FormsModule, ReactiveFormsModule, TimeSummaryComponent, ActivityRowComponent, SettingsMenuComponent, SettingsButtonComponent],
  templateUrl: './site.component.html',
  styleUrls: ['./site.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteComponent {
  readonly currentDate = signal(new Date());
  readonly currentDateISO = computed(() => formatDateISO(this.currentDate()));
  readonly activities = signal<WritableSignal<Activity>[]>([]);
  readonly summary = signal<ActivitySummary>({
    getTotalByDescription: () => new Map(),
    getTotalByTask: () => new Map(),
    hasActivities: () => false,
  });
  readonly settingsOpen = signal(false);
  readonly activitiesLoading = signal(false);

  private saveTimer: number | null = null;
  private summaryTimer: number | null = null;
  private summaryRequestId = 0;
  private autoSyncEnabled = false;

  protected readonly formatDateToDisplay = formatDateToDisplay;

  private storage = inject(StorageService);
  private calculator = inject(TimeCalculatorService);

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.storage.initSettings();
    this.applyTheme(SettingsHolder.getSettings().theme);
    SettingsHolder.onSettingsChange(s => this.applyTheme(s.theme));

    this.loadActivitiesForCurrentDay();

    effect(() => {
      this.activities();

      if (!this.autoSyncEnabled) {
        return;
      }

      this.scheduleSummaryRefresh();
      this.scheduleSaveCurrentActivities();
    });

    // Ensure activities are flushed when the page is hidden or unloaded
    window.addEventListener('beforeunload', () => {
      try {
        this.storage.sendKeepaliveSync(this.currentDateISO(), this.activities().map(unwrapSignal));
      } catch (e) {}
    });
    window.addEventListener('pagehide', () => {
      try {
        this.storage.sendKeepaliveSync(this.currentDateISO(), this.activities().map(unwrapSignal));
      } catch (e) {}
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        try {
          this.storage.sendKeepaliveSync(this.currentDateISO(), this.activities().map(unwrapSignal));
        } catch (e) {}
      }
    });
  }

  private applyTheme(theme: Theme) {
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  navigateDay(direction: number) {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() + direction);
    this.currentDate.set(d);
    this.loadActivitiesForCurrentDay();
  }

  navigateToInput(value: `${ number }-${ number }-${ number }` | '') {
    if (!value) {
      return;
    }
    this.currentDate.set(parseISODate(value));
    this.loadActivitiesForCurrentDay();
  }

  loadActivitiesForCurrentDay() {
    const date = this.currentDateISO();
    this.activitiesLoading.set(true);
    this.autoSyncEnabled = false;
    this.storage.loadActivitiesForDate(date).subscribe({
      next: result => {
        this.activities.set(result.activities.map(wrapInSignal));
        this.applyBackendSummary(result.summary, result.activities);
        window.setTimeout(() => {
          this.activitiesLoading.set(false);
          this.autoSyncEnabled = true;
        }, 0);
      },
      error: () => {
        this.activities.set([]);
        this.applyBackendSummary(this.emptySummary(), []);
        window.setTimeout(() => {
          this.activitiesLoading.set(false);
          this.autoSyncEnabled = true;
        }, 0);
      },
    });
  }

  private scheduleSaveCurrentActivities() {
    const date = this.currentDateISO();
    const activities = this.activities().map(unwrapSignal);

    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
    }

    // Short debounce for fast saves; still batch rapid changes
    this.saveTimer = window.setTimeout(() => {
      this.storage.syncActivitiesForDate(date, activities).subscribe();
    }, 120);
  }

  saveNow() {
    const date = this.currentDateISO();
    const activities = this.activities().map(unwrapSignal);
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.storage.syncActivitiesForDate(date, activities).subscribe();
  }

  private scheduleSummaryRefresh() {
    const activities = this.activities().map(unwrapSignal);

    if (this.summaryTimer !== null) {
      window.clearTimeout(this.summaryTimer);
    }

    const requestId = ++this.summaryRequestId;
    this.summaryTimer = window.setTimeout(() => {
      this.storage.calculateSummary(activities).subscribe({
        next: summary => {
          if (requestId !== this.summaryRequestId) {
            return;
          }
          this.applyBackendSummary(summary, activities);
        },
      });
    }, 150);
  }

  addNewActivity(afterId: UUID | null = null, typeParam: Activity['type'] = 'activity') {
    const newActivity: WritableSignal<Activity> = signal({
      id: generateUUID(),
      startTime: '',
      endTime: '',
      task: '',
      description: '',
      type: typeParam,
    });

    const copy = [...this.activities()];
    const insertAfterIndex = afterId ? copy.findIndex(ac => ac().id === afterId) : null;
    if (insertAfterIndex !== null) {
      copy.splice(insertAfterIndex + 1, 0, newActivity);
    } else {
      copy.push(newActivity);
    }
    this.activities.set(copy);
    // Persist immediately for reliability
    this.saveNow();
  }

  removeActivity(id: UUID) {
    if (this.activities().length == 1) {
      this.activities.set([]);
    } else if (this.activities().length) {
      const copy = [...this.activities()];
      copy.splice(copy.findIndex(a => a().id == id), 1);
      this.activities.set(copy);
      // Persist immediately for reliability
      this.saveNow();
    }
  }

  /**
   * Export current date activities to CSV and download.
   */
  exportCsv() {
    const date = this.currentDateISO();
    const activities = this.activities().map(unwrapSignal);

    const headers = ['date', 'start', 'end', 'description', 'task', 'type'];
    const escape = (v: any) => {
      if (v == null) return '';
      const s = String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    };

    const rows = activities.map(a => [date, a.startTime || '', a.endTime || '', a.description || '', a.task || '', a.type || 'activity']);

    const csv = [headers.map(escape).join(',')].concat(rows.map(r => r.map(escape).join(','))).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `time-tracker-${date}.csv`;
    if (navigator && 'msSaveBlob' in navigator) {
      // IE10+
      (navigator as any).msSaveBlob(blob, filename);
    } else {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  private applyBackendSummary(summary: BackendSummaryResponse, activities: Activity[]) {
    this.summary.set(this.calculator.fromBackendSummary(summary, activities));
  }

  private emptySummary(): BackendSummaryResponse {
    return { byDescription: [], byTask: [] };
  }
}
