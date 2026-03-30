import { Component, effect, inject, input, signal } from '@angular/core';
import { Settings } from '../utils/models';
import { PossibleTaskLink, resolveTaskLinks } from "../utils/task-parser";
import { SettingsService } from "../services/settings.service";

@Component({
  selector: 'task-link',
  imports: [],
  templateUrl: './task-link.component.html',
  styleUrl: './task-link.component.scss',
})
export class TaskLinkComponent {
  private readonly settingsService = inject(SettingsService);

  readonly taskText = input.required<string>();
  readonly taskTextComponents = signal<PossibleTaskLink[]>([]);

  constructor() {
    const resolveTask = (taskText: string, settings: Settings) => {
      this.taskTextComponents.set(resolveTaskLinks(taskText, settings.jiraSources));
    }
    effect(() => {
      resolveTask(this.taskText(), this.settingsService.getSettings());
    });
    this.settingsService.onSettingsChange(s => resolveTask(this.taskText(), s));
  }
}
