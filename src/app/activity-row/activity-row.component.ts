import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, model, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Activity, ActivityDetails, ActivitySuggestion, ActivityType, ISODate, SelectableSuggestion, Time } from '../utils/models';
import { SuggestableInputComponent } from '../suggestable-input/suggestable-input.component';
import { StorageService } from '../services/storage.service';
import { SettingsHolder } from '../utils/settings';
import { IconComponent } from '../icon/icon.component';
import { GridNavCellDirective } from '../grid-nav-container/grid-nav-cell.directive';
import { map } from 'rxjs';

@Component({
  selector: 'tr[activity-row]',
  imports: [CommonModule, FormsModule, SuggestableInputComponent, IconComponent, GridNavCellDirective],
  templateUrl: './activity-row.component.html',
  styleUrls: ['./activity-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityRowComponent implements OnInit {
  readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activity = model.required<Activity>();
  readonly activities = input.required<Activity[]>();
  readonly currentDate = input.required<ISODate>();
  readonly addRow = output<ActivityType | undefined>();
  readonly removeRow = output<void>();
  readonly changed = output<Activity>();

  readonly enableTasks = signal(true);

  ngOnInit(): void {
    this.enableTasks.set(SettingsHolder.getSettings().enableTasks);
    const sub = SettingsHolder.onSettingsChange(s => this.enableTasks.set(s.enableTasks));
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  get id(): string {
    return this.activity().id;
  }

  get startTime(): Time {
    return this.activity().startTime;
  }

  get endTime(): Time {
    return this.activity().endTime;
  }

  get description(): string {
    return this.activity().description;
  }

  get task(): string {
    return this.activity().task;
  }

  get type(): 'activity' | 'text' {
    return this.activity().type;
  }

  set startTime(startTime: Time) {
    this.submitChanges({ startTime });
  }

  set endTime(endTime: Time) {
    this.submitChanges({ endTime });
  }

  set description(description: string) {
    this.submitChanges({ description });
  }

  set task(task: string) {
    this.submitChanges({ task });
  }

  set type(type: 'activity' | 'text') {
    this.submitChanges({ type });
  }

  isText(): boolean {
    return this.type === 'text';
  }

  toggleComment(): void {
    this.type = this.type === 'activity' ? 'text' : 'activity';
  }

  submitChanges(changes: Partial<Activity>): void {
    const changed = { ...this.activity(), ...changes };
    this.activity.set(changed);
    this.changed.emit(changed);
  }

  getStartSuggestions = () => {
    return this.storage.getStartSuggestions(this.currentDate(), this.id, this.activities())
      .pipe(map(s => this.mapToTimeSuggestion(s)));
  };

  getEndSuggestions = () => {
    return this.storage.getEndSuggestions(this.currentDate(), this.id, this.activities())
      .pipe(map(s => this.mapToTimeSuggestion(s)));
  };

  getDescriptionSuggestions = (value: string) => {
    return this.storage.getDescriptionSuggestions(
      value,
      this.currentDate(),
      this.type,
      this.id,
      this.activities(),
      SettingsHolder.getSettings().durationThreshold,
      SettingsHolder.getSettings().alwaysShownActivities,
    ).pipe(map(s => this.mapToActivitySuggestion(s, 'description')));
  };

  getTaskSuggestions = (value: string) => {
    return this.storage.getTaskSuggestions(
      value,
      this.currentDate(),
      this.activity().id,
      this.activities(),
      SettingsHolder.getSettings().durationThreshold,
      SettingsHolder.getSettings().alwaysShownActivities,
    ).pipe(map(s => this.mapToActivitySuggestion(s, 'task')));
  };

  setTaskFromDescription(suggestion: SelectableSuggestion<ActivitySuggestion>) {
    if (this.enableTasks() && !this.task) {
      this.task = suggestion.data.task ?? '';
    }
  }

  setDescriptionFromTask(suggestion: SelectableSuggestion<ActivitySuggestion>) {
    if (!this.description) {
      this.description = suggestion.data.description ?? '';
    }
  }

  private mapToTimeSuggestion(times: Time[]): SelectableSuggestion<Time>[] {
    return times.map(t => ({ text: t, value: t, data: t }));
  }

  private mapToActivitySuggestion(activitySuggestions: ActivitySuggestion[], displayField: keyof ActivitySuggestion): SelectableSuggestion<ActivitySuggestion>[] {
    return activitySuggestions.map(as => (
      displayField === 'description'
        ? {
          text: as['task'] && !this.isText() ? `${ as['description'] } [${ as['task'] }]` : as['description'],
          value: as['description'],
          data: as,
        }
        : {
          text: as['task'],
          value: as['task'],
          data: as,
        }
    ) satisfies SelectableSuggestion<ActivitySuggestion>)
      .filter(as => as !== null)
      .filter((as1, idx, arr) =>
          arr.findIndex(as2 => as2.text === as1.text) === idx
      )
      .sort((as1, as2) => as1.text.localeCompare(as2.text));
  }
}
