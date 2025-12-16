import { Duration, FormattedDate } from './models';

export function formatDate(date: Date): FormattedDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` as FormattedDate;
}

export function formatDateToDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
/**
 * @param value yyyy-mm-dd
 */
export function parseISODate(value: `${ number }-${ number }-${ number }` | FormattedDate): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
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
