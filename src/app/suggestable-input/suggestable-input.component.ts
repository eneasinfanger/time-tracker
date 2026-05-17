import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output } from '@angular/core';
import { Observable } from 'rxjs';
import { SuggestionsService } from '../services/suggestions.service';
import { Debouncer, dispatchEvents, SharedDebouncer } from '../utils/events';

@Component({
  selector: 'input[suggestable]',
  imports: [],
  templateUrl: './suggestable-input.component.html',
  styleUrl: './suggestable-input.component.scss',
  host: {
    '(input)': 'onChange()',
    '(focus)': 'onChange()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestableInputComponent {
  readonly debouncer: Debouncer = new SharedDebouncer();
  readonly service = inject(SuggestionsService);
  readonly hostRef: ElementRef<HTMLInputElement> = inject(ElementRef);

  readonly suggestionProvider = input.required<(value: string) => Observable<string[]>>();
  readonly itemSelected = output<string>();
  private requestId = 0;

  onChange() {
    const requestId = ++this.requestId;
    this.debouncer.run(() => {
      this.service.closeDropdown();
      const hostElement = this.hostRef.nativeElement;
      this.suggestionProvider()(hostElement.value).subscribe(suggestions => {
        if (requestId !== this.requestId) {
          return;
        }

        const filteredSuggestions = suggestions.filter(value => value != hostElement.value);
        if (filteredSuggestions.length > 0) {
          this.service.openDropdown(this.hostRef, filteredSuggestions, selection => {
            hostElement.value = selection;
            dispatchEvents(hostElement, 'input', 'change');
            this.itemSelected.emit(selection);
          });
        }
      });
    });
  }
}
