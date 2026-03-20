import { Component, effect, input, signal } from '@angular/core';
import { SettingsHolder } from '../utils/settings';
import { Settings } from '../utils/models';
import { PossibleTaskLink, resolveTaskLinks } from "../utils/task-parser";

@Component({
  selector: 'task-link',
  imports: [],
  templateUrl: './task-link.component.html',
  styleUrl: './task-link.component.scss',
})
export class TaskLinkComponent {
  readonly taskText = input.required<string>();
  readonly taskTextComponents = signal<PossibleTaskLink[]>([]);

  constructor() {
    const resolveTask = (taskText: string, settings: Settings) => {
      this.taskTextComponents.set(resolveTaskLinks(taskText, settings.jiraSources));
    }
    effect(() => {
      resolveTask(this.taskText(), SettingsHolder.getSettings());
    });
    SettingsHolder.onSettingsChange(s => resolveTask(this.taskText(), s));
  }
}
