import { Component, computed, effect, input, OnInit, signal, Signal } from '@angular/core';
import { SettingsHolder } from '../utils/settings';
import { JiraSource, Settings } from '../utils/models';

@Component({
  selector: 'task-link',
  imports: [],
  templateUrl: './task-link.component.html',
  styleUrl: './task-link.component.scss',
})
export class TaskLinkComponent {
  static readonly TASK_REGEX = /[A-Z]+-\d+/g;

  readonly taskText = input.required<string>();
  readonly taskTextComponents = signal<PossibleTaskLink[]>([]);

  constructor() {
    effect(() => {
      this.resolveTask(this.taskText(), SettingsHolder.getSettings());
    });
    SettingsHolder.onSettingsChange(s => this.resolveTask(this.taskText(), s));
  }

  private resolveTask(taskText: string, settings: Settings) {
    const results: PossibleTaskLink[] = [];
    let lastIndex = 0;
    for (const match of taskText.matchAll(TaskLinkComponent.TASK_REGEX)) {
      if (match.index > lastIndex) {
        // non-matching part before match
        results.push({ text: taskText.slice(lastIndex, match.index), link: null });
      }
      // matched part
      results.push({ text: match[0], link: this.resolveLink(match[0], settings.jiraSources) });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < taskText.length) {
      // remaining non-matching part
      results.push({ text: taskText.slice(lastIndex), link: null });
    }
    this.taskTextComponents.set(results);
  }

  private resolveLink(task: string, jiraSources: JiraSource[]): string | null {
    const project = task.substring(0, task.indexOf('-'));
    for (const src of jiraSources) {
      if (src.projects.includes(project)) {
        return `${ src.url }/${ task }`;
      }
    }
    return null;
  }
}

type PossibleTaskLink = { text: string, link: string | null };
