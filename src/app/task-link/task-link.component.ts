import { Component, computed, input, Signal } from '@angular/core';
import { SettingsHolder } from "../utils/settings";

@Component({
  selector: 'task-link',
  imports: [],
  templateUrl: './task-link.component.html',
  styleUrl: './task-link.component.scss',
})
export class TaskLinkComponent {
  static readonly TASK_REGEX = /[A-Z]+-\d+/g;

  readonly taskText = input.required<string>();
  readonly taskTextComponents: Signal<PossibleTaskLink[]> = computed(() => this.resolveTask(this.taskText()));

  private resolveTask(taskText: string): PossibleTaskLink[] {
    const { loepaProjects, svanetProjects } = SettingsHolder.getSettings();
    const results: PossibleTaskLink[] = [];
    let lastIndex = 0;
    for (const match of taskText.matchAll(TaskLinkComponent.TASK_REGEX)) {
      if (match.index > lastIndex) {
        // non-matching part before match
        results.push({ text: taskText.slice(lastIndex, match.index), link: null });
      }
      // matched part
      results.push({ text: match[0], link: this.resolveLink(match[0], loepaProjects, svanetProjects) });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < taskText.length) {
      // remaining non-matching part
      results.push({ text: taskText.slice(lastIndex), link: null });
    }
    return results;
  }

  private resolveLink(task: string, loepaProjects?: string[], svanetProjects?: string[]): string | null {
    const project = task.substring(0, task.indexOf('-'));
    // TODO make links configurable / jira systems generally
    if (loepaProjects?.includes(project)) {
      return `https://jira.loewenfels.ch/jira/browse/${ task }`;
    } else if (svanetProjects?.includes(project)) {
      return `https://jira.svanet.ch/browse/${ task }`;
    }
    return null;
  }
}

type PossibleTaskLink = { text: string, link: string | null };
