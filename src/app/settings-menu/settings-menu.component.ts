import { ChangeDetectionStrategy, Component, effect, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Duration, PersistentActivity } from '../utils/models';
import { generateUUID, UUID } from '../utils/crypto';

@Component({
  selector: 'settings-menu',
  templateUrl: './settings-menu.component.html',
  styleUrls: ['./settings-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
  ],
})
export class SettingsMenuComponent {
  readonly ERROR_INVALID_DURATION = 'Invalid duration format!';
  readonly ERROR_DUPLICATE_ACTIVITY = 'Duplicate activity entry!';

  readonly settingsChange = output<{
    alwaysShownActivities: PersistentActivity[];
    durationThreshold: Duration;
    enableTasks: boolean;
  }>();

  open = signal(false);
  errors = signal<Set<string>>(new Set());

  enableTasks = signal(true);
  durationThreshold = signal<Duration>({} as Duration);
  alwaysShownActivities = signal<PersistentActivity[]>([]);

  durationThresholdInput = signal('');
  descriptionInput = signal('');
  taskInput = signal('');

  constructor() {
    effect(() => {
      this.durationThreshold();
      this.durationThresholdInput.set(this.formatDurationThreshold());
    });
  }

  toggle() {
    this.open.update(v => !v);
  }

  addFromInputs() {
    const description = this.descriptionInput().trim();
    const task = this.taskInput().trim();
    if (!description && !task) {
      return;
    }
    if (this.alwaysShownActivities().some(act => act.description === description && act.task === task)) {
      this.addError(this.ERROR_DUPLICATE_ACTIVITY);
      return;
    }
    this.removeError(this.ERROR_DUPLICATE_ACTIVITY);
    this.alwaysShownActivities.update(arr => [...arr, { description, task, id: generateUUID() }]);
    this.descriptionInput.set('');
    this.taskInput.set('');
  }

  removeActivity(id: UUID) {
    this.alwaysShownActivities.update(arr => arr.filter(a => a.id !== id));
  }

  save() {
    if (this.errors().size > 0) {
      return;
    }
    const settings = {
      alwaysShownActivities: this.alwaysShownActivities(),
      durationThreshold: this.durationThreshold(),
      enableTasks: this.enableTasks(),
    };
    this.settingsChange.emit(settings);
    this.close();
  }

  close() {
    this.open.set(false);
  }

  formatDurationThreshold(): string {
    let str = '';
    if (this.durationThreshold().weeks) {
      str += `${ this.durationThreshold().weeks }w `;
    }
    if (this.durationThreshold().days) {
      str += `${ this.durationThreshold().days }d `;
    }
    if (this.durationThreshold().hours) {
      str += `${ this.durationThreshold().hours }h `;
    }
    if (this.durationThreshold().minutes) {
      str += `${ this.durationThreshold().minutes }m `;
    }
    return str || '0m';
  }

  updateDurationThreshold(input: Event) {
    const value = (input.target as HTMLInputElement).value;
    const duration = this.parseDuration(value);
    const isNotInt = (x: number) => !Number.isInteger(x);
    if (duration == null || isNotInt(duration.weeks) || isNotInt(duration.days) || isNotInt(duration.hours) || isNotInt(duration.minutes)) {
      this.addError(this.ERROR_INVALID_DURATION);
      return;
    }
    this.removeError(this.ERROR_INVALID_DURATION);
    this.fixOverflow(duration);
    this.durationThreshold.set(duration);
  }

  private parseDuration(value: string) {
    const input = value.trim();
    if (!/[wdhm]$|^$/i.test(input)) {
      return null;
    }
    const duration: any = { weeks: 0, days: 0, hours: 0, minutes: 0 };
    if (input.length === 0) {
      return duration;
    }

    const pairRegEx = /(\d+)\s*([wdhm])/gi;
    let match: RegExpExecArray | null;
    while ((match = pairRegEx.exec(input)) !== null) {
      const n = Number(match[1]);
      if (!Number.isInteger(n)) { return null; }
      const unit = match[2].toLowerCase();
      // @formatter:off
      switch (unit) {
        case 'w': duration.weeks += n; break;
        case 'd': duration.days += n; break;
        case 'h': duration.hours += n; break;
        case 'm': duration.minutes += n; break;
        default: return null;
      }
      // @formatter:on
    }
    return duration;
  }

  private fixOverflow(duration: Duration) {
    if (duration.minutes >= 60) {
      duration.hours += Math.floor(duration.minutes / 60);
      duration.minutes = duration.minutes % 60;
    }
    if (duration.hours >= 24) {
      duration.days += Math.floor(duration.hours / 24);
      duration.hours = duration.hours % 24;
    }
    if (duration.days >= 7) {
      duration.weeks += Math.floor(duration.days / 7);
      duration.days = duration.days % 7;
    }
  }

  private addError(error: string) {
    this.errors.update(errs => errs.add(error));
  }

  private removeError(error: string) {
    this.errors.update(errs => {
      errs.delete(error);
      return errs;
    });
  }
}
