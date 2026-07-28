import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';

/**
 * Placeholder stored in a shift type's start/end time when the shift has no
 * fixed hours (weekly off, vacation…). `<input type="time">` rejects it, so
 * the two helpers below translate between storage and input form.
 */
export const NO_FIXED_TIME = '-';

/** Stored shift time → a value `<input type="time">` accepts ('' when none). */
export function toTimeInputValue(stored: string | undefined | null): string {
  if (!stored) return '';
  const match = /^(\d{1,2}):(\d{2})/.exec(stored.trim());
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return '';
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

/** `<input type="time">` value → storage form (empty means "no fixed hours"). */
export function fromTimeInputValue(value: string): string {
  return value ? value : NO_FIXED_TIME;
}

export function getMonthDays(month: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
}

export function getMonthSchedules<T extends { date: string }>(items: T[], month: Date): T[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  return items.filter((item) => {
    const d = new Date(item.date);
    return d >= start && d <= end;
  });
}

export function getDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getDayOfWeek(date: Date): number {
  return new Date(`${getDateKey(date)}T00:00:00`).getDay();
}

export function getMonthlyOffDates(month: Date, weeklyOffDay: number): string[] {
  return getMonthDays(month)
    .filter((day) => day.getDay() === weeklyOffDay)
    .map(getDateKey);
}

export function isOffDayForEmployee(date: Date, weeklyOffDay?: number): boolean {
  if (typeof weeklyOffDay !== 'number') return false;
  return date.getDay() === weeklyOffDay;
}

export { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth };
