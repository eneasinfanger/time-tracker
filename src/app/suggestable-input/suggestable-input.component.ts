import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output } from '@angular/core';
import { Observable } from 'rxjs';
import { SuggestionsService } from '../services/suggestions.service';
import { Debouncer, dispatchEvents, SharedDebouncer } from '../utils/events';
import { GridNavCellDirective } from '../grid-nav-container/grid-nav-cell.directive';
import { SelectableSuggestion } from '../utils/models';

@Component({
  selector: 'input[suggestable]',
  imports: [],
  templateUrl: './suggestable-input.component.html',
  styleUrl: './suggestable-input.component.scss',
  host: {
    '(input)': 'loadSuggestions()',
    '(focus)': 'loadSuggestions()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestableInputComponent<D> {
  readonly debouncer: Debouncer = new SharedDebouncer();
  readonly service = inject(SuggestionsService);
  readonly hostRef: ElementRef<HTMLInputElement> = inject(ElementRef);
  private readonly gridNav = inject(GridNavCellDirective, { optional: true });

  readonly suggestionProvider = input.required<(value: string) => Observable<SelectableSuggestion<D>[]>>();
  readonly moveOnSelection = input<'next' | 'previous' | 'none'>('none');
  readonly itemSelected = output<SelectableSuggestion<D>>();
  private requestId = 0;

  loadSuggestions() {
    const requestId = ++this.requestId;
    this.debouncer.run(() => {
      this.service.closeDropdown();
      const inputValue = this.hostRef.nativeElement.value;
      this.suggestionProvider()(inputValue).subscribe(suggestions => {
        if (requestId !== this.requestId) {
          return;
        }
        const filteredSuggestions = suggestions.filter(s => s.text != inputValue);
        if (filteredSuggestions.length > 0) {
          this.showSuggestions(filteredSuggestions);
        }
      });
    });
  }

  private showSuggestions(suggestions: SelectableSuggestion<D>[]): void {
    this.service.openDropdown(this.hostRef, suggestions, selection => {
      this.hostRef.nativeElement.value = selection.value;
      if (this.moveOnSelection() !== 'none') {
        this.gridNav?.navigate(this.moveOnSelection() === 'next' ? 'right' : 'left');
      }
      this.itemSelected.emit(selection);
      this.reload();
    });
  }

  private reload() {
    dispatchEvents(this.hostRef.nativeElement, 'input', 'change');
  }
}
