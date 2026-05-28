import { ChangeDetectionStrategy, Component, effect, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivityDetails, Duration, Settings, Theme, IssueTrackerSource } from '../utils/models';
import { generateUUID, UUID } from '../utils/crypto';
import { SettingsHolder } from '../utils/settings';
import { AutoFocusDirective } from '../directives/auto-focus.directive';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'settings-menu',
  templateUrl: './settings-menu.component.html',
  styleUrls: ['./settings-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AutoFocusDirective,
    IconComponent,
  ],
})
export class SettingsMenuComponent implements OnInit {
  readonly ERROR_INVALID_DURATION = 'Invalid duration format! (Allowed are numbers followed by \'w\' = weeks, \'d\' = days, \'h\' = hours and \'m\' = minutes.)';
  readonly ERROR_INVALID_PROJECT = 'Invalid issue tracker project! (Allowed are uppercase letters only.)';
  readonly ERROR_DUPLICATE_ACTIVITY = 'Duplicate activity entry!';
  readonly ERROR_DUPLICATE_PROJECT = 'Duplicate project entry!';
  readonly ERROR_DUPLICATE_SOURCE_NAME = 'Duplicate issue tracker source name!';
  readonly ERROR_DUPLICATE_SOURCE_URL = 'Duplicate issue tracker source URL!';

  closed = output<void>();
  errors = signal<Set<string>>(new Set());

  enableTasks = signal(true);
  theme = signal<Theme>('system');
  durationThreshold = signal<Duration>({} as Duration);
  alwaysShownActivities = signal<ActivityDetails[]>([]);
  issueTrackerSources = signal<IssueTrackerSource[]>([]);

  durationThresholdInput = signal('');
  descriptionInput = signal('');
  taskInput = signal('');

  newSourceName = '';
  newSourceUrl = '';
  newProjectMap: Record<string, string> = {};
  editNameMap: Record<string, string> = {};
  editUrlMap: Record<string, string> = {};
  editingSource = signal<string | null>(null);

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
    this.issueTrackerSources.set(settings.issueTrackerSources);
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

  addSource() {
    const name = this.newSourceName.trim();
    const url = this.newSourceUrl.trim().replace(/\/+$/, '');
    if (!name || !url) {
      return;
    }
    if (this.issueTrackerSources().some(s => s.name === name)) {
      this.addError(this.ERROR_DUPLICATE_SOURCE_NAME);
      return;
    }
    if (this.issueTrackerSources().some(s => s.url === url)) {
      this.addError(this.ERROR_DUPLICATE_SOURCE_URL);
      return;
    }
    this.removeError(this.ERROR_DUPLICATE_SOURCE_NAME);
    this.removeError(this.ERROR_DUPLICATE_SOURCE_URL);
    this.issueTrackerSources.update(arr => [...arr, { name, url, projects: [] }]);
    this.newSourceName = '';
    this.newSourceUrl = '';
  }

  removeSource(name: string) {
    this.issueTrackerSources.update(arr => arr.filter(s => s.name !== name));
    delete this.newProjectMap[name];
    delete this.editNameMap[name];
    delete this.editUrlMap[name];
    if (this.editingSource() === name) {
      this.editingSource.set(null);
    }
  }

  startEditSource(name: string) {
    const src = this.issueTrackerSources().find(s => s.name === name);
    if (!src) {
      return;
    }
    this.editNameMap[name] = src.name;
    this.editUrlMap[name] = src.url;
    this.editingSource.set(name);
  }

  saveEditSource(oldName: string) {
    const newName = (this.editNameMap[oldName] || '').trim();
    const newUrl = (this.editUrlMap[oldName] || '').trim().replace(/\/+$/, '');
    if (!newName || !newUrl) {
      return;
    }
    // check duplicates except the current source
    if (this.issueTrackerSources().some(s => s.name === newName && s.name !== oldName)) {
      this.addError(this.ERROR_DUPLICATE_SOURCE_NAME);
      return;
    }
    if (this.issueTrackerSources().some(s => s.url === newUrl && s.name !== oldName)) {
      this.addError(this.ERROR_DUPLICATE_SOURCE_URL);
      return;
    }
    this.removeError(this.ERROR_DUPLICATE_SOURCE_NAME);
    this.removeError(this.ERROR_DUPLICATE_SOURCE_URL);
    const updated = this.issueTrackerSources().map(s => s.name === oldName ? { ...s, name: newName, url: newUrl } : s);
    // move temp maps to new key if name changed
    if (newName !== oldName) {
      // TODO reduce duplication
      if (this.newProjectMap[oldName] !== undefined) {
        this.newProjectMap[newName] = this.newProjectMap[oldName];
        delete this.newProjectMap[oldName];
      }
      if (this.editNameMap[oldName] !== undefined) {
        this.editNameMap[newName] = this.editNameMap[oldName];
        delete this.editNameMap[oldName];
      }
      if (this.editUrlMap[oldName] !== undefined) {
        this.editUrlMap[newName] = this.editUrlMap[oldName];
        delete this.editUrlMap[oldName];
      }
    }
    this.issueTrackerSources.set(updated);
    this.editingSource.set(null);
  }

  cancelEditSource(name: string) {
    delete this.editNameMap[name];
    delete this.editUrlMap[name];
    this.editingSource.set(null);
  }

  addProjectToSource(sourceName: string) {
    const project = (this.newProjectMap[sourceName] || '').trim();
    if (!/^[A-Z]+$/.test(project)) {
      this.addError(this.ERROR_INVALID_PROJECT);
      return;
    }
    this.removeError(this.ERROR_INVALID_PROJECT);
    const sources = this.issueTrackerSources();
    if (sources.some(s => s.projects.includes(project))) {
      this.addError(this.ERROR_DUPLICATE_PROJECT);
      return;
    }
    this.removeError(this.ERROR_DUPLICATE_PROJECT);
    this.issueTrackerSources.set(sources.map(s => s.name === sourceName ? { ...s, projects: [...s.projects, project] } : s));
    this.newProjectMap[sourceName] = '';
  }

  removeProjectFromSource(sourceName: string, project: string) {
    this.issueTrackerSources.set(this.issueTrackerSources().map(s => s.name === sourceName ? {
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
      issueTrackerSources: this.issueTrackerSources(),
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
