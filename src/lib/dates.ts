import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';

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
