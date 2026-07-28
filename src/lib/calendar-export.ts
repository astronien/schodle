import { addDays, format, parseISO } from 'date-fns';
import { toTimeInputValue } from './dates';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../types';

function toICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

interface ShiftEvent {
  date: string;
  startTime: string;
  endTime: string;
  summary: string;
  description: string;
  location: string;
  uid: string;
}

export function buildICS(events: ShiftEvent[]): string {
  const now = toICSDate(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Schodle//Schedule//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    const day = ev.date.replace(/-/g, '');
    const start = toTimeInputValue(ev.startTime);
    const end = toTimeInputValue(ev.endTime);

    // Shifts with no fixed hours (weekly off, leave…) store '-'. Emitting that
    // verbatim produced an invalid DTSTART like "20260801T-00" and broke the
    // whole file, so those become all-day events instead. DTEND is exclusive.
    const timed = start && end;
    const dtStartLine = timed
      ? `DTSTART:${day}T${start.replace(':', '')}00`
      : `DTSTART;VALUE=DATE:${day}`;
    const dtEndLine = timed
      ? `DTEND:${day}T${end.replace(':', '')}00`
      : `DTEND;VALUE=DATE:${format(addDays(parseISO(ev.date), 1), 'yyyyMMdd')}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}`,
      `DTSTAMP:${now}`,
      dtStartLine,
      dtEndLine,
      `SUMMARY:${escapeICS(ev.summary)}`,
      `DESCRIPTION:${escapeICS(ev.description)}`,
      `LOCATION:${escapeICS(ev.location)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportEmployeeScheduleToICS(
  employee: Employee,
  schedules: ScheduleEntry[],
  shiftTypes: ShiftType[],
  positions: Position[],
  monthStart: Date,
  monthEnd: Date,
  storeName: string,
) {
  const position = positions.find((p) => p.id === employee.positionId);
  const monthSchedules = schedules.filter((s) => {
    if (s.employeeId !== employee.id) return false;
    const d = parseISO(s.date);
    return d >= monthStart && d <= monthEnd && s.status === 'approved';
  });

  const events: ShiftEvent[] = monthSchedules.map((s) => {
    const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
    return {
      date: s.date,
      startTime: st?.startTime || '00:00',
      endTime: st?.endTime || '23:59',
      summary: st ? `${st.name} (${st.code})` : 'กะงาน',
      description: `พนักงาน: ${employee.fullName}\nตำแหน่ง: ${position?.name || '-'}\nรหัส: ${employee.employeeCode}\n${st ? `เวลา: ${st.startTime}-${st.endTime}` : ''}`,
      location: storeName,
      uid: `schodle-${s.id}@schodle.app`,
    };
  });

  const ics = buildICS(events);
  const monthLabel = format(monthStart, 'yyyy-MM');
  downloadICS(ics, `schedule-${employee.employeeCode}-${monthLabel}.ics`);
}
