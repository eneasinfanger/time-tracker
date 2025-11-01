import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
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

  readonly suggestionProvider = input.required<(value: string) => string[]>();

  onChange() {
    this.debouncer.run(() => {
      this.service.closeDropdown();
      const hostElement = this.hostRef.nativeElement;
      const suggestions = this.suggestionProvider()(hostElement.value)
        .filter(value => value != hostElement.value);
      if (suggestions?.length > 0) {
        this.service.openDropdown(this.hostRef, suggestions, selection => {
          hostElement.value = selection;
          dispatchEvents(hostElement, 'input', 'change');
        });
      }
    });
  }
}
