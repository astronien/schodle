import { useState } from 'react';
import { PlusCircle, LayoutGrid, Bell, Download, Check, ChevronsLeft, ChevronsRight, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TabId } from './ManagerDashboard';
import type { Conflict } from '../../lib/conflict-validator';

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
  onClearMonth: () => void;
  scheduleCount: number;
  conflicts?: Conflict[];
}

export function ManagerSidebarNav({ activeTab, onTabChange, onGenerateAI, onClearMonth, scheduleCount, conflicts }: ManagerSidebarNavProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [conflictsOpen, setConflictsOpen] = useState(false);

  const errorCount = conflicts?.filter((c) => c.severity === 'error').length ?? 0;
  const warningCount = conflicts?.filter((c) => c.severity === 'warning').length ?? 0;
  const totalConflicts = errorCount + warningCount;

  return (
    <nav
      className={cn(
        'hidden lg:flex flex-col flex-shrink-0 gap-2 p-3 glass-cell rounded-2xl h-fit sticky top-20 transition-all duration-200',
        collapsed ? 'w-[68px]' : 'w-56',
      )}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center w-full py-2 rounded-xl text-text-tertiary hover:text-text-secondary hover:bg-white/60 transition-colors"
        title={collapsed ? 'ขยาย' : 'ย่อ'}
      >
        {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
      </button>

      <div className="h-px bg-border-solid mx-2" />

      {/* AI Button */}
      <button
        onClick={onGenerateAI}
        className={cn(
          'flex items-center gap-3 rounded-xl bg-brand text-white shadow-md hover:bg-brand-hover transition-colors text-sm font-bold w-full',
          collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3',
        )}
        title="จัดตาราง AI"
      >
        <PlusCircle className="w-5 h-5 shrink-0" />
        {!collapsed && <span>จัดตาราง AI</span>}
      </button>

      <div className="h-px bg-border-solid mx-2" />

      {/* Tabs */}
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-3 rounded-xl text-left transition-all duration-150 w-full text-sm font-semibold',
              collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3',
              isActive
                ? 'bg-brand text-white shadow-md'
                : 'text-text-secondary hover:bg-white/60',
            )}
            title={tab.label}
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                isActive ? 'bg-white/20' : 'bg-bg-elevated',
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-text-tertiary')} />
            </div>
            {!collapsed && <span>{tab.label}</span>}
          </button>
        );
      })}

      {/* Conflicts */}
      {totalConflicts > 0 && !collapsed && (
        <>
          <div className="h-px bg-border-solid mx-2" />
          <button
            onClick={() => setConflictsOpen(!conflictsOpen)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/20 hover:bg-danger/15 transition-colors w-full"
          >
            <div className="flex items-center gap-1.5">
              {errorCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-danger">
                  <AlertCircle className="w-3 h-3" />
                  {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-warn">
                  <AlertTriangle className="w-3 h-3" />
                  {warningCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-danger">รายการ</span>
          </button>

          {conflictsOpen && (
            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 -mt-1">
              {conflicts!.slice(0, 30).map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-2 rounded-lg border text-[10px] leading-tight',
                    c.severity === 'error'
                      ? 'bg-danger/5 border-danger/15 text-danger'
                      : 'bg-warn/5 border-warn/15 text-warn',
                  )}
                >
                  <span className="font-bold">{c.date}</span>
                  <span className="mx-1">·</span>
                  {c.message}
                </div>
              ))}
              {conflicts!.length > 30 && (
                <p className="text-[9px] text-text-quaternary text-center py-1">
                  ...และอีก {conflicts!.length - 30} รายการ
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Collapsed conflict badge */}
      {totalConflicts > 0 && collapsed && (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/15 text-danger text-xs font-bold mx-auto"
          title={`${errorCount} ข้อผิดพลาด, ${warningCount} คำเตือน`}
        >
          {totalConflicts}
        </div>
      )}

      {/* Clear month */}
      {!collapsed && scheduleCount > 0 && (
        <>
          <div className="h-px bg-border-solid mx-2" />
          <button
            onClick={onClearMonth}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-colors text-sm font-semibold w-full"
            title="ลบตารางเดือนนี้ทั้งหมด"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>ล้างตารางเดือนนี้</span>
            <span className="ml-auto text-[10px] opacity-60">{scheduleCount} รายการ</span>
          </button>
        </>
      )}

      {collapsed && scheduleCount > 0 && (
        <button
          onClick={onClearMonth}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/10 text-danger mx-auto"
          title="ล้างตารางเดือนนี้"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
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