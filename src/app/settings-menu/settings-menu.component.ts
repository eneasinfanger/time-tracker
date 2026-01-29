import { ChangeDetectionStrategy, Component, effect, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityDetails, Duration, Settings, Theme, JiraSource } from '../utils/models';
import { generateUUID, UUID } from '../utils/crypto';
import { SettingsHolder } from '../utils/settings';
import { AutoFocusDirective } from '../directives/auto-focus.directive';

@Component({
  selector: 'settings-menu',
  templateUrl: './settings-menu.component.html',
  styleUrls: ['./settings-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AutoFocusDirective,
  ],
})
export class SettingsMenuComponent implements OnInit {
  readonly ERROR_INVALID_DURATION = 'Invalid duration format! (Allowed are numbers followed by \'w\' = weeks, \'d\' = days, \'h\' = hours and \'m\' = minutes.)';
  readonly ERROR_INVALID_PROJECT = 'Invalid JIRA Project! (Allowed are uppercase letters only.)';
  readonly ERROR_DUPLICATE_ACTIVITY = 'Duplicate activity entry!';
  readonly ERROR_DUPLICATE_PROJECT = 'Duplicate project entry!';

  closed = output<void>();
  errors = signal<Set<string>>(new Set());

  enableTasks = signal(true);
  theme = signal<Theme>('system');
  durationThreshold = signal<Duration>({} as Duration);
  alwaysShownActivities = signal<ActivityDetails[]>([]);
  jiraSources = signal<JiraSource[]>([]);

  durationThresholdInput = signal('');
  descriptionInput = signal('');
  taskInput = signal('');
  newSourceName = signal('');
  newSourceUrl = signal('');
  newProjectInput = signal('');

  constructor() {
    effect(() => {
      this.durationThreshold();
      this.durationThresholdInput.set(this.formatDurationThreshold());
    });
  }

  ngOnInit() {
    const settings = SettingsHolder.getSettings();
    this.durationThreshold.set(settings.durationThreshold);
    this.alwaysShownActivities.set(settings.alwaysShownActivities);
    this.enableTasks.set(settings.enableTasks);
    this.theme.set(settings.theme);
    this.jiraSources.set(settings.jiraSources);
  }

  close() {
    this.closed.emit();
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

  addJiraSource() {
    const name = this.newSourceName().trim();
    const url = this.newSourceUrl().trim();
    if (!name || !url) return;
    if (this.jiraSources().some(s => s.name === name)) {
      this.addError('Duplicate JIRA source name');
      return;
    }
    this.removeError('Duplicate JIRA source name');
    this.jiraSources.update(arr => [...arr, { name, url: url.replace(/\/+$/, ''), projects: [] }]);
    this.newSourceName.set('');
    this.newSourceUrl.set('');
  }

  removeJiraSource(name: string) {
    this.jiraSources.update(arr => arr.filter(s => s.name !== name));
  }

  addProjectToSource(sourceName: string) {
    const project = this.newProjectInput().trim();
    if (!/^[A-Z]+$/.test(project)) {
      this.addError(this.ERROR_INVALID_PROJECT);
      return;
    }
    this.removeError(this.ERROR_INVALID_PROJECT);
    const sources = this.jiraSources();
    if (sources.some(s => s.projects.includes(project))) {
      this.addError(this.ERROR_DUPLICATE_PROJECT);
      return;
    }
    this.removeError(this.ERROR_DUPLICATE_PROJECT);
    this.jiraSources.set(sources.map(s => s.name === sourceName ? { ...s, projects: [...s.projects, project] } : s));
    this.newProjectInput.set('');
  }

  removeProjectFromSource(sourceName: string, project: string) {
    this.jiraSources.set(this.jiraSources().map(s => s.name === sourceName ? {
      ...s,
      projects: s.projects.filter(p => p !== project),
    } : s));
  }

  save() {
    if (this.errors().size > 0) {
      return;
    }
    const settings: Settings = {
      alwaysShownActivities: this.alwaysShownActivities(),
      durationThreshold: this.durationThreshold(),
      enableTasks: this.enableTasks(),
      theme: this.theme(),
      jiraSources: this.jiraSources(),
    };
    SettingsHolder.setSettings(settings);
    this.close();
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
      if (!Number.isInteger(n)) {
        return null;
      }
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
