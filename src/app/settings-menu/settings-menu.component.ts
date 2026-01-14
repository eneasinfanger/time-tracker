import { ChangeDetectionStrategy, Component, effect, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityDetails, Duration, Settings } from '../utils/models';
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
export class SettingsMenuComponent implements OnInit {
  readonly ERROR_INVALID_DURATION = 'Invalid duration format! (Allowed are numbers followed by \'w\' = weeks, \'d\' = days, \'h\' = hours and \'m\' = minutes.)';
  readonly ERROR_INVALID_PROJECT = 'Invalid JIRA Project! (Allowed are uppercase letters only.)';
  readonly ERROR_DUPLICATE_ACTIVITY = 'Duplicate activity entry!';
  readonly ERROR_DUPLICATE_PROJECT = 'Duplicate project entry!';

  readonly currentSettings = input.required<Settings>();
  readonly settingsChange = output<Settings>();

  open = signal(false);
  errors = signal<Set<string>>(new Set());

  enableTasks = signal(true);
  durationThreshold = signal<Duration>({} as Duration);
  alwaysShownActivities = signal<ActivityDetails[]>([]);

  durationThresholdInput = signal('');
  descriptionInput = signal('');
  taskInput = signal('');

  loepaProjectInput = signal('');
  svanetProjectInput = signal('');
  loepaProjects = signal<string[]>([]);
  svanetProjects = signal<string[]>([]);

  constructor() {
    effect(() => {
      this.durationThreshold();
      this.durationThresholdInput.set(this.formatDurationThreshold());
    });
  }

  ngOnInit() {
    this.durationThreshold.set(this.currentSettings().durationThreshold);
    this.alwaysShownActivities.set(this.currentSettings().alwaysShownActivities);
    this.enableTasks.set(this.currentSettings().enableTasks);
    this.loepaProjects.set(this.currentSettings().loepaProjects || []);
    this.svanetProjects.set(this.currentSettings().svanetProjects || []);
  }

  toggle() {
    this.open.update(v => !v);
  }

  addActivityFromInputs() {
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

  addProjectFromInput(type: 'loepa' | 'svanet') {
    const input = type === 'loepa' ? this.loepaProjectInput : this.svanetProjectInput;
    const value = input().trim();
    if (!/^[A-Z]+$/.test(value)) {
      this.addError(this.ERROR_INVALID_PROJECT);
      return;
    }
    this.removeError(this.ERROR_INVALID_PROJECT);
    const projects = type === 'loepa' ? this.loepaProjects : this.svanetProjects;
    if (this.loepaProjects().includes(value) || this.svanetProjects().includes(value)) {
      this.addError(this.ERROR_DUPLICATE_PROJECT);
      return;
    }
    this.removeError(this.ERROR_DUPLICATE_PROJECT);
    projects.update(arr => [...arr, value]);
    input.set('')
  }

  removeProject(type: 'loepa' | 'svanet', project: string) {
    const projects = type === 'loepa' ? this.loepaProjects : this.svanetProjects;
    projects.update(arr => arr.filter(p => p !== project));
  }

  save() {
    if (this.errors().size > 0) {
      return;
    }
    const settings: Settings = {
      alwaysShownActivities: this.alwaysShownActivities(),
      durationThreshold: this.durationThreshold(),
      enableTasks: this.enableTasks(),
      loepaProjects: this.loepaProjects(),
      svanetProjects: this.svanetProjects(),
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
    return str ? str.trim() : '0m';
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
