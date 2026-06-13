import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { AlertTriangle, Users, Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ScheduleEntry, ShiftType } from '../../types';
import type { Employee, Position } from '../../types';

const DAY_NAMES_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

interface CoverageSummaryTabProps {
  currentMonth: Date;
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  employees: Employee[];
  positions: Position[];
}

export function CoverageSummaryTab({
  currentMonth,
  schedules,
  shiftTypes,
  employees,
  positions,
}: CoverageSummaryTabProps) {
  void employees; void positions;
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const days = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd],
  );

  const dailyStats = useMemo(() => {
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dailySchedules = schedules.filter((s) => s.date === dateStr && s.status === 'approved');
      const totalCount = new Set(dailySchedules.map((s) => s.employeeId)).size;
      const morningCount = new Set(
        dailySchedules
          .filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'morning')
          .map((s) => s.employeeId),
      ).size;
      const afternoonCount = new Set(
        dailySchedules
          .filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'afternoon')
          .map((s) => s.employeeId),
      ).size;
      const isImbalanced = Math.abs(morningCount - afternoonCount) > 1;

      const shiftCounts = shiftTypes
        .filter((t) => t.targetStaff && t.targetStaff > 0)
        .map((type) => {
          const count = new Set(
            dailySchedules.filter((s) => s.shiftTypeId === type.id).map((s) => s.employeeId),
          ).size;
          const target = type.targetStaff || 0;
          return { type, count, target, isShort: count < target, isOver: count > target };
        });

      const hasIssue = isImbalanced || shiftCounts.some((s) => s.isShort || s.isOver);

      return {
        day,
        dateStr,
        dayIndex: getDay(day),
        totalCount,
        morningCount,
        afternoonCount,
        isImbalanced,
        shiftCounts,
        hasIssue,
      };
    });
  }, [days, schedules, shiftTypes]);

  const summaryTotals = useMemo(() => {
    const totalShifts = dailyStats.reduce((sum, d) => sum + d.totalCount, 0);
    const avgPerDay = days.length > 0 ? (totalShifts / days.length).toFixed(1) : '0';
    const shortDays = dailyStats.filter((d) => d.shiftCounts.some((s) => s.isShort)).length;
    const imbalancedDays = dailyStats.filter((d) => d.isImbalanced).length;
    return { totalShifts, avgPerDay, shortDays, imbalancedDays };
  }, [dailyStats, days]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-brand rounded-full" />
        <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
          Coverage Summary — {format(currentMonth, 'MMMM yyyy', { locale: th })}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 rounded-xl text-center">
          <Users className="w-5 h-5 text-brand mx-auto mb-1" />
          <p className="text-xl font-bold text-text-primary">{summaryTotals.totalShifts}</p>
          <p className="text-[10px] text-text-quaternary font-semibold">กะทั้งหมด</p>
        </div>
        <div className="card p-4 rounded-xl text-center">
          <p className="text-xl font-bold text-text-primary">{summaryTotals.avgPerDay}</p>
          <p className="text-[10px] text-text-quaternary font-semibold">เฉลี่ย/วัน</p>
        </div>
        <div className="card p-4 rounded-xl text-center">
          <p className="text-xl font-bold text-danger">{summaryTotals.shortDays}</p>
          <p className="text-[10px] text-text-quaternary font-semibold">วันขาดคน</p>
        </div>
        <div className="card p-4 rounded-xl text-center">
          <p className="text-xl font-bold text-warn">{summaryTotals.imbalancedDays}</p>
          <p className="text-[10px] text-text-quaternary font-semibold">วันสัดส่วนไม่สมดุล</p>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-2">
          {dailyStats.map((stat) => (
            <div
              key={stat.dateStr}
              className={cn(
                'card p-3 rounded-xl w-[120px] shrink-0',
                stat.hasIssue && 'ring-1 ring-danger/30',
              )}
            >
              <div className="text-center mb-2">
                <div className="text-[10px] font-bold text-text-quaternary uppercase">
                  {DAY_NAMES_TH[stat.dayIndex]}
                </div>
                <div className={cn(
                  'text-base font-bold',
                  stat.hasIssue ? 'text-danger' : 'text-text-primary',
                )}>
                  {format(stat.day, 'd')}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-2">
                {stat.morningCount > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                    <Sun className="w-3 h-3" />
                    {stat.morningCount}
                  </div>
                )}
                {stat.afternoonCount > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-semibold">
                    <Moon className="w-3 h-3" />
                    {stat.afternoonCount}
                  </div>
                )}
              </div>

              <div className="text-center">
                <span className={cn(
                  'text-lg font-bold',
                  stat.totalCount === 0 ? 'text-text-quaternary' : 'text-text-primary',
                )}>
                  {stat.totalCount}
                </span>
                <span className="text-[10px] text-text-quaternary ml-1">คน</span>
              </div>

              {stat.shiftCounts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border-solid space-y-1">
                  {stat.shiftCounts.map((sc) => (
                    <div key={sc.type.id} className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-bold" style={{ color: sc.type.color }}>
                        {sc.type.code}
                      </span>
                      <span className={cn(
                        'text-[9px] font-bold',
                        sc.isShort ? 'text-danger' : sc.isOver ? 'text-warn' : 'text-success',
                      )}>
                        {sc.count}/{sc.target}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {stat.isImbalanced && (
                <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-bold text-danger bg-danger/10 rounded py-1">
                  <AlertTriangle className="w-3 h-3" />
                  เช้า {stat.morningCount} / บ่าย {stat.afternoonCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
