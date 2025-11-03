import {Component, computed, input} from '@angular/core';

@Component({
  selector: 'task-link',
  imports: [],
  templateUrl: './task-link.component.html',
  styleUrl: './task-link.component.scss',
})
export class TaskLinkComponent {
  private readonly loepa_projects = ['LOEPA', 'LAB', 'SYS', 'ENG', 'TECH', 'TC'];
  private readonly svanet_projects = ['TB', 'LADEV', 'TT', 'AKB', 'ARTAG'];

  readonly taskNr = input.required<string>();
  readonly taskLink = computed(() => this.resolveTask(this.taskNr()));

  private resolveTask(taskNr: string): string | null {
    const parts = taskNr.split('-');
    if (parts.length == 2 && /[A-Z]/.test(parts[0]) && /\d+/.test(parts[1])) {
      if (this.loepa_projects.includes(parts[0])) {
        return `https://jira.loewenfels.ch/jira/browse/${taskNr}`;
      } else if (this.svanet_projects.includes(parts[0])) {
        return `https://jira.svanet.ch/browse/${taskNr}`;
      }
    }
    return null;
  }
}
