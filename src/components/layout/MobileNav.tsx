import { Calendar, Clock, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileNavProps {
  activeTab: 'schedule' | 'requests' | 'settings';
  onChangeTab: (tab: 'schedule' | 'requests' | 'settings') => void;
  activeView?: 'calendar' | 'coverage';
  onChangeView?: (view: 'calendar' | 'coverage') => void;
}

export function MobileNav({ activeTab, onChangeTab, activeView, onChangeView }: MobileNavProps) {
  const tabs = [
    { id: 'schedule' as const, label: 'ตารางงาน', icon: Calendar },
    { id: 'requests' as const, label: 'คำขอ', icon: Clock },
    { id: 'settings' as const, label: 'ตั้งค่า', icon: Settings },
  ];

  const showViewSwitcher = activeTab === 'schedule' && onChangeView;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom pointer-events-none">
      <div className="mx-3 mb-3 pointer-events-auto">
        {showViewSwitcher && (
          <div className="flex justify-center mb-2">
            <div className="flex bg-white/80 backdrop-blur-xl rounded-full px-1 py-1 shadow-lg border border-white/60">
              <button
                onClick={() => onChangeView('calendar')}
                className={cn(
                  'px-5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200',
                  activeView === 'calendar'
                    ? 'bg-brand text-white shadow-md'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                ของฉัน
              </button>
              <button
                onClick={() => onChangeView('coverage')}
                className={cn(
                  'px-5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200',
                  activeView === 'coverage'
                    ? 'bg-brand text-white shadow-md'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                ทั้งทีม
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-around gap-2 glass-nav rounded-full px-2 py-2">
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
                    : 'text-text-quaternary hover:text-text-secondary hover:bg-white/40',
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
      </div>
    </nav>
  );
}