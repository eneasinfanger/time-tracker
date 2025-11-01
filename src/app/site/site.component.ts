import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StorageService } from '../services/storage.service';
import { TimeCalculatorService } from '../services/time-calculator.service';
import { TimeSummaryComponent } from '../time-summary/time-summary.component';
import { ActivityRowComponent } from '../activity-row/activity-row.component';
import { Activity, ActivitySummary } from '../utils/models';
import { unwrapSignal, wrapInSignal } from '../utils/signals';
import { formatDate } from '../utils/dates';
import { generateUUID, UUID } from '../utils/crypto';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';

@Component({
  selector: 'app-site',
  imports: [FormsModule, ReactiveFormsModule, TimeSummaryComponent, ActivityRowComponent, SettingsMenuComponent],
  templateUrl: './site.component.html',
  styleUrls: ['./site.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteComponent {
  protected readonly currentDate = signal(new Date());
  protected readonly currentDateString = computed(() => formatDate(this.currentDate()));
  protected readonly activities = signal<WritableSignal<Activity>[]>([]);
  protected readonly summary = signal<ActivitySummary>({} as ActivitySummary);

  private storage = inject(StorageService);
  private calculator = inject(TimeCalculatorService);

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.loadActivitiesForCurrentDay();

    effect(() => {
      this.activities();
      this.saveCurrentActivities();
      this.calculateAndShowSummary();
    });
  }

  formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  navigateDay(direction: number) {
    const d = new Date(this.currentDate());
    d.setDate(d.getDate() + direction);
    this.currentDate.set(d);
    this.loadActivitiesForCurrentDay();
  }

  loadActivitiesForCurrentDay() {
    const date = this.currentDateString();
    const activities = this.storage.getActivitiesForDate(date) || [];
    if (activities.length !== 0) {
      this.activities.set(activities.map(wrapInSignal));
    }
  }

  saveCurrentActivities() {
    const date = this.currentDateString();
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
    this.saveCurrentActivities();
    const activities = this.storage.getActivitiesForDate(this.currentDateString()) || [];
    this.summary.set(this.calculator.calculateTimePerActivity(activities as Activity[]));
  }

  onSettingsChange($event: any) {
    console.log('Settings changed:', $event);
  }
}
