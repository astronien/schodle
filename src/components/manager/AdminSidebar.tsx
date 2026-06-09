import { Users, Clock, Briefcase, Tag, Repeat, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

export type AdminTabId = 'employees' | 'shifts' | 'positions' | 'groups' | 'recurring' | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTabId;
  onChangeTab: (tab: AdminTabId) => void;
  counts?: Partial<Record<AdminTabId, number>>;
}

interface TabMeta {
  id: AdminTabId;
  label: string;
  description: string;
  icon: typeof Users;
}

const TABS: TabMeta[] = [
  { id: 'employees', label: 'พนักงาน', description: 'จัดการรายชื่อ', icon: Users },
  { id: 'shifts', label: 'กะงาน', description: 'ประเภทกะ', icon: Clock },
  { id: 'positions', label: 'ตำแหน่ง', description: 'จัดตำแหน่งงาน', icon: Briefcase },
  { id: 'groups', label: 'กลุ่ม', description: 'กลุ่มตำแหน่ง', icon: Tag },
  { id: 'recurring', label: 'ตารางซ้ำ', description: 'กะประจำสัปดาห์', icon: Repeat },
  { id: 'settings', label: 'ตั้งค่าแอป', description: 'ตั้งค่าทั่วไป', icon: SettingsIcon },
];

export function AdminSidebar({ activeTab, onChangeTab, counts }: AdminSidebarProps) {
  return (
    <nav className="hidden md:flex w-60 lg:w-64 flex-shrink-0 flex-col gap-1.5 p-3 glass-cell rounded-2xl h-fit sticky top-4">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count = counts?.[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={cn(
              'group flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 w-full',
              isActive
                ? 'bg-brand text-white shadow-md'
                : 'text-text-secondary hover:bg-white/60',
            )}
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                isActive ? 'bg-white/20' : 'bg-bg-elevated group-hover:bg-white/80',
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-text-tertiary')} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    'text-sm font-semibold truncate',
                    isActive ? 'text-white' : 'text-text-primary',
                  )}
                >
                  {tab.label}
                </p>
                {typeof count === 'number' && count > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                      isActive ? 'bg-white/25 text-white' : 'bg-brand/15 text-brand-accent',
                    )}
                  >
                    {count}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  'text-[10px] font-medium uppercase tracking-wider mt-0.5 truncate',
                  isActive ? 'text-white/75' : 'text-text-quaternary',
                )}
              >
                {tab.description}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

interface AdminMobileSubTabsProps {
  activeTab: AdminTabId;
  onChangeTab: (tab: AdminTabId) => void;
  counts?: Partial<Record<AdminTabId, number>>;
}

export function AdminMobileSubTabs({ activeTab, onChangeTab, counts }: AdminMobileSubTabsProps) {
  return (
    <div className="md:hidden -mx-4 px-4 sticky top-14 z-10 pb-3 pt-2 glass-nav rounded-none border-x-0 border-t-0">
      <div className="flex gap-2 overflow-x-auto custom-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts?.[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all',
                isActive
                  ? 'bg-brand text-white shadow-md'
                  : 'bg-white/60 text-text-secondary',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span
                  className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                    isActive ? 'bg-white/25' : 'bg-brand/15 text-brand-accent',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface AdminPageHeaderProps {
  icon: typeof Users;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ icon: Icon, title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-brand" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-text-primary truncate">{title}</h3>
          {description && (
            <p className="text-xs text-text-tertiary truncate">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
