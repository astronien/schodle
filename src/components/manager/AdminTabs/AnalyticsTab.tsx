import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  getDay,
} from 'date-fns';
import { BarChart3, Users, CalendarDays, ClipboardList } from 'lucide-react';
import { AdminPageHeader } from '../AdminSidebar';
import { cn } from '../../../lib/utils';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../../../types';

interface AnalyticsTabProps {
  employees: Employee[];
  positions: Position[];
  shiftTypes: ShiftType[];
  schedules: ScheduleEntry[];
  currentMonth: Date;
}

const DAY_NAMES_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export function AnalyticsTab({
  employees,
  positions,
  shiftTypes,
  schedules,
  currentMonth,
}: AnalyticsTabProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthSchedules = useMemo(
    () => schedules.filter((s) => {
      const d = new Date(s.date + 'T00:00:00');
      return d >= monthStart && d <= monthEnd && s.status === 'approved';
    }),
    [schedules, monthStart, monthEnd],
  );

  const shiftTypeMap = useMemo(
    () => Object.fromEntries(shiftTypes.map((st) => [st.id, st])),
    [shiftTypes],
  );

  const positionMap = useMemo(
    () => Object.fromEntries(positions.map((p) => [p.id, p])),
    [positions],
  );

  const scheduleCount = monthSchedules.length;
  const activeEmployees = employees.filter((e) => e.role === 'employee');
  const avgPerEmployee = activeEmployees.length > 0
    ? (scheduleCount / activeEmployees.length).toFixed(1)
    : '0';

  const shiftTypeCounts: Record<string, number> = {};
  const employeeCounts: Record<string, number> = {};
  const employeeShiftTypes: Record<string, Record<string, number>> = {};
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const s of monthSchedules) {
    const st = shiftTypeMap[s.shiftTypeId];
    const code = st?.code || 'ไม่ระบุ';
    shiftTypeCounts[code] = (shiftTypeCounts[code] || 0) + 1;
    employeeCounts[s.employeeId] = (employeeCounts[s.employeeId] || 0) + 1;

    if (!employeeShiftTypes[s.employeeId]) employeeShiftTypes[s.employeeId] = {};
    employeeShiftTypes[s.employeeId][code] = (employeeShiftTypes[s.employeeId][code] || 0) + 1;

    const dayIndex = getDay(new Date(s.date + 'T00:00:00'));
    dayCounts[dayIndex]++;
  }

  const maxCount = Math.max(...Object.values(employeeCounts), 1);

  const sortedEmployees = [...activeEmployees]
    .map((e) => ({
      ...e,
      count: employeeCounts[e.id] || 0,
      position: positionMap[e.positionId],
    }))
    .sort((a, b) => b.count - a.count || a.fullName.localeCompare(b.fullName, 'th'));

  const sortedShiftTypes = Object.entries(shiftTypeCounts)
    .sort((a, b) => b[1] - a[1]);

  const maxDayCount = Math.max(...dayCounts, 1);
  const maxShiftCount = sortedShiftTypes.length > 0 ? sortedShiftTypes[0][1] : 1;

  return (
    <div>
      <AdminPageHeader icon={BarChart3} title="วิเคราะห์ข้อมูล" description="สถิติและภาพรวมการจัดตารางงาน" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: CalendarDays, label: 'กะทั้งหมด', value: scheduleCount, color: 'bg-brand/15 text-brand' },
          { icon: Users, label: 'พนักงาน', value: activeEmployees.length, color: 'bg-blue-500/15 text-blue-600' },
          { icon: ClipboardList, label: 'เฉลี่ย/คน', value: avgPerEmployee, color: 'bg-amber-500/15 text-amber-600' },
          { icon: BarChart3, label: 'ประเภทกะ', value: sortedShiftTypes.length, color: 'bg-emerald-500/15 text-emerald-600' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card p-4 rounded-xl flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', card.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-text-primary">{card.value}</p>
                <p className="text-xs text-text-tertiary truncate">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-4 rounded-xl">
          <h4 className="text-sm font-bold text-text-primary mb-3">
            สัดส่วนกะของพนักงาน
          </h4>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {sortedEmployees.map((emp) => {
              const pct = maxCount > 0 ? (emp.count / maxCount) * 100 : 0;
              return (
                <div key={emp.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-text-primary truncate min-w-0">
                      {emp.fullName}
                    </span>
                    <span className="text-text-tertiary shrink-0 ml-2">{emp.count} กะ</span>
                  </div>
                  <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        emp.position ? 'bg-brand' : 'bg-text-quaternary',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {emp.count > 0 && employeeShiftTypes[emp.id] && (
                    <div className="flex flex-wrap gap-1 mt-0.5 mb-1">
                      {Object.entries(employeeShiftTypes[emp.id]).map(([code, c]) => (
                        <span
                          key={code}
                          className="text-[10px] px-1.5 py-0.5 bg-bg-elevated rounded text-text-tertiary"
                        >
                          {code}×{c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4 rounded-xl">
          <h4 className="text-sm font-bold text-text-primary mb-3">
            การกระจายตามวัน
          </h4>
          <div className="space-y-2">
            {DAY_NAMES_TH.map((name, i) => {
              const pct = maxDayCount > 0 ? (dayCounts[i] / maxDayCount) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-text-primary">{name}</span>
                    <span className="text-text-tertiary">{dayCounts[i]} กะ</span>
                  </div>
                  <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        dayCounts[i] > 0 ? 'bg-blue-500' : 'bg-text-quaternary/30',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sortedShiftTypes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedShiftTypes.map(([code, count]) => {
            const pct = maxShiftCount > 0 ? (count / maxShiftCount) * 100 : 0;
            return (
              <div key={code} className="card p-3 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-text-primary">{code}</span>
                  <span className="text-xs text-text-tertiary">{count} กะ</span>
                </div>
                <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
