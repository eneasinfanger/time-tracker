import { Duration, FormattedDate } from './models';

export function formatDate(date: Date): FormattedDate {
  return date.toISOString().split('T')[0] as FormattedDate;
}

export function addDuration(date: Date, duration: Duration) {
  date.setDate(date.getDate() + duration.weeks * 7 + duration.days);
  date.setHours(date.getHours() + duration.hours);
  date.setMinutes(date.getMinutes() + duration.minutes);
}

export function subtractDuration(date: Date, duration: Duration): Date {
  date.setDate(date.getDate() - duration.weeks * 7 - duration.days);
  date.setHours(date.getHours() - duration.hours);
  date.setMinutes(date.getMinutes() - duration.minutes);
  return date;
}
