import { IssueTrackerSource } from "./models";

export type PossibleTaskLink = { text: string, link: string | null };

export const TASK_REGEX = /[A-Z]+-\d+/g;

export function resolveTaskLinks(taskText: string, issueTrackerSources: IssueTrackerSource[]): PossibleTaskLink[] {
  const results: PossibleTaskLink[] = [];
  let lastIndex = 0;
  for (const match of taskText.matchAll(TASK_REGEX)) {
    if (match.index > lastIndex) {
      // non-matching part before match
      results.push({ text: taskText.slice(lastIndex, match.index), link: null });
    }
    // matched part
    results.push({ text: match[0], link: resolveLink(match[0], issueTrackerSources) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < taskText.length) {
    // remaining non-matching part
    results.push({ text: taskText.slice(lastIndex), link: null });
  }
  return results;
}

function resolveLink(taskId: string, issueTrackerSources: IssueTrackerSource[]): string | null {
  const project = taskId.substring(0, taskId.indexOf('-'));
  for (const src of issueTrackerSources) {
    if (src.projects.includes(project)) {
      return `${ src.url }/${ taskId }`;
    }
  }
  return null;
}
