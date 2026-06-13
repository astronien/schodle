import { format } from 'date-fns';
import { cn } from '../lib/utils';
import type { ActiveEditor } from '../hooks/useRealtime';

interface CollaborationStatusProps {
  activeEditors: ActiveEditor[];
  syncedAt: Date | null;
  isLive: boolean;
  className?: string;
}

export function CollaborationStatus({
  activeEditors,
  syncedAt,
  isLive,
  className,
}: CollaborationStatusProps) {
  const visibleEditors = activeEditors.slice(0, 3);
  const extraCount = activeEditors.length - visibleEditors.length;

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isLive ? 'bg-success animate-pulse' : 'bg-text-quaternary',
          )}
        />
        <span className={cn(
          'font-semibold',
          isLive ? 'text-success' : 'text-text-quaternary',
        )}>
          {isLive ? 'Live' : 'Disconnected'}
        </span>
      </div>

      {syncedAt && (
        <span className="text-text-quaternary">
          {format(syncedAt, 'HH:mm:ss')}
        </span>
      )}

      {visibleEditors.length > 0 && (
        <div className="flex items-center gap-1.5 ml-1">
          <div className="flex -space-x-1.5">
            {visibleEditors.map((editor) => (
              <div
                key={editor.id}
                className="w-5 h-5 rounded-full bg-brand/20 border-2 border-bg-surface flex items-center justify-center text-[8px] font-bold text-brand"
                title={`${editor.name} (${editor.role === 'manager' ? 'ผู้จัดการ' : 'พนักงาน'})`}
              >
                {editor.name.charAt(0)}
              </div>
            ))}
          </div>
          <span className="text-text-tertiary">
            {visibleEditors.map((e) => e.name).join(', ')}
            {extraCount > 0 && ` +${extraCount}`}
          </span>
        </div>
      )}
    </div>
  );
}
