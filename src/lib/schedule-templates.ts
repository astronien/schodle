import { dbSelect, dbInsert, dbDelete } from './db-query';
import type { ScheduleEntry } from '../types';

export type ShiftPattern = {
  employeeId: string;
  shiftsByDay: Record<number, string>;
};

export type ScheduleTemplate = {
  id: string;
  name: string;
  patterns: ShiftPattern[];
  createdAt: string;
};

function mapRow(row: any): ScheduleTemplate {
  return {
    id: row.id,
    name: row.name,
    patterns: row.patterns || [],
    createdAt: row.created_at,
  };
}

export async function loadTemplates(): Promise<ScheduleTemplate[]> {
  const { data, error } = await dbSelect<any>('schedule_templates', undefined, '*', { column: 'created_at', ascending: false });
  if (error) {
    console.warn('[schedule-templates] DB load failed, falling back to empty:', error.message);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function createTemplateFromSchedules(
  name: string,
  schedules: ScheduleEntry[],
  monthDate: Date,
): Promise<ScheduleTemplate> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthSchedules = schedules.filter(
    (s) => s.date.startsWith(monthStr) && s.status === 'approved'
  );

  const employeeMap = new Map<string, Record<number, string>>();

  for (const entry of monthSchedules) {
    const date = new Date(entry.date);
    const dayOfWeek = date.getDay();
    if (!employeeMap.has(entry.employeeId)) {
      employeeMap.set(entry.employeeId, {});
    }
    employeeMap.get(entry.employeeId)![dayOfWeek] = entry.shiftTypeId;
  }

  const patterns: ShiftPattern[] = [];
  employeeMap.forEach((shiftsByDay, employeeId) => {
    patterns.push({ employeeId, shiftsByDay });
  });

  const { data, error } = await dbInsert<any>('schedule_templates', {
    name,
    patterns,
  });

  if (error) {
    throw new Error(error.message || 'Failed to save template');
  }

  const row = Array.isArray(data) ? data[0] : data;
  return mapRow(row);
}

export function applyTemplateToMonth(
  template: ScheduleTemplate,
  targetMonth: Date,
  schedules: ScheduleEntry[],
): { employeeId: string; date: string; shiftTypeId: string }[] {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const newAssignments: { employeeId: string; date: string; shiftTypeId: string }[] = [];

  for (const pattern of template.patterns) {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const shiftTypeId = pattern.shiftsByDay[dayOfWeek];

      if (!shiftTypeId) continue;

      const exists = schedules.some(
        (s) => s.employeeId === pattern.employeeId && s.date === dateStr && s.status === 'approved'
      );
      if (!exists) {
        newAssignments.push({
          employeeId: pattern.employeeId,
          date: dateStr,
          shiftTypeId,
        });
      }
    }
  }

  return newAssignments;
}

export async function deleteTemplate(id: string) {
  const { error } = await dbDelete('schedule_templates', { id });
  if (error) {
    throw new Error(error.message || 'Failed to delete template');
  }
}
