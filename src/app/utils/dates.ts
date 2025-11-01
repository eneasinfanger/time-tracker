import { FormattedDate } from './models';

export function formatDate(date: Date): FormattedDate {
  return date.toISOString().split('T')[0] as FormattedDate;
}
