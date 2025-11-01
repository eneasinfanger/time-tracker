import { UUID } from './crypto';

export interface ActivitySummary {
  getTotalByDescription(): Map<string, ActivitySummaryEntry>;

  getTotalByTask(): Map<string, ActivitySummaryEntry>;

  hasActivitiesWithDescription(): boolean;

  hasActivitiesWithTask(): boolean;
}

export type ActivitySummaryEntry = { activities: Activity[]; totalMinutes: number };

export type Activity = {
  id: UUID;
  startTime: Time;
  endTime: Time;
  description: string;
  task: string;
  type: 'activity' | 'text';
};

export type FormattedDate = string & { __formattedDate__: void };
export type Time = '' | `${ number }${ number }:${ number }${ number }`;
