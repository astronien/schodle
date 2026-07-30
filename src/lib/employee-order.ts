import type { Employee, Position, PositionGroup } from '../types';

/**
 * Ordering of employees in every "list of all employees' shifts" surface
 * (manager coverage grid, employee coverage view, CSV / print / PDF exports).
 *
 * The rules, in order:
 *   1. Employees are bucketed by their position group.
 *   2. Groups are sorted by name (Thai collation), then by id as a tiebreak.
 *   3. Employees with no group — or with a `groupId` pointing at a group that
 *      has since been deleted — land in a catch-all bucket that always sorts
 *      LAST. They are never dropped.
 *   4. Inside a group: position code, then full name, then employee code,
 *      then id. The final `id` tiebreak makes the result a total order, so the
 *      same roster always produces the same output no matter what order it
 *      arrived in.
 *
 * Everything here is pure — no React, no dates, no I/O.
 */

/** Synthetic id for the "no group / group was deleted" bucket. */
export const UNGROUPED_GROUP_ID = '__ungrouped__';

/** Thai label shown for the catch-all bucket. */
export const UNGROUPED_GROUP_LABEL = 'ไม่ได้อยู่กลุ่ม';

export type EmployeeGroupSection = {
  /** A real `PositionGroup.id`, or `UNGROUPED_GROUP_ID`. */
  groupId: string;
  /** Group name, or `UNGROUPED_GROUP_LABEL` for the catch-all bucket. */
  groupName: string;
  /** True for the catch-all bucket (no group, or group no longer exists). */
  isUngrouped: boolean;
  /** Members of this group, already sorted. Never empty. */
  employees: Employee[];
};

const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });

/**
 * Locale-aware compare that still yields a strict total order: when the
 * collator considers two strings equivalent (e.g. case-only differences) we
 * fall back to a plain codepoint compare so the result stays deterministic.
 */
function compareText(a: string, b: string): number {
  const byLocale = collator.compare(a, b);
  if (byLocale !== 0) return byLocale;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Split the roster into position-group sections, ordered for display.
 * Sections are never empty; a section only exists if someone is in it.
 */
export function groupEmployeesForSchedule(
  employees: Employee[],
  positionGroups: PositionGroup[] = [],
  positions: Position[] = [],
): EmployeeGroupSection[] {
  const groupById = new Map<string, PositionGroup>();
  for (const group of positionGroups) {
    if (group?.id) groupById.set(group.id, group);
  }

  const positionCodeById = new Map<string, string>();
  for (const position of positions) {
    if (position?.id) positionCodeById.set(position.id, position.code ?? '');
  }

  const compareEmployees = (a: Employee, b: Employee): number => {
    const codeA = positionCodeById.get(a.positionId) ?? a.positionId ?? '';
    const codeB = positionCodeById.get(b.positionId) ?? b.positionId ?? '';
    return (
      compareText(codeA, codeB) ||
      compareText(a.fullName ?? '', b.fullName ?? '') ||
      compareText(a.employeeCode ?? '', b.employeeCode ?? '') ||
      compareText(a.id ?? '', b.id ?? '')
    );
  };

  const buckets = new Map<string, Employee[]>();
  for (const employee of employees) {
    if (!employee) continue;
    // An unknown groupId (deleted group) is treated exactly like "no group".
    const key =
      employee.groupId && groupById.has(employee.groupId)
        ? employee.groupId
        : UNGROUPED_GROUP_ID;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(employee);
    else buckets.set(key, [employee]);
  }

  const sections: EmployeeGroupSection[] = [];
  for (const [groupId, members] of buckets) {
    if (groupId === UNGROUPED_GROUP_ID) continue;
    sections.push({
      groupId,
      groupName: groupById.get(groupId)?.name ?? UNGROUPED_GROUP_LABEL,
      isUngrouped: false,
      employees: [...members].sort(compareEmployees),
    });
  }

  sections.sort(
    (a, b) => compareText(a.groupName, b.groupName) || compareText(a.groupId, b.groupId),
  );

  const ungrouped = buckets.get(UNGROUPED_GROUP_ID);
  if (ungrouped && ungrouped.length > 0) {
    sections.push({
      groupId: UNGROUPED_GROUP_ID,
      groupName: UNGROUPED_GROUP_LABEL,
      isUngrouped: true,
      employees: [...ungrouped].sort(compareEmployees),
    });
  }

  return sections;
}

/**
 * Flat version of {@link groupEmployeesForSchedule} for consumers that render
 * one plain list of rows (exports, the employee-side table body, ...).
 * Returns a new array; the input is never mutated.
 */
export function orderEmployeesForSchedule(
  employees: Employee[],
  positionGroups: PositionGroup[] = [],
  positions: Position[] = [],
): Employee[] {
  return groupEmployeesForSchedule(employees, positionGroups, positions).flatMap(
    (section) => section.employees,
  );
}
