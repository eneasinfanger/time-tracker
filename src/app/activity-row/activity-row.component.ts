import { ChangeDetectionStrategy, Component, inject, input, model, OnInit, output, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity, ActivityDetails, ActivityType, ISODate, Time } from '../utils/models';
import { SuggestionsService } from '../services/suggestions.service';
import { initUsing } from '../utils/signals';
import { SuggestableInputComponent } from '../suggestable-input/suggestable-input.component';
import { SettingsService } from "../services/settings.service";
import { SyncService } from "../services/sync.service";
import { subtractDuration } from "../utils/dates";

@Component({
  selector: 'tr[activity-row]',
  imports: [FormsModule, SuggestableInputComponent],
  templateUrl: './activity-row.component.html',
  styleUrls: ['./activity-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityRowComponent implements OnInit {
  readonly suggestions = inject(SuggestionsService);
  readonly sync = inject(SyncService);
  readonly settings = inject(SettingsService);

  readonly activity = input.required<WritableSignal<Activity>>();
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

  getStartSuggestions = async () => {
    return this.suggestions.getStartSuggestions(this.currentDate(), this.compareIds);
  };

  getEndSuggestions = async () => {
    return this.suggestions.getEndSuggestions(this.currentDate(), this.compareIds);
  };

  private compareIds = (ac: Activity) => ac.id == this.activity()().id;

  getDescriptionSuggestions = (value: string) => {
    if (!value && this.task()) {
      return this.suggestions.getActivitySuggestionsForTask(this.task(), this.currentDate());
    }
    return this.suggestions.getActivitySuggestions(value, this.currentDate(), this.type());
  };

  getTaskSuggestions = (value: string) => {
    if (!value && this.description()) {
      return this.suggestions.getTaskSuggestionsForDescription(this.description(), this.currentDate());
    }
    return this.suggestions.getTaskSuggestions(value, this.currentDate());
  };

  setTaskFromDescription(description: string) {
    if (!this.task()) {
      this.findMatchingActivity(a => a.description == description)
        .then(ac => this.task.set(ac?.task ?? ''));
    }
  }

  setDescriptionFromTask(task: string) {
    if (!this.description()) {
      this.findMatchingActivity(a => a.task == task)
        .then(ac => this.description.set(ac?.description ?? ''))
    }
  }

  private async findMatchingActivity(comparison: (a: ActivityDetails) => boolean): Promise<Activity | undefined> {
    const minDate = subtractDuration(this.currentDate(), this.settings.getSettings().durationThreshold);
    return (await this.sync.getActivitiesBetween(minDate, this.currentDate()))
      .concat(...this.settings.getSettings().alwaysShownActivities as Activity[])
      .filter(comparison)
      .pop();
  }
}
