import { ChangeDetectionStrategy, Component, EventEmitter, input, Input, output, Output, Signal } from '@angular/core';
import { SaveState } from '../site/site.component';

@Component({
  selector: 'app-save-indicator',
  standalone: true,
  templateUrl: './save-indicator.component.html',
  styleUrls: ['./save-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveIndicatorComponent {
  readonly saveState = input.required<SaveState>();
  readonly saveNow = output<void>();

  triggerSave() {
    this.saveNow.emit();
  }
}
