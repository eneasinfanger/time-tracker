import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, model, OnInit, output, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Activity, ActivityDetails, ActivityType, ISODate, Time } from '../utils/models';
import { initUsing, unwrapSignal } from '../utils/signals';
import { SuggestableInputComponent } from '../suggestable-input/suggestable-input.component';
import { StorageService } from '../services/storage.service';
import { SettingsHolder } from '../utils/settings';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'tr[activity-row]',
  imports: [CommonModule, FormsModule, SuggestableInputComponent, IconComponent],
  templateUrl: './activity-row.component.html',
  styleUrls: ['./activity-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityRowComponent implements OnInit {
  readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activity = input.required<WritableSignal<Activity>>();
  readonly activities = input.required<WritableSignal<Activity>[]>();
  readonly currentDate = input.required<ISODate>();
  readonly addRow = output<import('../utils/models').ActivityType | undefined>();
  readonly removeRow = output<void>();
  readonly changed = output<void>();

  readonly startTime = model<Time>('');
  readonly endTime = model<Time>('');
  readonly description = model('');
  readonly task = model('');
  readonly type = model<ActivityType>('activity');

  readonly enableTasks = signal(true);

  ngOnInit() {
    initUsing(this.activity())
      .set(this.startTime, 'startTime')
      .set(this.endTime, 'endTime')
      .set(this.description, 'description')
      .set(this.task, 'task')
      .set(this.type, 'type');

    this.enableTasks.set(SettingsHolder.getSettings().enableTasks);
    const sub = SettingsHolder.onSettingsChange(s => this.enableTasks.set(s.enableTasks));
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  isText() {
    return this.activity()().type === 'text';
  }

  toggleComment() {
    // Emit addRow with 'text' to request a new comment row below this one
    this.addRow.emit('text');
  }

  emitChanged() {
    try {
      this.changed.emit();
    } catch (e) {}
  }

  getStartSuggestions = () => {
    return this.storage.getStartSuggestions(this.currentDate(), this.activity()().id, this.currentActivities());
  };

  getEndSuggestions = () => {
    return this.storage.getEndSuggestions(this.currentDate(), this.activity()().id, this.currentActivities());
  };

  getDescriptionSuggestions = (value: string) => {
    return this.storage.getDescriptionSuggestions(
      value,
      this.currentDate(),
      this.type(),
      this.activity()().id,
      this.currentActivities(),
      SettingsHolder.getSettings().durationThreshold,
      SettingsHolder.getSettings().alwaysShownActivities,
    );
  };

  getTaskSuggestions = (value: string) => {
    return this.storage.getTaskSuggestions(
      value,
      this.currentDate(),
      this.activity()().id,
      this.currentActivities(),
      SettingsHolder.getSettings().durationThreshold,
      SettingsHolder.getSettings().alwaysShownActivities,
    );
  };

  setTaskFromDescription(description: string) {
    if (this.enableTasks() && !this.task()) {
      this.task.set(this.findMatchingActivity(a => a.description == description)?.task ?? '');
    }
  }

  setDescriptionFromTask(task: string) {
    if (!this.description()) {
      this.description.set(this.findMatchingActivity(a => a.task == task)?.description ?? '');
    }
  }

  private currentActivities() {
    return this.activities().map(unwrapSignal);
  }

  private findMatchingActivity(comparison: (a: ActivityDetails) => boolean) {
    const currentId = this.activity()().id;
    return this.currentActivities()
      .concat(...SettingsHolder.getSettings().alwaysShownActivities as Activity[])
      .filter(activity => activity.id !== currentId)
      .filter(comparison)
      .pop();
  }
}
