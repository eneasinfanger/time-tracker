import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output } from '@angular/core';
import { SuggestionsService } from '../services/suggestions.service';
import { Debouncer, dispatchEvents, SharedDebouncer } from '../utils/events';

@Component({
  selector: 'input[suggestable]',
  imports: [],
  templateUrl: './suggestable-input.component.html',
  styleUrl: './suggestable-input.component.scss',
  host: {
    '(input)': 'displaySuggestions()',
    '(focus)': 'displaySuggestions()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestableInputComponent {
  readonly debouncer: Debouncer = new SharedDebouncer();
  readonly service = inject(SuggestionsService);
  readonly hostRef: ElementRef<HTMLInputElement> = inject(ElementRef);

  readonly suggestionProvider = input.required<(value: string) => string[] | Promise<string[]>>();
  readonly itemSelected = output<string>();

  displaySuggestions() {
    this.debouncer.run(() => {
      this.service.closeDropdown();
      const hostElement = this.hostRef.nativeElement;
      Promise.resolve(this.suggestionProvider()(hostElement.value))
        .then(suggestions => {
          if (suggestions?.length > 0) {
            this.service.openDropdown(this.hostRef, suggestions, selection => {
              hostElement.value = selection;
              dispatchEvents(hostElement, 'input', 'change');
              this.itemSelected.emit(selection);
            });
          }
        });
    });
  }
}
