import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BackendSummaryResponse, StorageService } from '../services/storage.service';
import { TimeCalculatorService } from '../services/time-calculator.service';
import { TimeSummaryComponent } from '../time-summary/time-summary.component';
import { ActivityRowComponent } from '../activity-row/activity-row.component';
import { Activity, ActivitySummary, Theme } from '../utils/models';
import { formatDateISO, formatDateToDisplay, parseISODate } from '../utils/dates';
import { generateUUID, UUID } from '../utils/crypto';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';
import { SettingsHolder } from '../utils/settings';
import { SettingsButtonComponent } from '../settings-button/settings-button.component';
import { GridNavContainerDirective } from '../grid-nav-container/grid-nav-container.directive';
import { downloadFile } from '../utils/download';

@Component({
  selector: 'app-site',
  imports: [FormsModule, ReactiveFormsModule, TimeSummaryComponent, ActivityRowComponent, SettingsMenuComponent, SettingsButtonComponent, GridNavContainerDirective],
  templateUrl: './site.component.html',
  styleUrls: ['./site.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteComponent {
  readonly currentDate = signal(new Date());
  readonly currentDateISO = computed(() => formatDateISO(this.currentDate()));
  readonly activities = signal<Activity[]>([]);
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
  private readonly destroyRef = inject(DestroyRef);

  readonly enableTasks = signal(true);

  constructor() {
    this.initialize();
  }

  private initialize() {
    effect(() => {
      this.activities();

      if (!this.autoSyncEnabled) {
        return;
      }

      this.scheduleSummaryRefresh();
      this.scheduleSave();
    });
    this.storage.initSettings().subscribe({
      next: settings => {
        this.applyTheme(settings.theme);
        this.enableTasks.set(settings.enableTasks);

        const sub = SettingsHolder.onSettingsChange(s => {
          this.applyTheme(s.theme);
          this.enableTasks.set(s.enableTasks);
        });
        this.destroyRef.onDestroy(() => sub.unsubscribe());

        this.loadActivitiesForCurrentDay();

        // Ensure activities are flushed when the page is hidden or unloaded
        window.addEventListener('beforeunload', () => {
          try {
            this.storage.sendKeepaliveSync(this.currentDateISO(), this.activities());
          } catch (e) {
          }
        });
        window.addEventListener('pagehide', () => {
          try {
            this.storage.sendKeepaliveSync(this.currentDateISO(), this.activities());
          } catch (e) {
          }
        });
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            try {
              this.storage.sendKeepaliveSync(this.currentDateISO(), this.activities());
            } catch (e) {
            }
          }
        });
      },
      error: () => {
        try {
          const fallback = SettingsHolder.getDefaultSettings();
          SettingsHolder.setSettings(fallback);
          this.applyTheme(fallback.theme);
          this.enableTasks.set(fallback.enableTasks);
        } catch (e) {
        }
        this.loadActivitiesForCurrentDay();
      },
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
        this.activities.set(result.activities);
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

  private scheduleSave() {
    const date = this.currentDateISO();
    const activities = this.activities();

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
    const activities = this.activities();
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.storage.syncActivitiesForDate(date, activities).subscribe();
  }

  private scheduleSummaryRefresh() {
    const activities = this.activities();

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
    const newActivity: Activity = {
      id: generateUUID(),
      startTime: '',
      endTime: '',
      task: '',
      description: '',
      type: typeParam,
    };

    const copy = [...this.activities()];
    const insertAfterIndex = afterId ? copy.findIndex(ac => ac.id === afterId) : null;
    if (insertAfterIndex !== null) {
      copy.splice(insertAfterIndex + 1, 0, newActivity);
    } else {
      copy.push(newActivity);
    }
    this.activities.set(copy);
    this.scheduleSave();
  }

  removeActivity(id: UUID) {
    if (this.activities().length == 1) {
      this.activities.set([]);
    } else if (this.activities().length) {
      const copy = [...this.activities()];
      copy.splice(copy.findIndex(a => a.id == id), 1);
      this.activities.set(copy);
      this.scheduleSave();
    }
  }

  updateActivity(changed: Activity): void {
    const activities = this.activities();
    const idx = activities.findIndex(a => a.id == changed.id);
    if (idx < 0) {
      return;
    }
    const copy = [...activities];
    copy[idx] = changed;
    this.activities.set(copy);
    this.scheduleSave();
  }

  private applyBackendSummary(summary: BackendSummaryResponse, activities: Activity[]) {
    this.summary.set(this.calculator.fromBackendSummary(summary, activities));
  }

  private emptySummary(): BackendSummaryResponse {
    return { byDescription: [], byTask: [] };
  }
}
