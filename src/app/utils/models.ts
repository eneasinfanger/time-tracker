import { UUID } from './crypto';

export interface ActivitySummary {
  getTotalByDescription(): ActivityTotal;

  getTotalByTask(): ActivityTotal;

  hasActivities(): boolean;
}

export type ActivitySummaryEntry = { activities: Activity[]; totalMinutes: number };
export type ActivityTotal = Map<string, ActivitySummaryEntry>;

export type Activity = {
  id: UUID;
  startTime: Time;
  endTime: Time;
  description: string;
  task: string;
  type: 'activity' | 'text';
};

export type ActivityType = Activity['type'];

export type ActivityDetails = {
  id: UUID;
  description: string;
  task: string;
}

export type FormattedDate = string & { __formattedDate__: void };
export type Time = '' | `${ number }${ number }:${ number }${ number }`;
export type Duration = { weeks: number; days: number; hours: number; minutes: number };
export type Theme = 'light' | 'dark' | 'system';

export type JiraSource = {
  name: string;
  url: string;
  projects: string[];
};

export type Settings = {
  alwaysShownActivities: ActivityDetails[];
  durationThreshold: Duration;
  enableTasks: boolean;
  theme: Theme;
  jiraSources: JiraSource[];
}
