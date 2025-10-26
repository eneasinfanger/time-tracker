import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, AfterViewInit, ElementRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity } from '../models';
import { SuggestionsService } from '../suggestions.service';

@Component({
  selector: 'tr[activity-row]',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-row.component.html',
  styleUrls: ['./activity-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityRowComponent implements AfterViewInit, OnDestroy {
  @Input() activity!: Activity;
  @Input() currentDate?: string;
  @Output() addRow = new EventEmitter<void>();
  @Output() removeRow = new EventEmitter<void>();

  private host = inject(ElementRef).nativeElement as HTMLElement;
  private suggestions = inject(SuggestionsService);

  private attachedInputs: HTMLInputElement[] = [];

  ngAfterViewInit() {
    this.attachListeners();
  }

  ngOnDestroy() {
    this.attachedInputs.forEach(i => this.suggestions.detachSuggestionsFromInput(i));
  }

  isText() {
    return this.activity.type === 'text';
  }

  private attachListeners() {
    const startTimeInput = this.host.querySelector<HTMLInputElement>('.start-time');
    const endTimeInput = this.host.querySelector<HTMLInputElement>('.end-time');
    const descriptionInput = this.host.querySelector<HTMLInputElement>('.description');
    const typeSelect = this.host.querySelector<HTMLSelectElement>('.activity-type');

    if (!startTimeInput || !endTimeInput || !descriptionInput || !typeSelect) return;

    // Attach suggestion behavior via service
    this.suggestions.attachSuggestionsToInput(startTimeInput, (_value, dateIso) => this.suggestions.getTimeSuggestions(dateIso), () => this.currentDate || new Date().toISOString().split('T')[0]);
    this.suggestions.attachSuggestionsToInput(descriptionInput, (value, dateIso) => this.suggestions.getActivitySuggestions(value, dateIso), () => this.currentDate || new Date().toISOString().split('T')[0]);
    this.attachedInputs.push(startTimeInput, descriptionInput);

    typeSelect.addEventListener('change', (e) => {
      const isTextOnly = (e.target as HTMLSelectElement).value === 'text';
      if (startTimeInput && endTimeInput) {
        startTimeInput.disabled = isTextOnly;
        endTimeInput.disabled = isTextOnly;

        if (isTextOnly) {
          startTimeInput.classList.add('bg-gray-100');
          endTimeInput.classList.add('bg-gray-100');
          startTimeInput.value = '';
          endTimeInput.value = '';
        } else {
          startTimeInput.classList.remove('bg-gray-100');
          endTimeInput.classList.remove('bg-gray-100');
        }
      }
    });
  }

  // dropdown is handled by SuggestionsService which mounts the SuggestionDropdownComponent dynamically
}
