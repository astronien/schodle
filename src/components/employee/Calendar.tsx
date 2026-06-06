import { format, isSameDay, isToday, startOfMonth } from 'date-fns';
import { XCircle, CheckCircle2, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Employee, ScheduleEntry, ShiftType } from '../../types';

interface CalendarProps {
  days: Date[];
  currentUser: Employee;
  shiftTypes: ShiftType[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  getDaySchedule: (date: Date) => ScheduleEntry | undefined;
}

export function Calendar({
  days,
  currentUser,
  shiftTypes,
  selectedDate,
  onSelectDate,
  getDaySchedule,
}: CalendarProps) {
  const firstDay = startOfMonth(days[0] ?? new Date()).getDay();
  return (
    <>
      <div className="p-2 sm:p-5">
        <div className="grid grid-cols-7 gap-1 mb-2 sm:gap-2 sm:mb-3">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
            <div
              key={day}
              className="text-center text-[10px] sm:text-xs font-semibold text-text-quaternary uppercase tracking-wider py-2"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square"></div>
          ))}

          {days.map((day) => {
            const schedule = getDaySchedule(day);
            const shift = schedule ? shiftTypes.find((t) => t.id === schedule.shiftTypeId) : null;
            const isOffDay =
              typeof currentUser.weeklyOffDay === 'number' && day.getDay() === currentUser.weeklyOffDay;

            return (
              <button
                key={day.toString()}
                onClick={() => !isOffDay && onSelectDate(day)}
                disabled={isOffDay}
                className={cn(
                  'min-h-[3.25rem] sm:aspect-square rounded-lg sm:rounded-lg border flex flex-col items-center justify-center relative transition-all duration-200 px-0.5 py-1.5 sm:py-0',
                  isOffDay
                    ? 'bg-bg-elevated border-border-solid opacity-60 cursor-not-allowed'
                    : isToday(day)
                    ? 'bg-brand/10 border-brand/30'
                    : isSameDay(selectedDate || new Date(0), day)
                    ? 'border-brand ring-1 ring-brand/20'
                    : schedule?.status === 'rejected'
                    ? 'bg-danger/10 border-danger/30'
                    : schedule?.status === 'pending'
                    ? 'bg-warn/10 border-warn/30'
                    : 'bg-bg-surface border-border-solid hover:border-border-solid-light hover:bg-bg-panel',
                )}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      'text-sm sm:text-base font-bold leading-none',
                      isOffDay
                        ? 'text-text-quaternary'
                        : isToday(day)
                        ? 'text-brand'
                        : schedule?.status === 'rejected'
                        ? 'text-danger line-through'
                        : 'text-text-primary',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {schedule?.status === 'approved' && (
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-success" />
                  )}
                  {schedule?.status === 'rejected' && (
                    <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-danger" />
                  )}
                  {schedule?.status === 'pending' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warn opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-warn"></span>
                    </span>
                  )}
                  {schedule?.swapWithId && (
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-brand" />
                  )}
                </div>
                {isOffDay ? (
                  <span className="text-[9px] sm:text-[10px] font-bold text-text-quaternary mt-1">หยุด</span>
                ) : shift ? (
                  <div
                    className={cn(
                      'mt-1 px-1.5 py-px rounded-md text-[9px] sm:text-[10px] font-bold text-white leading-tight',
                      schedule?.status === 'rejected' && 'opacity-40 grayscale',
                    )}
                    style={{ backgroundColor: shift.color }}
                  >
                    {shift.code}
                  </div>
                ) : null}
                {shift && !isOffDay && shift.startTime !== '-' && (
                  <span className="hidden sm:block text-[8px] font-medium text-text-quaternary mt-0.5">
                    {shift.startTime}–{shift.endTime}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 bg-bg-surface/50 border-t border-border-solid flex gap-3 overflow-x-auto custom-scrollbar text-[10px]">
        {shiftTypes
          .filter((t) => t.isVisible)
          .slice(0, 6)
          .map((type) => (
            <div key={type.id} className="flex items-center gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: type.color }}></div>
              <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide whitespace-nowrap">
                {type.code}: {type.name}
              </span>
            </div>
          ))}
      </div>
    </>
  );
}
