// "ตั้งค่า" tab for employees — profile, weekly off day, leave stats.
// Extracted from App.tsx.
import { Briefcase, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { getEmployeeMonthlyStats } from '../../lib/schedule-utils';
import { WEEKLY_OFF_DAYS } from '../manager/Modals/WeeklyOffDayEditor';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../../types';

interface EmployeeSettingsTabProps {
  currentUser: Employee;
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  positions: Position[];
  currentMonth: Date;
  onEditWeeklyOffDay: () => void;
}

export function EmployeeSettingsTab({
  currentUser,
  schedules,
  shiftTypes,
  positions,
  currentMonth,
  onEditWeeklyOffDay,
}: EmployeeSettingsTabProps) {
  const stats = getEmployeeMonthlyStats(
    currentUser?.id || '',
    schedules.filter((s) => {
      const d = new Date(`${s.date}T00:00:00`);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    }),
    shiftTypes,
  );
  const weeklyOffLabel = typeof currentUser?.weeklyOffDay === 'number'
    ? WEEKLY_OFF_DAYS.find((d) => d.value === currentUser.weeklyOffDay)?.label || 'ไม่ระบุ'
    : 'ยังไม่ได้ตั้ง';
  const totalLeaveDays = Object.values(stats.counts).reduce((a, b) => a + b, 0);
  const position = positions.find((p) => p.id === currentUser?.positionId);
  const leaveTypesWithQuota = shiftTypes.filter((t) => t.isLeave && t.annualQuota && t.annualQuota > 0);
  const currentYear = currentMonth.getFullYear();
  const yearLeaveApproved = schedules.filter(
    (s) =>
      s.employeeId === currentUser?.id &&
      s.status === 'approved' &&
      new Date(`${s.date}T00:00:00`).getFullYear() === currentYear &&
      shiftTypes.find((t) => t.id === s.shiftTypeId)?.isLeave
  );
  const usedLeaveByType = new Map<string, number>();
  yearLeaveApproved.forEach((s) => {
    usedLeaveByType.set(s.shiftTypeId, (usedLeaveByType.get(s.shiftTypeId) || 0) + 1);
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Profile */}
      <div className="card p-5 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand/15 flex items-center justify-center text-brand font-bold text-lg">
            {currentUser?.fullName?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-text-primary truncate">{currentUser?.fullName}</p>
            <p className="text-xs text-text-tertiary">{currentUser?.employeeCode} · {position?.name || ''}</p>
          </div>
        </div>
      </div>

      {/* Weekly Off Day */}
      <div className="card p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-text-primary">วันหยุดประจำสัปดาห์</h3>
          </div>
          <button
            onClick={onEditWeeklyOffDay}
            className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors flex items-center gap-1"
          >
            แก้ไข <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className={cn(
          'p-3 rounded-xl border',
          typeof currentUser?.weeklyOffDay === 'number'
            ? 'bg-success/10 border-success/20'
            : 'bg-bg-surface border-border-solid',
        )}>
          <p className={cn(
            'text-sm font-bold',
            typeof currentUser?.weeklyOffDay === 'number' ? 'text-success' : 'text-text-tertiary',
          )}>
            {typeof currentUser?.weeklyOffDay === 'number'
              ? 'หยุดทุกวัน' + weeklyOffLabel
              : 'ยังไม่ได้ตั้งวันหยุด'}
          </p>
          <p className="text-[10px] text-text-quaternary mt-1">กะงาน X จะถูกจัดให้อัตโนมัติทุกสัปดาห์</p>
        </div>
      </div>

      {/* Leave Stats */}
      <div className="card p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-bold text-text-primary">
            สรุปวันลา เดือน{format(currentMonth, 'MMMM', { locale: th })}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-bg-surface rounded-xl text-center">
            <p className="text-xl font-bold text-text-primary">{totalLeaveDays}</p>
            <p className="text-[10px] text-text-tertiary font-semibold mt-0.5">ลาทั้งหมด</p>
          </div>
          {shiftTypes.filter((t) => t.isLeave).slice(0, 4).map((t) => {
            const count = stats.counts[t.code] || 0;
            return (
              <div key={t.id} className="p-3 bg-bg-surface rounded-xl text-center">
                <p className="text-xl font-bold" style={{ color: t.color || 'var(--color-text-primary)' }}>{count}</p>
                <p className="text-[10px] text-text-tertiary font-semibold mt-0.5">{t.name}</p>
              </div>
            );
          })}
        </div>
        {totalLeaveDays === 0 && (
          <p className="text-[10px] text-text-quaternary text-center mb-4">เดือนนี้ยังไม่มีวันลา</p>
        )}

        {/* Annual leave balance */}
        {leaveTypesWithQuota.length > 0 && (
          <div className="border-t border-border-solid pt-4">
            <h4 className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider mb-3">
              คงเหลือปี {currentYear}
            </h4>
            <div className="space-y-2.5">
              {leaveTypesWithQuota.map((t) => {
                const used = usedLeaveByType.get(t.id) || 0;
                const quota = t.annualQuota || 0;
                const remaining = Math.max(quota - used, 0);
                const pct = quota > 0 ? (used / quota) * 100 : 0;
                return (
                  <div key={t.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-text-primary">{t.name}</span>
                      <span className="text-[10px] text-text-tertiary">
                        {remaining} / {quota} วัน
                      </span>
                    </div>
                    <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct >= 80 ? 'bg-danger' : pct >= 50 ? 'bg-warn' : 'bg-success',
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
