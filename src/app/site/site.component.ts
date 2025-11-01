import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StorageService } from '../services/storage.service';
import { TimeCalculatorService } from '../services/time-calculator.service';
import { TimeSummaryComponent } from '../time-summary/time-summary.component';
import { ActivityRowComponent } from '../activity-row/activity-row.component';
import { Activity, ActivitySummary } from '../utils/models';
import { unwrapSignal, wrapInSignal } from '../utils/signals';
import { formatDate } from '../utils/dates';

@Component({
  selector: 'app-site',
  imports: [FormsModule, ReactiveFormsModule, TimeSummaryComponent, ActivityRowComponent],
  templateUrl: './site.component.html',
  styleUrls: ['./site.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteComponent {
  protected readonly currentDate = signal(new Date());
  protected readonly currentDateString = computed(() => formatDate(this.currentDate()));
  protected readonly activities = signal<WritableSignal<Activity>[]>([]);

  protected readonly summaryVisible = signal(false);
  protected readonly summary = signal<ActivitySummary>({});

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
    this.summaryVisible.set(false);
  }

  loadActivitiesForCurrentDay() {
    const date = this.currentDateString();
    const activities = this.storage.getActivitiesForDate(date as unknown as any) || [];
    if (activities.length === 0) {
      this.activities.set([
        signal({ startTime: '' as any, endTime: '' as any, description: '', type: 'activity' }),
      ]);
    } else {
      this.activities.set(activities.map(wrapInSignal));
    }
    this.summaryVisible.set(false);
    this.summary.set({});
  }

  saveCurrentActivities() {
    const date = this.currentDateString();
    this.storage.saveActivitiesForDate(date, this.activities().map(unwrapSignal));
  }

  addNewActivity(insertAfterIndex: number | null = null) {
    const newActivity: WritableSignal<Activity> = signal({
      startTime: '' as any,
      endTime: '' as any,
      description: '',
      type: 'activity',
    });

    const copy = [...this.activities()];
    if (insertAfterIndex !== null) {
      copy.splice(insertAfterIndex + 1, 0, newActivity);
    } else {
      copy.push(newActivity);
    }
    this.activities.set(copy);
  }

  removeActivity(index: number) {
    const copy = [...this.activities()];
    if (copy.length > 1) {
      copy.splice(index, 1);
      this.activities.set(copy);
    }
  }

  calculateAndShowSummary() {
    this.saveCurrentActivities();
    const activities = this.storage.getActivitiesForDate(this.currentDateString() as unknown as any) || [];
    const summaryObj = this.calculator.calculateTimePerActivity(activities as Activity[]);
    this.summary.set(summaryObj);
    this.summaryVisible.set(true);
  }
}
