import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../../types';

interface CoverageViewProps {
  days: Date[];
  employees: Employee[];
  positions: Position[];
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
}

export function CoverageView({ days, employees, positions, schedules, shiftTypes }: CoverageViewProps) {
  return (
    <div className="overflow-auto custom-scrollbar max-h-[65vh]">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-30 bg-bg-panel p-3 sm:p-4 text-left border-b border-success/20 min-w-[140px] sm:min-w-[200px] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
              <span className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">พนักงาน</span>
            </th>
            {days.map((day) => (
              <th
                key={day.toString()}
                className="sticky top-0 z-20 bg-bg-panel p-2 sm:p-3 text-center border-b border-success/20 min-w-[48px] sm:min-w-[56px]"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-text-quaternary uppercase tracking-wider">
                    {format(day, 'EEE', { locale: th })}
                  </span>
                  <span className="text-sm font-bold text-text-primary">{format(day, 'd')}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id} className="group hover:bg-bg-panel/50 transition-colors">
              <td className="sticky left-0 z-10 bg-bg-surface group-hover:bg-bg-panel p-3 sm:p-4 border-b border-white/[0.03] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden bg-bg-surface border border-surface-200 shrink-0">
                    <img
                      src={
                        employee.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.fullName}`
                      }
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-text-primary leading-none mb-1 truncate">
                      {employee.fullName}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-semibold text-text-quaternary uppercase tracking-wider truncate">
                      {positions.find((p) => p.id === employee.positionId)?.code}
                    </div>
                  </div>
                </div>
              </td>
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const shift = schedules.find(
                  (s) => s.employeeId === employee.id && s.date === dateStr && s.status === 'approved'
                );
                const sType = shift ? shiftTypes.find((t) => t.id === shift.shiftTypeId) : null;
                return (
                  <td key={day.toString()} className="p-1 border-b border-white/[0.03]">
                    {shift && sType ? (
                      <div
                        className="w-full h-7 sm:h-9 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: sType.color }}
                      >
                        {sType.code}
                      </div>
                    ) : (
                      <div className="w-full h-7 sm:h-9 rounded-md bg-bg-panel border border-dashed border-surface-200"></div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
