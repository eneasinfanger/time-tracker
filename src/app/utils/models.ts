import { UUID } from './crypto';

export type ActivitySummary = { [p: string]: number };

export type Activity = {
  id: UUID;
  startTime: Time;
  endTime: Time;
  description: string;
  type: 'activity' | 'text';
};

export type FormattedDate = string & { __formattedDate__: void };
export type Time = '' | `${ number }${ number }:${ number }${ number }`;
