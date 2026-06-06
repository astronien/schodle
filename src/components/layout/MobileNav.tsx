import { Calendar, Clock, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileNavProps {
  activeTab: 'schedule' | 'requests' | 'settings';
  onChangeTab: (tab: 'schedule' | 'requests' | 'settings') => void;
}

export function MobileNav({ activeTab, onChangeTab }: MobileNavProps) {
  const tabs = [
    { id: 'schedule' as const, label: 'ตารางงาน', icon: Calendar },
    { id: 'requests' as const, label: 'คำขอ', icon: Clock },
    { id: 'settings' as const, label: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="mx-3 mb-3 flex items-center justify-around gap-2 bg-bg-panel/95 backdrop-blur-xl border border-border-solid shadow-overlay rounded-full px-2 py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              aria-label={tab.label}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-full transition-all duration-200',
                isActive
                  ? 'bg-brand text-white shadow-md'
                  : 'text-text-quaternary hover:text-text-secondary hover:bg-bg-surface',
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
              <span
                className={cn(
                  'text-xs font-semibold whitespace-nowrap',
                  isActive ? 'text-white' : 'text-text-tertiary',
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
