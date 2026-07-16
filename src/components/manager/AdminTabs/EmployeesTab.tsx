import { useState } from 'react';
import { Search, Plus, Trash2, Calendar, Users, MoreVertical, Pencil, CheckSquare, Square, UserCog, KeyRound } from 'lucide-react';
import { WEEKLY_OFF_DAYS } from '../Modals/WeeklyOffDayEditor';
import { CreateEmployeeModal, EditEmployeeModal } from '../Modals/CreationModals';
import { getDiceBearAvatar } from '../../../lib/validators';
import { useToast } from '../../../lib/toast';
import { AdminPageHeader } from '../AdminSidebar';
import { ConfirmModal } from '../../ConfirmModal';
import { Modal } from '../../Modal';
import { SafeAvatar } from '../../../lib/safe-avatar';
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
  resetEmployeePassword: (employee: Employee) => Promise<void>;
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
  resetEmployeePassword,
}: EmployeesTabProps) {
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPositionId, setBulkPositionId] = useState('');
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<Employee | null>(null);

  const filtered = employees.filter((emp) => {
    const haystack = [emp.fullName, emp.employeeCode, emp.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const unassignedCount = employees.filter((e) => !e.positionId).length;
  const selectedCount = selectedIds.size;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkPositionId || selectedIds.size === 0) return;
    setIsBulkAssigning(true);
    try {
      const pos = positions.find((p) => p.id === bulkPositionId);
      const empNames: string[] = [];
      for (const id of selectedIds) {
        const emp = employees.find((e) => e.id === id);
        if (emp) {
          await updateEmployee({ ...emp, positionId: bulkPositionId });
          empNames.push(emp.fullName);
        }
      }
      toast.success(`จัดตำแหน่งสำเร็จ ${empNames.length} คน`, pos?.name);
      setSelectedIds(new Set());
      setShowBulkAssign(false);
      setBulkPositionId('');
    } catch (err: unknown) {
      toast.error('จัดตำแหน่งไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      let failed = 0;
      for (const id of selectedIds) {
        try {
          await onDeleteEmployee(id);
        } catch {
          failed += 1;
        }
      }
      const count = selectedIds.size - failed;
      if (count > 0) toast.success(`ลบพนักงานสำเร็จ ${count} คน`);
      if (failed > 0) toast.error(`ลบไม่สำเร็จ ${failed} คน`);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      toast.error('ลบไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsBulkDeleting(false);
    }
  };

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

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="animate-fade-in">
      <AdminPageHeader
        icon={Users}
        title="จัดการพนักงาน"
        description={`${filtered.length} / ${employees.length} คน${
          unassignedCount > 0 ? ` · ${unassignedCount} รอจัดตำแหน่ง` : ''
        }${hasSelection ? ` · เลือก ${selectedCount} คน` : ''}`}
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

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="mb-4 p-3 rounded-2xl bg-brand/10 border border-brand/20 flex flex-wrap items-center gap-3 animate-slide-up">
          <span className="text-xs font-bold text-brand">
            เลือก {selectedCount} คน
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              onClick={() => setShowBulkAssign(true)}
              className="btn btn-secondary text-xs py-2"
            >
              <UserCog className="w-4 h-4" />
              จัดตำแหน่ง
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              disabled={isBulkDeleting}
              className="btn text-xs py-2 bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20"
            >
              {isBulkDeleting ? (
                <span className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              ลบทั้งหมด
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="btn btn-ghost text-xs py-2"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Bulk assign position modal */}
      <Modal open={showBulkAssign} onClose={() => setShowBulkAssign(false)} size="sm" showCloseButton={false}>
        <div className="p-5">
          <h3 className="text-base font-bold text-text-primary mb-1">จัดตำแหน่งให้ {selectedCount} คน</h3>
          <p className="text-xs text-text-tertiary mb-4">เลือกตำแหน่งที่ต้องการ assign</p>
          <select
            value={bulkPositionId}
            onChange={(e) => setBulkPositionId(e.target.value)}
            className="input-field w-full mb-4"
          >
            <option value="">-- เลือกตำแหน่ง --</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkAssign(false)}
              className="flex-1 py-3 bg-bg-elevated text-text-tertiary border border-border-solid rounded-xl text-sm font-semibold hover:bg-white/80 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleBulkAssign}
              disabled={!bulkPositionId || isBulkAssigning}
              className="flex-1 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isBulkAssigning ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>ยืนยัน</>
              )}
            </button>
          </div>
        </div>
      </Modal>

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
          <div className="hidden md:block glass-cell rounded-2xl [&>div:first-child]:rounded-t-2xl [&>div:last-child]:rounded-b-2xl">
            <div className="grid grid-cols-[32px_1fr_120px_140px_120px_80px_60px] gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-quaternary border-b border-border-solid items-center">
              <button
                onClick={toggleSelectAll}
                className="flex items-center justify-center"
              >
                {selectedIds.size === filtered.length && filtered.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-brand" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <div>พนักงาน</div>
              <div>รหัส</div>
              <div>ตำแหน่ง</div>
              <div>กลุ่ม</div>
              <div>วันหยุด</div>
              <div></div>
            </div>
            {filtered.map((emp) => {
              const offLabel = getOffDayLabel(emp.weeklyOffDay);
              const isSelected = selectedIds.has(emp.id);
              return (
                <div
                  key={emp.id}
                  className={cn(
                    'w-full grid grid-cols-[32px_1fr_120px_140px_120px_80px_60px] gap-3 px-4 py-3 items-center text-left border-b border-border-solid last:border-0 transition-colors',
                    isSelected ? 'bg-brand/5' : 'hover:bg-white/70',
                  )}
                >
                  <button
                    onClick={() => toggleSelect(emp.id)}
                    className="flex items-center justify-center"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand" />
                    ) : (
                      <Square className="w-4 h-4 text-text-quaternary" />
                    )}
                  </button>
                  <button
                    onClick={() => onOpenWeeklyOff(emp.id)}
                    className="flex items-center gap-3 min-w-0"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface border border-border-solid shrink-0">
                      <SafeAvatar
                        src={emp.avatar}
                        name={emp.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {emp.fullName}
                    </span>
                  </button>
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
                    className="p-2 min-h-[36px] min-w-[36px] text-text-tertiary hover:text-text-primary hover:bg-white/60 rounded-lg transition-colors justify-self-end relative"
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
                            setResetPasswordEmployee(emp);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-white/60 rounded-lg"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          รีเซ็ตรหัสผ่าน
                        </button>
                        <button
                          onClick={() => {
                            setSingleDeleteId(emp.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          ลบพนักงาน
                        </button>
                      </div>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((emp) => {
              const offLabel = getOffDayLabel(emp.weeklyOffDay);
              const isSelected = selectedIds.has(emp.id);
              return (
                <div
                  key={emp.id}
                  className={cn(
                    'glass-cell rounded-2xl p-3.5 flex items-center gap-3 transition-colors',
                    isSelected && 'ring-1 ring-brand bg-brand/5',
                  )}
                >
                  <button
                    onClick={() => toggleSelect(emp.id)}
                    className="shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-brand" />
                    ) : (
                      <Square className="w-5 h-5 text-text-quaternary" />
                    )}
                  </button>
                  <div
                    onClick={() => onOpenWeeklyOff(emp.id)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg-surface border border-border-solid shrink-0">
                      <SafeAvatar
                        src={emp.avatar}
                        name={emp.fullName}
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
                      onClick={() => setResetPasswordEmployee(emp)}
                      className="p-2 text-warn bg-warn/10 rounded-lg"
                      aria-label="รีเซ็ตรหัสผ่าน"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSingleDeleteId(emp.id)}
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

      <ConfirmModal
        open={bulkDeleteConfirm}
        title="ลบพนักงาน"
        message={`ลบพนักงาน ${selectedCount} คน? การกระทำนี้ไม่สามารถยกเลิกได้`}
        confirmLabel="ลบทั้งหมด"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      <ConfirmModal
        open={Boolean(resetPasswordEmployee)}
        title="รีเซ็ตรหัสผ่าน"
        message={`รีเซ็ตรหัสผ่านของ "${resetPasswordEmployee?.fullName || ''}"?\n\nรหัสผ่านใหม่จะเป็นรหัสพนักงาน (${resetPasswordEmployee?.employeeCode || ''}) และระบบจะให้ตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งถัดไป`}
        confirmLabel="รีเซ็ต"
        variant="warning"
        onConfirm={async () => {
          if (!resetPasswordEmployee) return;
          try {
            await resetEmployeePassword(resetPasswordEmployee);
            toast.success('รีเซ็ตรหัสผ่านสำเร็จ', `${resetPasswordEmployee.fullName} ใช้รหัสพนักงาน ${resetPasswordEmployee.employeeCode} เป็นรหัสผ่าน`);
          } catch (err: unknown) {
            toast.error('รีเซ็ตรหัสผ่านไม่สำเร็จ', err instanceof Error ? err.message : undefined);
          }
        }}
        onCancel={() => setResetPasswordEmployee(null)}
      />

      <ConfirmModal
        open={Boolean(singleDeleteId)}
        title="ลบพนักงาน"
        message={`ลบพนักงาน "${employees.find((e) => e.id === singleDeleteId)?.fullName || ''}" ? การกระทำนี้ไม่สามารถยกเลิกได้`}
        confirmLabel="ลบ"
        variant="danger"
        onConfirm={async () => {
          if (!singleDeleteId) return;
          const emp = employees.find((e) => e.id === singleDeleteId);
          try {
            await onDeleteEmployee(singleDeleteId);
            toast.success('ลบพนักงานสำเร็จ', emp?.fullName);
          } catch (err: unknown) {
            toast.error('ลบพนักงานไม่สำเร็จ', err instanceof Error ? err.message : undefined);
          }
        }}
        onCancel={() => setSingleDeleteId(null)}
      />
    </div>
  );
}