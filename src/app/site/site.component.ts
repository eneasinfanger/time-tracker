import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StorageService } from '../services/storage.service';
import { TimeCalculatorService } from '../services/time-calculator.service';
import { TimeSummaryComponent } from '../time-summary/time-summary.component';
import { ActivityRowComponent } from '../activity-row/activity-row.component';
import { Activity, ActivitySummary, Settings } from '../utils/models';
import { unwrapSignal, wrapInSignal } from '../utils/signals';
import { formatDate, formatDateToDisplay, parseISODate } from '../utils/dates';
import { generateUUID, UUID } from '../utils/crypto';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';
import { SettingsHolder } from '../utils/settings';

@Component({
  selector: 'app-site',
  imports: [FormsModule, ReactiveFormsModule, TimeSummaryComponent, ActivityRowComponent, SettingsMenuComponent],
  templateUrl: './site.component.html',
  styleUrls: ['./site.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteComponent {
  readonly currentDate = signal(new Date());
  readonly currentDateFormatted = computed(() => formatDate(this.currentDate()));
  readonly activities = signal<WritableSignal<Activity>[]>([]);
  readonly summary = signal<ActivitySummary>({} as ActivitySummary);
  readonly settings = signal<Settings>({} as Settings);

  protected readonly formatDateToDisplay = formatDateToDisplay;

  private storage = inject(StorageService);
  private calculator = inject(TimeCalculatorService);

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.loadSettings();
    this.loadActivitiesForCurrentDay();

    effect(() => {
      this.storage.saveSettings(this.settings());
      SettingsHolder.setSettings(this.settings());
    });

    effect(() => {
      this.activities();
      this.saveCurrentActivities();
      this.calculateAndShowSummary();
    });
  }

  private loadSettings() {
    let settings = this.storage.getSettings();
    if (!settings) {
      settings = {
        alwaysShownActivities: [],
        durationThreshold: { weeks: 1, days: 0, hours: 0, minutes: 0 },
        enableTasks: true,
      };
      this.storage.saveSettings(settings);
    }
    this.settings.set(settings);
    SettingsHolder.setSettings(settings);
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
    const date = this.currentDateFormatted();
    const activities = this.storage.getActivitiesForDate(date) || [];
    this.activities.set(activities.map(wrapInSignal));
  }

  saveCurrentActivities() {
    const date = this.currentDateFormatted();
    this.storage.saveActivitiesForDate(date, this.activities().map(unwrapSignal));
  }

  addNewActivity(afterId: UUID | null = null) {
    const newActivity: WritableSignal<Activity> = signal({
      id: generateUUID(),
      startTime: '',
      endTime: '',
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
    if (this.activities().length == 1) {
      this.activities.set([]);
    } else if (this.activities().length) {
      const copy = [...this.activities()];
      copy.splice(copy.findIndex(a => a().id == id), 1);
      this.activities.set(copy);
    }
  }

  calculateAndShowSummary() {
    this.summary.set(this.calculator.calculateTimePerActivity(this.activities().map(unwrapSignal)));
  }
}
