import { useState } from 'react';
import { Search, Plus, Trash2, Calendar, Users, MoreVertical, Pencil } from 'lucide-react';
import { WEEKLY_OFF_DAYS } from '../Modals/WeeklyOffDayEditor';
import { CreateEmployeeModal, EditEmployeeModal } from '../Modals/CreationModals';
import { getDiceBearAvatar } from '../../../lib/validators';
import { useToast } from '../../../lib/toast';
import { AdminPageHeader } from '../AdminSidebar';
import { cn } from '../../../lib/utils';
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
  updateEmployee: (employee: Employee) => Promise<void>;
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
  updateEmployee,
}: EmployeesTabProps) {
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = employees.filter((emp) => {
    const haystack = [emp.fullName, emp.employeeCode, emp.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const unassignedCount = employees.filter((e) => !e.positionId).length;

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

  const getPositionName = (id?: string) =>
    positions.find((p) => p.id === id)?.name || '—';
  const getGroupName = (id?: string) =>
    positionGroups.find((g) => g.id === id)?.name || '—';
  const getOffDayLabel = (id?: number) =>
    typeof id === 'number'
      ? WEEKLY_OFF_DAYS.find((d) => d.value === id)?.label
      : null;

  return (
    <div className="animate-fade-in">
      <AdminPageHeader
        icon={Users}
        title="จัดการพนักงาน"
        description={`${filtered.length} / ${employees.length} คน${
          unassignedCount > 0 ? ` · ${unassignedCount} รอจัดตำแหน่ง` : ''
        }`}
        actions={
          <>
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ค้นหาชื่อ รหัส หรืออีเมล"
                className="input-field pl-10 w-full"
              />
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn btn-primary text-xs py-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงาน
            </button>
          </>
        }
      />

      {filtered.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <div className="w-14 h-14 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-3 text-text-quaternary">
            <Users className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-text-primary mb-1">
            {search ? 'ไม่พบพนักงานที่ค้นหา' : 'ยังไม่มีพนักงาน'}
          </h4>
          <p className="text-xs text-text-tertiary">
            {search ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม "เพิ่มพนักงาน" เพื่อเริ่มต้น'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: table-like rows */}
          <div className="hidden md:block glass-cell rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_140px_120px_80px_60px] gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-quaternary border-b border-border-solid">
              <div>พนักงาน</div>
              <div>รหัส</div>
              <div>ตำแหน่ง</div>
              <div>กลุ่ม</div>
              <div>วันหยุด</div>
              <div></div>
            </div>
            {filtered.map((emp) => {
              const offLabel = getOffDayLabel(emp.weeklyOffDay);
              return (
                <button
                  key={emp.id}
                  onClick={() => onOpenWeeklyOff(emp.id)}
                  className="w-full grid grid-cols-[1fr_120px_140px_120px_80px_60px] gap-3 px-4 py-3 items-center text-left hover:bg-white/70 transition-colors border-b border-border-solid last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface border border-border-solid shrink-0">
                      <img
                        src={emp.avatar || getDiceBearAvatar(emp.fullName)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {emp.fullName}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-text-tertiary">
                    {emp.employeeCode}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary truncate">
                    {getPositionName(emp.positionId)}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary truncate">
                    {getGroupName(emp.groupId)}
                  </span>
                  <span className="text-xs font-semibold text-text-tertiary">
                    {offLabel || '—'}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === emp.id ? null : emp.id);
                    }}
                    className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-white/60 rounded-lg transition-colors justify-self-end relative"
                  >
                    <MoreVertical className="w-4 h-4" />
                    {menuOpenId === emp.id && (
                      <div
                        className="absolute right-0 top-full mt-1 z-20 glass-nav rounded-xl p-1 min-w-[140px] shadow-overlay"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-white/60 rounded-lg"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          แก้ไข
                        </button>
                        <button
                          onClick={() => {
                            onOpenWeeklyOff(emp.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-white/60 rounded-lg"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          ตั้งวันหยุด
                        </button>
                        <button
                          onClick={() => {
                            onDeleteEmployee(emp.id)
                              .then(() => {
                                toast.success('ลบพนักงานสำเร็จ', emp.fullName);
                                setMenuOpenId(null);
                              })
                              .catch((err: unknown) =>
                                toast.error(
                                  'ลบพนักงานไม่สำเร็จ',
                                  err instanceof Error ? err.message : undefined,
                                ),
                              );
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          ลบพนักงาน
                        </button>
                      </div>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((emp) => {
              const offLabel = getOffDayLabel(emp.weeklyOffDay);
              return (
                <div
                  key={emp.id}
                  className="glass-cell rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <div
                    onClick={() => onOpenWeeklyOff(emp.id)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg-surface border border-border-solid shrink-0">
                      <img
                        src={emp.avatar || getDiceBearAvatar(emp.fullName)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {emp.fullName}
                      </p>
                      <p className="text-[10px] font-mono text-text-quaternary">
                        {emp.employeeCode}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-md',
                            emp.positionId
                              ? 'bg-brand/15 text-brand-accent'
                              : 'bg-warn/15 text-warn',
                          )}
                        >
                          {getPositionName(emp.positionId)}
                        </span>
                        {offLabel && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-bg-elevated text-text-tertiary">
                            หยุด {offLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingEmployee(emp)}
                      className="p-2 text-brand bg-brand/10 rounded-lg"
                      aria-label="แก้ไข"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`ลบพนักงาน "${emp.fullName}" ?`)) {
                          onDeleteEmployee(emp.id)
                            .then(() => toast.success('ลบพนักงานสำเร็จ', emp.fullName))
                            .catch((err: unknown) =>
                              toast.error(
                                'ลบพนักงานไม่สำเร็จ',
                                err instanceof Error ? err.message : undefined,
                              ),
                            );
                        }
                      }}
                      className="p-2 text-danger bg-danger/10 rounded-lg"
                      aria-label="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <CreateEmployeeModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
        positionGroups={positionGroups}
      />

      <EditEmployeeModal
        open={Boolean(editingEmployee)}
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onUpdate={updateEmployee}
        positions={positions}
        positionGroups={positionGroups}
      />
    </div>
  );
}
