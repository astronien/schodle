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
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-bg-panel/90 backdrop-blur-xl border-t border-white/[0.08] px-3 py-2 flex justify-between items-center z-50 safe-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all duration-200',
              isActive
                ? 'text-brand-accent bg-brand/10'
                : 'text-text-quaternary hover:text-text-tertiary hover:bg-white/[0.03]'
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
