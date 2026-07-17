// Dashboard header: title, store name, and the four stat chips.
// Extracted from ManagerDashboard.tsx.
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { filterPendingRequests } from '../../lib/schedule-utils';
import type { ScheduleEntry } from '../../types';

interface ManagerStatsHeaderProps {
  storeName: string;
  schedules: ScheduleEntry[];
}

export function ManagerStatsHeader({ storeName, schedules }: ManagerStatsHeaderProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const pendingRequests = filterPendingRequests(schedules);
  const stats = [
    { label: 'รออนุมัติ', value: pendingRequests.length, tone: 'warn' as const },
    {
      label: 'อนุมัติวันนี้',
      value: schedules.filter((s) => s.status === 'approved' && s.date === today).length,
      tone: 'success' as const,
    },
    { label: 'ตารางที่ใช้งาน', value: schedules.filter((s) => s.status === 'approved').length, tone: 'brand' as const },
    {
      label: 'จุดว่าง',
      value: 0,
      tone: 'danger' as const,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Manager Control</h2>
          <p className="text-text-tertiary font-medium text-xs sm:text-sm">Store: {storeName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
        {stats.map((item) => (
          <div
            key={item.label}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-center bg-bg-surface',
              item.tone === 'warn' && 'border-warn/20',
              item.tone === 'success' && 'border-success/20',
              item.tone === 'brand' && 'border-brand/20',
              item.tone === 'danger' && 'border-danger/20'
            )}
          >
            <div
              className={cn(
                'text-lg font-bold leading-none',
                item.tone === 'warn' && 'text-warn',
                item.tone === 'success' && 'text-success',
                item.tone === 'brand' && 'text-brand-accent',
                item.tone === 'danger' && 'text-danger'
              )}
            >
              {item.value}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-text-quaternary mt-1">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
