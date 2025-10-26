import { ChangeDetectionStrategy, Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tt-suggestion-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suggestion-dropdown.component.html',
  styleUrls: ['./suggestion-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuggestionDropdownComponent {
  @Input() items: string[] = [];
  @Output() select = new EventEmitter<string>();

  selectItem(item: string) {
    this.select.emit(item);
  }
}
