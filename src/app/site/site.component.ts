import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StorageService } from '../services/storage.service';
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
  readonly summary = signal<ActivitySummary>({} as ActivitySummary);
  readonly settingsOpen = signal(false);

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
      this.saveCurrentActivities();
      this.calculateAndShowSummary();
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
    const activities = this.storage.getActivitiesForDate(date) || [];
    this.activities.set(activities.map(wrapInSignal));
  }

  saveCurrentActivities() {
    const date = this.currentDateISO();
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
