import {Component, output} from '@angular/core';

@Component({
  selector: 'settings-button',
  imports: [],
  templateUrl: './settings-button.component.html',
  styleUrl: './settings-button.component.scss',
})
export class SettingsButtonComponent {
  readonly clicked = output<void>();
}
