import { PlusCircle, LayoutGrid, Bell, Download, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TabId } from './ManagerDashboard';

const TABS: Array<{ id: TabId; label: string; icon: typeof Bell }> = [
  { id: 'coverage', label: 'ตารางรวม', icon: LayoutGrid },
  { id: 'requests', label: 'คำขอ', icon: Bell },
  { id: 'report', label: 'รายงาน', icon: Download },
  { id: 'admin', label: 'จัดการ', icon: Check },
];

interface ManagerSidebarNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onGenerateAI: () => void;
}

export function ManagerSidebarNav({ activeTab, onTabChange, onGenerateAI }: ManagerSidebarNavProps) {
  return (
    <nav className="hidden lg:flex flex-col w-56 flex-shrink-0 gap-2 p-3 glass-cell rounded-2xl h-fit sticky top-20">
      <button
        onClick={onGenerateAI}
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand text-white shadow-md hover:bg-brand-hover transition-colors text-sm font-bold w-full"
      >
        <PlusCircle className="w-5 h-5" />
        จัดตาราง AI
      </button>

      <div className="h-px bg-border-solid mx-2 my-1" />

      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 w-full text-sm font-semibold',
              isActive
                ? 'bg-brand text-white shadow-md'
                : 'text-text-secondary hover:bg-white/60',
            )}
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                isActive ? 'bg-white/20' : 'bg-bg-elevated',
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-text-tertiary')} />
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

interface ManagerMobileTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onGenerateAI: () => void;
}

export function ManagerMobileTabs({ activeTab, onTabChange, onGenerateAI }: ManagerMobileTabsProps) {
  return (
    <div className="lg:hidden flex gap-2 overflow-x-auto custom-scrollbar pb-1">
      <button
        onClick={onGenerateAI}
        className="btn btn-primary text-xs shadow-raised whitespace-nowrap"
      >
        <PlusCircle className="w-4 h-4" />
        จัดตาราง AI
      </button>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'btn text-xs whitespace-nowrap',
              activeTab === tab.id
                ? 'btn-primary'
                : 'btn-ghost',
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
