import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, WritableSignal, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TimeCalculatorService } from '../services/time-calculator.service';
import { TimeSummaryComponent } from '../time-summary/time-summary.component';
import { ActivityRowComponent } from '../activity-row/activity-row.component';
import { Activity, ActivitySummary, Theme } from '../utils/models';
import { unwrapSignal, wrapInSignal } from '../utils/signals';
import { formatDateISO, formatDateToDisplay, parseISODate } from '../utils/dates';
import { generateUUID, UUID } from '../utils/crypto';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';
import { SettingsButtonComponent } from "../settings-button/settings-button.component";
import { SettingsService } from "../services/settings.service";
import { SyncService } from "../services/sync.service";
import { AuthService } from "../services/auth.service";
import { Debouncer, SharedDebouncer } from "../utils/events";

@Component({
  selector: 'app-site',
  imports: [FormsModule, ReactiveFormsModule, TimeSummaryComponent, ActivityRowComponent, SettingsMenuComponent, SettingsButtonComponent],
  templateUrl: './site.component.html',
  styleUrls: ['./site.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteComponent implements OnDestroy {
  private readonly SAVE_DEBOUNCE_MS = 5000;

  readonly currentDate = signal(new Date());
  readonly currentDateISO = computed(() => formatDateISO(this.currentDate()));
  readonly activities = signal<WritableSignal<Activity>[]>([]);
  readonly summary = signal<ActivitySummary>({} as ActivitySummary);
  readonly settingsOpen = signal(false);

  protected readonly formatDateToDisplay = formatDateToDisplay;

  private sync = inject(SyncService);
  private calculator = inject(TimeCalculatorService);
  private settings = inject(SettingsService);
  private beforeUnloadHandler: (() => void) | null = null;
  private saveDebouncer: Debouncer = new SharedDebouncer(this.SAVE_DEBOUNCE_MS);
  private auth = inject(AuthService);

  constructor() {
    this.initialize();
    this.beforeUnloadHandler = () => {
      if (document.visibilityState === "hidden") {
        void this.flushSave();
      }
    };
    document.addEventListener("visibilitychange", this.beforeUnloadHandler);
  }

  logout() {
    void this.auth.logout();
  }

  private initialize() {
    this.applyTheme(this.settings.getSettings().theme);
    this.settings.onSettingsChange(s => this.applyTheme(s.theme));

    this.loadActivitiesForCurrentDay();

    effect(() => {
      this.activities();
      this.scheduleSave();
      this.calculateAndShowSummary();
    });
  }

  ngOnDestroy(): void {
    if (this.beforeUnloadHandler) {
      document.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    void this.flushSave();
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
    this.sync.getActivitiesForDay(this.currentDateISO())
      .then(activities => this.activities.set(activities.map(wrapInSignal)));
  }

  async saveCurrentActivities(): Promise<void> {
    try {
      await this.sync.saveActivities(this.activities().map(unwrapSignal));
    } catch (err) {
      console.error('Failed to save activities:', err);
    }
  }

  private scheduleSave() {
    this.saveDebouncer.run(() => {
      void this.saveCurrentActivities();
      alert("saving")
    });
  }

  private async flushSave(): Promise<void> {
    this.saveDebouncer.cancel();
    await this.saveCurrentActivities();
  }

  addNewActivity(afterId: UUID | null = null) {
    const newActivity: WritableSignal<Activity> = signal({
      id: generateUUID(),
      startTime: '',
      endTime: '',
      date: this.currentDateISO(),
      task: '',
      description: '',
      type: 'activity',
    });

    const copy = [...this.activities()];
    const insertAfterIndex = afterId ? copy.findIndex(ac => ac().id === afterId) : null;
    if (insertAfterIndex !== null) {
      copy.splice(insertAfterIndex + 1, 0, newActivity);
    } else {
      copy.push(newActivity);
    }
    this.activities.set(copy);
  }

  removeActivity(id: UUID) {
    const copy = [...this.activities()];
    const idx = copy.findIndex(a => a().id == id);
    const activity = copy[idx];
    copy.splice(idx, 1);
    this.activities.set(copy);
    this.sync.deleteActivity(id)
      .catch(err => {
        console.error("Failed to delete activity:", err);
        copy.splice(idx, 0, activity);
        this.activities.set([...copy]);
      });
  }

  calculateAndShowSummary() {
    this.summary.set(this.calculator.calculateTimePerActivity(this.activities().map(unwrapSignal)));
  }
}
