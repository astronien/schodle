import { describe, expect, it } from 'vitest';
import {
  NO_FIXED_TIME,
  fromTimeInputValue,
  getDateKey,
  getDayOfWeek,
  getMonthlyOffDates,
  getMonthDays,
  getMonthSchedules,
  isEffectiveOffDay,
  isOffDayForEmployee,
  toTimeInputValue,
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

describe('shift time input helpers', () => {
  it('passes through a well-formed time', () => {
    expect(toTimeInputValue('09:00')).toBe('09:00');
    expect(toTimeInputValue('23:59')).toBe('23:59');
  });

  it('pads a single-digit hour', () => {
    expect(toTimeInputValue('9:30')).toBe('09:30');
  });

  it('drops seconds returned by Postgres time columns', () => {
    expect(toTimeInputValue('08:00:00')).toBe('08:00');
  });

  it('returns empty for shifts with no fixed hours', () => {
    expect(toTimeInputValue('-')).toBe('');
    expect(toTimeInputValue('')).toBe('');
    expect(toTimeInputValue(undefined)).toBe('');
    expect(toTimeInputValue(null)).toBe('');
  });

  it('returns empty for out-of-range or junk values', () => {
    expect(toTimeInputValue('24:00')).toBe('');
    expect(toTimeInputValue('12:75')).toBe('');
    expect(toTimeInputValue('ไม่ระบุ')).toBe('');
  });

  it('converts an input value back to storage form', () => {
    expect(fromTimeInputValue('14:30')).toBe('14:30');
    expect(fromTimeInputValue('')).toBe(NO_FIXED_TIME);
  });

  it('round-trips a no-fixed-hours shift without inventing a time', () => {
    expect(fromTimeInputValue(toTimeInputValue('-'))).toBe('-');
  });
});


describe('isEffectiveOffDay', () => {
  // 2026-10-05 is a Monday (getDay() === 1).
  const monday = new Date(2026, 9, 5);
  const codes: Record<string, string> = { m1: 'M1', x: 'X' };
  const codeOf = (id: string) => codes[id];

  it('shows a manager-assigned work shift on the weekly-off weekday as a work day', () => {
    // The reported bug: weekly off = Monday, manager scheduled M1 → must not read "หยุด".
    expect(isEffectiveOffDay(monday, 1, { status: 'approved', shiftTypeId: 'm1' }, codeOf)).toBe(false);
  });

  it('treats an X shift as off', () => {
    expect(isEffectiveOffDay(monday, 1, { status: 'approved', shiftTypeId: 'x' }, codeOf)).toBe(true);
  });

  it('treats a pending work request as not off', () => {
    expect(isEffectiveOffDay(monday, 1, { status: 'pending', shiftTypeId: 'm1' }, codeOf)).toBe(false);
  });

  it('falls back to the weekly pattern when nothing is scheduled', () => {
    expect(isEffectiveOffDay(monday, 1, undefined, codeOf)).toBe(true);
    expect(isEffectiveOffDay(monday, 2, undefined, codeOf)).toBe(false);
  });

  it('ignores a rejected request and falls back to the pattern', () => {
    expect(isEffectiveOffDay(monday, 1, { status: 'rejected', shiftTypeId: 'm1' }, codeOf)).toBe(true);
  });

  it('marks an X shift as off even on a non-weekly-off weekday', () => {
    expect(isEffectiveOffDay(monday, 3, { status: 'approved', shiftTypeId: 'x' }, codeOf)).toBe(true);
  });

  it('handles employees with no weekly-off day', () => {
    expect(isEffectiveOffDay(monday, undefined, undefined, codeOf)).toBe(false);
  });
});
