import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { WEEKLY_OFF_DAYS } from '../Modals/WeeklyOffDayEditor';
import { CreateEmployeeModal } from '../Modals/CreationModals';
import { getDiceBearAvatar } from '../../../lib/validators';
import { useToast } from '../../../lib/toast';
import type { Employee, Position, PositionGroup } from '../../../types';

interface EmployeesTabProps {
  employees: Employee[];
  positions: Position[];
  positionGroups: PositionGroup[];
  search: string;
  onSearchChange: (value: string) => void;
  onOpenWeeklyOff: (employeeId: string) => void;
  onDeleteEmployee: (id: string) => Promise<void>;
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
}

export function EmployeesTab({
  employees,
  positions,
  positionGroups,
  search,
  onSearchChange,
  onOpenWeeklyOff,
  onDeleteEmployee,
  createEmployee,
}: EmployeesTabProps) {
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filtered = employees.filter((emp) => {
    const haystack = [emp.fullName, emp.employeeCode, emp.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const handleCreate = async (input: { fullName: string; employeeCode: string; groupId?: string }) => {
    const defaultPos = positions.find((p) => p.code === 'Cashier') || positions[0];
    if (!defaultPos) {
      throw new Error('ไม่พบตำแหน่งงาน กรุณาเพิ่มตำแหน่งก่อน');
    }
    await createEmployee({
      fullName: input.fullName,
      employeeCode: input.employeeCode,
      positionId: defaultPos.id,
      groupId: input.groupId,
      role: 'employee',
      email: `${input.employeeCode}@example.com`,
      avatar: getDiceBearAvatar(input.fullName),
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <span className="text-sm font-medium text-text-tertiary">
          รายชื่อพนักงานทั้งหมด ({filtered.length} / {employees.length} ท่าน)
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาพนักงาน"
            className="input-field w-full sm:w-64"
          />
          <button onClick={() => onSearchChange('')} className="btn btn-ghost text-xs whitespace-nowrap">
            ล้าง
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary text-xs py-2 whitespace-nowrap"
          >
            + เพิ่มพนักงาน
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            onClick={() => onOpenWeeklyOff(emp.id)}
            className="group p-3 bg-bg-panel rounded-xl border border-success/20 flex items-center justify-between hover:border-brand/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface border border-surface-200">
                <img src={emp.avatar || getDiceBearAvatar(emp.fullName)} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-xs font-bold text-text-primary">{emp.fullName}</div>
                <div className="text-[9px] font-semibold text-text-quaternary uppercase tracking-wider">
                  {emp.employeeCode}
                </div>
                {typeof emp.weeklyOffDay === 'number' && (
                  <div className="mt-1 text-[9px] font-semibold text-text-tertiary uppercase tracking-wider">
                    หยุด: {WEEKLY_OFF_DAYS.find((d) => d.value === emp.weeklyOffDay)?.label}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEmployee(emp.id)
                  .then(() => toast.success('ลบพนักงานสำเร็จ', emp.fullName))
                  .catch((err: unknown) => toast.error('ลบพนักงานไม่สำเร็จ', err instanceof Error ? err.message : undefined));
              }}
              className="opacity-0 group-hover:opacity-100 p-2 text-danger hover:bg-danger/10 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <CreateEmployeeModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
        positionGroups={positionGroups}
      />
    </div>
  );
}
