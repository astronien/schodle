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
    <nav className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 safe-bottom">
      <div className="flex items-center gap-1 bg-bg-panel/95 backdrop-blur-xl border border-border-solid shadow-overlay rounded-full p-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              aria-label={tab.label}
              className={cn(
                'flex items-center justify-center transition-all duration-200',
                isActive
                  ? 'w-10 h-10 rounded-full bg-brand text-white shadow-md'
                  : 'w-10 h-10 rounded-full text-text-quaternary hover:text-text-secondary hover:bg-bg-surface',
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
