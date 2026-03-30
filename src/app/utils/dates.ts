import { Duration, ISODate } from './models';

export function formatDateISO(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${ y }-${ m }-${ d }` as ISODate;
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
export function parseISODate(value: `${ number }-${ number }-${ number }` | ISODate): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDuration(date: Date, duration: Duration): Date;
export function addDuration(date: ISODate, duration: Duration): ISODate;
export function addDuration(date: Date | ISODate, duration: Duration): Date | ISODate {
  if (date instanceof Date) {
    const copy = new Date(date);
    copy.setDate(date.getDate() + duration.weeks * 7 + duration.days);
    copy.setHours(date.getHours() + duration.hours);
    copy.setMinutes(date.getMinutes() + duration.minutes);
    return copy;
  }
  return formatDateISO(addDuration(parseISODate(date), duration));
}

export function subtractDuration(date: Date, duration: Duration): Date;
export function subtractDuration(date: ISODate, duration: Duration): ISODate;
export function subtractDuration(date: Date | ISODate, duration: Duration): Date | ISODate {
  if (date instanceof Date) {
    const copy = new Date(date);
    copy.setDate(date.getDate() - duration.weeks * 7 - duration.days);
    copy.setHours(date.getHours() - duration.hours);
    copy.setMinutes(date.getMinutes() - duration.minutes);
    return copy;
  }
  return formatDateISO(subtractDuration(parseISODate(date), duration));
}
