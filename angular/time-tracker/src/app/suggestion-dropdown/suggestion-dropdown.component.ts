import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';

@Component({
  selector: 'tt-suggestion-dropdown',
  imports: [],
  templateUrl: './suggestion-dropdown.component.html',
  styleUrls: ['./suggestion-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestionDropdownComponent {
  readonly items = model<string[]>([]);
  readonly select = output<string>();

  selectItem(item: string) {
    this.select.emit(item);
  }
}
