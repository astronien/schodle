import { describe, expect, it } from 'vitest';
import { buildICS } from './calendar-export';

const base = {
  summary: 'กะเช้า (M1)',
  description: 'test',
  location: 'Store',
  uid: 'uid-1@schodle.app',
};

describe('buildICS', () => {
  it('emits a timed event for a shift with fixed hours', () => {
    const ics = buildICS([{ ...base, date: '2026-08-01', startTime: '09:00', endTime: '18:00' }]);
    expect(ics).toContain('DTSTART:20260801T090000');
    expect(ics).toContain('DTEND:20260801T180000');
  });

  it('emits an all-day event when the shift has no fixed hours', () => {
    const ics = buildICS([{ ...base, date: '2026-08-01', startTime: '-', endTime: '-' }]);
    // Regression: this used to produce the invalid "20260801T-00".
    expect(ics).not.toContain('T-00');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260801');
    // DTEND is exclusive → next day.
    expect(ics).toContain('DTEND;VALUE=DATE:20260802');
  });

  it('rolls an all-day event over a month boundary correctly', () => {
    const ics = buildICS([{ ...base, date: '2026-08-31', startTime: '-', endTime: '-' }]);
    expect(ics).toContain('DTEND;VALUE=DATE:20260901');
  });

  it('never emits a datetime containing a stray separator', () => {
    const ics = buildICS([
      { ...base, date: '2026-08-01', startTime: '09:00', endTime: '-' },
      { ...base, date: '2026-08-02', startTime: '-', endTime: '18:00' },
    ]);
    for (const line of ics.split('\r\n')) {
      if (!line.startsWith('DTSTART') && !line.startsWith('DTEND')) continue;
      const value = line.split(':')[1];
      expect(value, `bad datetime in "${line}"`).toMatch(/^\d{8}(T\d{6})?$/);
    }
  });

  it('still produces a well-formed calendar envelope', () => {
    const ics = buildICS([{ ...base, date: '2026-08-01', startTime: '-', endTime: '-' }]);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
  });
});
