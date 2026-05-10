import { Calendar, Clock, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileNavProps {
  activeTab: 'schedule' | 'requests' | 'settings';
  onChangeTab: (tab: 'schedule' | 'requests' | 'settings') => void;
}

export function MobileNav({ activeTab, onChangeTab }: MobileNavProps) {
  const tabs = [
    { id: 'schedule' as const, label: 'ตารางงาน', icon: Calendar },
    { id: 'requests' as const, label: 'คำขอลา', icon: Clock },
    { id: 'settings' as const, label: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-bg-panel/80 backdrop-blur-xl border-t border-white/[0.08] px-6 py-2 flex justify-between items-center z-50 safe-bottom">

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={cn(
              'flex flex-col items-center gap-1 py-1.5 px-4 rounded-lg transition-all duration-200',
              isActive
                ? 'text-brand-accent'
                : 'text-text-quaternary hover:text-text-tertiary'
            )}
          >
            <tab.icon
              className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')}
            />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
