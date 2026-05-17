import { ChangeDetectionStrategy, Component, inject, input, model, OnInit, output, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity, ActivityDetails, ActivityType, ISODate, Time } from '../utils/models';
import { initUsing, unwrapSignal } from '../utils/signals';
import { SuggestableInputComponent } from '../suggestable-input/suggestable-input.component';
import { StorageService } from '../services/storage.service';
import { SettingsHolder } from '../utils/settings';

@Component({
  selector: 'tr[activity-row]',
  imports: [FormsModule, SuggestableInputComponent],
  templateUrl: './activity-row.component.html',
  styleUrls: ['./activity-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityRowComponent implements OnInit {
  readonly storage = inject(StorageService);

  readonly activity = input.required<WritableSignal<Activity>>();
  readonly activities = input.required<WritableSignal<Activity>[]>();
  readonly currentDate = input.required<ISODate>();
  readonly addRow = output<void>();
  readonly removeRow = output<void>();

  readonly startTime = model<Time>('');
  readonly endTime = model<Time>('');
  readonly description = model('');
  readonly task = model('');
  readonly type = model<ActivityType>('activity');

  ngOnInit() {
    initUsing(this.activity())
      .set(this.startTime, 'startTime')
      .set(this.endTime, 'endTime')
      .set(this.description, 'description')
      .set(this.task, 'task')
      .set(this.type, 'type');
  }

  isText() {
    return this.activity()().type === 'text';
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
    if (!this.task()) {
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
