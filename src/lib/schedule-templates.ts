import type { ScheduleEntry } from '../types';

export type ShiftPattern = {
  employeeId: string;
  shiftsByDay: Record<number, string>; // dayOfWeek (0=Sun) -> shiftTypeId
};

export type ScheduleTemplate = {
  id: string;
  name: string;
  patterns: ShiftPattern[];
  createdAt: string;
};

const STORAGE_KEY = 'schodle_templates';

export function loadTemplates(): ScheduleTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: ScheduleTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function createTemplateFromSchedules(
  name: string,
  schedules: ScheduleEntry[],
  monthDate: Date,
): ScheduleTemplate {
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

  return {
    id: crypto.randomUUID(),
    name,
    patterns,
    createdAt: new Date().toISOString(),
  };
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

export function deleteTemplate(id: string) {
  const templates = loadTemplates().filter((t) => t.id !== id);
  saveTemplates(templates);
}
