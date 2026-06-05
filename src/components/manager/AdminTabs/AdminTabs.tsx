import { cn } from '../../../lib/utils';
import { PositionGroupManager } from '../PositionGroupManager';
import type { AppSettings, Employee, Position, PositionGroup, ShiftType } from '../../../types';
import { EmployeesTab } from './EmployeesTab';
import { ShiftTypesTab } from './ShiftTypesTab';
import { PositionsTab } from './PositionsTab';
import { SettingsTab } from './SettingsTab';

export type AdminTabId = 'employees' | 'shifts' | 'positions' | 'groups' | 'settings';

const ADMIN_TABS: Array<{ id: AdminTabId; label: string }> = [
  { id: 'employees', label: 'พนักงาน' },
  { id: 'shifts', label: 'กะงาน' },
  { id: 'positions', label: 'ตำแหน่ง' },
  { id: 'groups', label: 'กลุ่ม' },
  { id: 'settings', label: 'ตั้งค่าแอป' },
];

interface AdminTabsProps {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;

  // Employees
  employees: Employee[];
  positions: Position[];
  positionGroups: PositionGroup[];
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
  onOpenWeeklyOff: (employeeId: string) => void;
  onDeleteEmployee: (id: string) => Promise<void>;
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;

  // Shifts
  shiftTypes: ShiftType[];
  createShiftType: (shiftType: Omit<ShiftType, 'id'>) => Promise<void>;
  updateShiftType: (shiftType: ShiftType) => Promise<void>;
  deleteShiftType: (id: string) => Promise<void>;

  // Positions
  createPosition: (position: Omit<Position, 'id'>) => Promise<void>;
  updatePosition: (position: Position) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;

  // Groups
  positionGroupsForManager: PositionGroup[];
  createPositionGroup: (group: Omit<PositionGroup, 'id'>) => Promise<void>;
  updatePositionGroup: (group: PositionGroup) => Promise<void>;
  deletePositionGroup: (id: string) => Promise<void>;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => Promise<void>;
  isSubscribing: boolean;
  onEnableNotifications: () => Promise<void>;
}

export function AdminTabs({
  activeTab,
  onTabChange,
  employees,
  positions,
  positionGroups,
  employeeSearch,
  onEmployeeSearchChange,
  onOpenWeeklyOff,
  onDeleteEmployee,
  createEmployee,
  shiftTypes,
  createShiftType,
  updateShiftType,
  deleteShiftType,
  createPosition,
  updatePosition,
  deletePosition,
  updateEmployee,
  positionGroupsForManager,
  createPositionGroup,
  updatePositionGroup,
  deletePositionGroup,
  settings,
  updateSettings,
  isSubscribing,
  onEnableNotifications,
}: AdminTabsProps) {
  return (
    <div className="card p-5 sm:p-6 rounded-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-brand rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
            จัดการระบบ
          </h2>
        </div>
        <div className="flex bg-bg-surface p-1 rounded-lg">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all',
                activeTab === tab.id
                  ? 'bg-bg-surface text-brand-accent shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'employees' && (
        <EmployeesTab
          employees={employees}
          positions={positions}
          positionGroups={positionGroups}
          search={employeeSearch}
          onSearchChange={onEmployeeSearchChange}
          onOpenWeeklyOff={onOpenWeeklyOff}
          onDeleteEmployee={onDeleteEmployee}
          createEmployee={createEmployee}
        />
      )}

      {activeTab === 'shifts' && (
        <ShiftTypesTab
          shiftTypes={shiftTypes}
          onCreate={createShiftType}
          onUpdate={updateShiftType}
          onDelete={deleteShiftType}
        />
      )}

      {activeTab === 'positions' && (
        <PositionsTab
          employees={employees}
          positions={positions}
          onCreate={createPosition}
          onUpdate={updatePosition}
          onDelete={deletePosition}
          onUpdateEmployee={updateEmployee}
        />
      )}

      {activeTab === 'groups' && (
        <PositionGroupManager
          groups={positionGroupsForManager}
          employees={employees}
          createGroup={createPositionGroup}
          updateGroup={updatePositionGroup}
          deleteGroup={deletePositionGroup}
          updateEmployee={updateEmployee}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          settings={settings}
          onSave={updateSettings}
          onEnableNotifications={onEnableNotifications}
          isSubscribing={isSubscribing}
        />
      )}
    </div>
  );
}
