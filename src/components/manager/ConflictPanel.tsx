import { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Conflict, ConflictSeverity } from '../../lib/conflict-validator';

interface ConflictPanelProps {
  conflicts: Conflict[];
  onDismiss?: () => void;
  compact?: boolean;
}

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const COLORS = {
  error: 'text-danger bg-danger/10 border-danger/20',
  warning: 'text-warn bg-warn/10 border-warn/20',
  info: 'text-brand bg-brand/10 border-brand/20',
} as const;

const LABELS: Record<ConflictSeverity, string> = {
  error: 'ข้อผิดพลาด',
  warning: 'คำเตือน',
  info: 'ข้อมูล',
};

export function ConflictPanel({ conflicts, onDismiss, compact }: ConflictPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const grouped = useMemo(() => {
    const groups: Record<string, Conflict[]> = {};
    for (const c of conflicts) {
      if (!groups[c.date]) groups[c.date] = [];
      groups[c.date].push(c);
    }
    return groups;
  }, [conflicts]);

  if (conflicts.length === 0) return null;

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;

  return (
    <div className="rounded-2xl border border-border-solid bg-bg-panel overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-danger/15 text-danger text-[10px] font-bold">
                <AlertCircle className="w-3 h-3" />
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warn/15 text-warn text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3" />
                {warningCount}
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-text-primary">
            พบ {conflicts.length} รายการ
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onDismiss && (
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-surface"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
          {Object.entries(grouped).map(([date, dateConflicts]) => (
            <div key={date}>
              <p className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider mb-2">
                {date}
              </p>
              <div className="space-y-1.5">
                {dateConflicts.map((c, i) => {
                  const Icon = ICONS[c.severity];
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-2.5 p-2.5 rounded-xl border text-xs',
                        COLORS[c.severity],
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className={cn(
                          'text-[10px] font-bold uppercase',
                          c.severity === 'error' ? 'text-danger' : c.severity === 'warning' ? 'text-warn' : 'text-brand',
                        )}>
                          {LABELS[c.severity]}
                        </span>
                        <p className="text-text-secondary mt-0.5">{c.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}