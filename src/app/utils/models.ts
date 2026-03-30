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
  date: ISODate
  description: string;
  task: string;
  type: ActivityType;
};

export type ActivityType = 'activity' | 'text';

export type ActivityDetails = {
  id: UUID;
  description: string;
  task: string;
}

export type ISODate = `${number}-${number}-${number}` & { __isoDate__: void };
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
