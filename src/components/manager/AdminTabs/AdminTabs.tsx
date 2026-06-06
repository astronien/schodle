import { PositionGroupManager } from '../PositionGroupManager';
import type { AppSettings, Employee, Position, PositionGroup, ShiftType } from '../../../types';
import { AdminSidebar, AdminMobileSubTabs } from '../AdminSidebar';
import type { AdminTabId } from '../AdminSidebar';
import { EmployeesTab } from './EmployeesTab';
import { ShiftTypesTab } from './ShiftTypesTab';
import { PositionsTab } from './PositionsTab';
import { SettingsTab } from './SettingsTab';

export type { AdminTabId };

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
  onSendTestPush: () => Promise<{ success: boolean; sent?: number; error?: string }>;
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
  onSendTestPush,
}: AdminTabsProps) {
  const counts: Partial<Record<AdminTabId, number>> = {
    employees: employees.length,
    shifts: shiftTypes.length,
    positions: positions.length,
    groups: positionGroupsForManager.length,
  };

  return (
    <div className="card p-4 sm:p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1.5 h-6 bg-brand rounded-full" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
            จัดการระบบ
          </h2>
          <p className="text-xs text-text-tertiary">
            ตั้งค่าพนักงาน กะงาน ตำแหน่ง และกลุ่มทั้งหมด
          </p>
        </div>
      </div>

      <AdminMobileSubTabs activeTab={activeTab} onChangeTab={onTabChange} counts={counts} />

      <div className="flex gap-4 lg:gap-6 items-start mt-4">
        <AdminSidebar activeTab={activeTab} onChangeTab={onTabChange} counts={counts} />

        <div className="flex-1 min-w-0">
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
              onSendTestPush={onSendTestPush}
            />
          )}
        </div>
      </div>
    </div>
  );
}
