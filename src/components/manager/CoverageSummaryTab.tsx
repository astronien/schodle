import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { Employee, Position, ScheduleEntry } from '../../types';

interface CoverageSummaryTabProps {
  schedules: ScheduleEntry[];
  employees: Employee[];
  positions: Position[];
}

export function CoverageSummaryTab({
  schedules,
  employees,
  positions,
}: CoverageSummaryTabProps) {
  const positionStats = useMemo(() => {
    const totalDays = 30;

    return positions.map((pos) => {
      const posEmployees = employees.filter((e) => e.positionId === pos.id);
      const posEmployeeIds = new Set(posEmployees.map((e) => e.id));

      const coveredDays = new Set<string>();
      schedules
        .filter(
          (s) =>
            s.status === 'approved' &&
            posEmployeeIds.has(s.employeeId),
        )
        .forEach((s) => coveredDays.add(s.date));

      const count = coveredDays.size;
      const pct = Math.round((count / totalDays) * 100);

      return {
        position: pos,
        count,
        totalDays,
        pct,
        employeeCount: posEmployees.length,
      };
    });
  }, [positions, employees, schedules]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {positionStats.map((stat) => (
          <div
            key={stat.position.id}
            className="card p-4 rounded-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text-tertiary uppercase tracking-wider">
                {stat.position.code}
              </span>
              <span
                className={cn(
                  'text-lg font-bold',
                  stat.pct >= 50 ? 'text-success' : 'text-danger',
                )}
              >
                {stat.pct}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  stat.pct >= 50 ? 'bg-success' : 'bg-danger',
                )}
                style={{ width: `${stat.pct}%` }}
              />
            </div>

            <p className="text-[10px] text-text-quaternary font-medium">
              {stat.count}/{stat.totalDays} วัน · {stat.position.name}
            </p>
          </div>
        ))}
    </div>
  );
}
