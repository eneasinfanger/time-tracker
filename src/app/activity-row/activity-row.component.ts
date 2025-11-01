import { ChangeDetectionStrategy, Component, inject, input, model, OnInit, output, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Activity, FormattedDate, Time } from '../utils/models';
import { SuggestionsService } from '../services/suggestions.service';
import { initUsing } from '../utils/signals';
import { SuggestableInputComponent } from '../suggestable-input/suggestable-input.component';
import { NgClass } from '@angular/common';

@Component({
  selector: 'tr[activity-row]',
  imports: [FormsModule, SuggestableInputComponent, NgClass],
  templateUrl: './activity-row.component.html',
  styleUrls: ['./activity-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityRowComponent implements OnInit {
  readonly suggestions = inject(SuggestionsService);

  readonly activity = input.required<WritableSignal<Activity>>();
  readonly currentDate = input.required<FormattedDate>();
  readonly addRow = output<void>();
  readonly removeRow = output<void>();

  readonly startTime = model<Time>('');
  readonly endTime = model<Time>('');
  readonly description = model('');
  readonly type = model<Activity['type']>('activity');

  ngOnInit() {
    initUsing(this.activity())
      .set(this.startTime, 'startTime')
      .set(this.endTime, 'endTime')
      .set(this.description, 'description')
      .set(this.type, 'type');
  }

  isText() {
    return this.activity()().type === 'text';
  }

  getStartSuggestions = () => {
    return this.suggestions.getStartSuggestions(this.currentDate(), this.compareIds);
  };

  getEndSuggestions = () => {
    return this.suggestions.getEndSuggestions(this.currentDate(), this.compareIds);
  };

  private compareIds = (ac: Activity) => ac.id == this.activity()().id;

  getActivitySuggestions = (value: string) => {
    return this.suggestions.getActivitySuggestions(value, this.currentDate());
  };
}
