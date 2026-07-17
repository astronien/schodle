// Month navigation bar (‹ วันนี้ [เดือน] ›) + collaboration status.
// Rendered twice in ManagerDashboard (mobile & desktop) — previously the
// markup was duplicated.
import { addMonths, format, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { CollaborationStatus } from '../CollaborationStatus';
import type { ActiveEditor } from '../../hooks/useRealtime';

interface ManagerMonthNavProps {
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  activeEditors: ActiveEditor[];
  syncedAt: Date | null;
  isLive: boolean;
}

export function ManagerMonthNav({ currentMonth, setCurrentMonth, activeEditors, syncedAt, isLive }: ManagerMonthNavProps) {
  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-3 py-2 rounded-lg bg-bg-surface hover:bg-bg-surface text-text-tertiary hover:text-text-primary transition-colors"
          title="เดือนก่อนหน้า"
        >
          ‹
        </button>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="px-3 py-2 rounded-lg bg-brand/10 text-brand-accent hover:bg-brand/15 transition-colors text-xs font-semibold whitespace-nowrap"
        >
          วันนี้
        </button>
      </div>
      <div className="px-3 py-2 rounded-lg bg-bg-surface border border-white/[0.06] text-sm font-semibold text-text-primary min-w-[130px] text-center">
        {format(currentMonth, 'MMMM yyyy', { locale: th })}
      </div>

      <CollaborationStatus
        activeEditors={activeEditors}
        syncedAt={syncedAt}
        isLive={isLive}
      />

      <button
        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        className="px-3 py-2 rounded-lg bg-bg-surface hover:bg-bg-surface text-text-tertiary hover:text-text-primary transition-colors"
        title="เดือนถัดไป"
      >
        ›
      </button>
    </div>
  );
}
