import { describe, expect, it } from 'vitest';
import {
  getDateKey,
  getDayOfWeek,
  getMonthlyOffDates,
  getMonthDays,
  getMonthSchedules,
  isOffDayForEmployee,
} from './dates';

describe('getDateKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(getDateKey(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(getDateKey(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('zero-pads single-digit months and days', () => {
    expect(getDateKey(new Date(2025, 2, 9))).toBe('2025-03-09');
  });
});

describe('getDayOfWeek', () => {
  it('returns 0 for Sunday, 6 for Saturday', () => {
    expect(getDayOfWeek(new Date(2025, 0, 5))).toBe(0); // Sunday
    expect(getDayOfWeek(new Date(2025, 0, 11))).toBe(6); // Saturday
  });

  it('matches native Date.getDay (uses local time)', () => {
    const d = new Date(2025, 5, 15);
    expect(getDayOfWeek(d)).toBe(d.getDay());
  });
});

describe('getMonthDays', () => {
  it('returns all days in a 31-day month', () => {
    const days = getMonthDays(new Date(2025, 0, 1));
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual(new Date(2025, 0, 1));
    expect(days[30]).toEqual(new Date(2025, 0, 31));
  });

  it('returns 28 days for February (non-leap)', () => {
    const days = getMonthDays(new Date(2025, 1, 1));
    expect(days).toHaveLength(28);
  });

  it('returns 29 days for February (leap year)', () => {
    const days = getMonthDays(new Date(2024, 1, 1));
    expect(days).toHaveLength(29);
  });
});

describe('getMonthSchedules', () => {
  const items = [
    { date: '2025-01-15', shift: 'M1' },
    { date: '2025-01-31', shift: 'XC' },
    { date: '2025-02-01', shift: 'M2' },
    { date: '2025-03-15', shift: 'EV' },
  ];

  it('filters to the given month only', () => {
    const result = getMonthSchedules(items, new Date(2025, 0, 1));
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.date)).toEqual(['2025-01-15', '2025-01-31']);
  });

  it('returns empty for month with no items', () => {
    const result = getMonthSchedules(items, new Date(2025, 5, 1));
    expect(result).toEqual([]);
  });

  it('includes both endpoints of the month', () => {
    const result = getMonthSchedules(items, new Date(2025, 0, 1));
    expect(result.map((i) => i.date)).toContain('2025-01-31');
  });
});

describe('getMonthlyOffDates', () => {
  it('returns all Sundays in a month', () => {
    const dates = getMonthlyOffDates(new Date(2025, 0, 1), 0);
    expect(dates.every((d) => d.startsWith('2025-01-'))).toBe(true);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('returns empty array when no days match', () => {
    expect(getMonthlyOffDates(new Date(2025, 0, 1), 7)).toEqual([]);
  });
});

describe('isOffDayForEmployee', () => {
  it('returns true when date.day matches weeklyOffDay', () => {
    const sunday = new Date(2025, 0, 5);
    expect(isOffDayForEmployee(sunday, 0)).toBe(true);
  });

  it('returns false when dates do not match', () => {
    const monday = new Date(2025, 0, 6);
    expect(isOffDayForEmployee(monday, 0)).toBe(false);
  });

  it('returns false when weeklyOffDay is undefined', () => {
    expect(isOffDayForEmployee(new Date(2025, 0, 5), undefined)).toBe(false);
  });
});
