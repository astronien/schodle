import { useState } from 'react';
import { Trash2, Plus, Briefcase, Users, UserMinus, X, Check } from 'lucide-react';
import { CreatePositionModal } from '../Modals/CreationModals';
import { useToast } from '../../../lib/toast';
import { AdminPageHeader } from '../AdminSidebar';
import { ConfirmModal } from '../../ConfirmModal';
import { SafeAvatar } from '../../../lib/safe-avatar';
import { cn } from '../../../lib/utils';
import type { Employee, Position } from '../../../types';

interface PositionsTabProps {
  employees: Employee[];
  positions: Position[];
  onCreate: (input: Omit<Position, 'id'>) => Promise<void>;
  onUpdate: (position: Position) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdateEmployee: (employee: Employee) => Promise<void>;
}

export function PositionsTab({
  employees,
  positions,
  onCreate,
  onDelete,
  onUpdateEmployee,
}: PositionsTabProps) {
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mobileAssignPosition, setMobileAssignPosition] = useState<Position | null>(null);
  const [clearConfirm, setClearConfirm] = useState<Position | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Position | null>(null);

  const handleCreate = async (input: Omit<Position, 'id'>) => {
    await onCreate(input);
    setIsCreateOpen(false);
  };

  const showError = (err: unknown) =>
    toast.error('อัปเดตไม่สำเร็จ', err instanceof Error ? err.message : undefined);

  const handleDropToPosition = (e: React.DragEvent<HTMLDivElement>, positionId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-brand/15', 'border-brand', 'scale-[1.01]');
    const employeeId = e.dataTransfer.getData('employeeId');
    if (employeeId) {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (employee) {
        onUpdateEmployee({ ...employee, positionId }).catch(showError);
      }
    }
  };

  const handleDropToUnassign = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-danger/10', 'border-danger/40', 'scale-[1.02]');
    const employeeId = e.dataTransfer.getData('employeeId');
    if (employeeId) {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (employee) {
        const fallback = positions[0];
        if (fallback) {
          onUpdateEmployee({ ...employee, positionId: fallback.id }).catch(showError);
        }
      }
    }
  };

  const unassigned = employees.filter((e) => !e.positionId);

  return (
    <div className="animate-fade-in">
      <AdminPageHeader
        icon={Briefcase}
        title="จัดการตำแหน่ง"
        description={`${positions.length} ตำแหน่ง · ${employees.length - unassigned.length} คนได้รับมอบหมาย${unassigned.length > 0 ? ` · ${unassigned.length} รอจัด` : ''}`}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary text-xs py-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตำแหน่ง
          </button>
        }
      />

      <CreatePositionModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      />

      {positions.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <div className="w-14 h-14 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-3 text-text-quaternary">
            <Briefcase className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-text-primary mb-1">ยังไม่มีตำแหน่ง</h4>
          <p className="text-xs text-text-tertiary">กดปุ่ม "เพิ่มตำแหน่ง" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Unassigned sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-3 lg:sticky lg:top-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-warn rounded-full" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                พนักงานรอจัดตำแหน่ง
              </span>
              {unassigned.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warn/15 text-warn">
                  {unassigned.length}
                </span>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-danger/10', 'border-danger/40', 'scale-[1.02]');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove(
                  'bg-danger/10',
                  'border-danger/40',
                  'scale-[1.02]',
                );
              }}
              onDrop={handleDropToUnassign}
              className="hidden lg:flex p-4 border-2 border-dashed border-border-solid rounded-xl flex-col items-center justify-center gap-2 text-text-quaternary transition-all duration-200 hover:border-danger/30 hover:bg-danger/10 group"
            >
              <div className="p-2 bg-bg-surface group-hover:bg-danger/15 rounded-xl transition-colors">
                <UserMinus className="w-5 h-5 group-hover:text-danger" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-relaxed">
                ลากมาวาง
                <br />
                ยกเลิกตำแหน่ง
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {unassigned.length > 0 ? (
                unassigned.map((emp) => (
                  <div
                    key={emp.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('employeeId', emp.id);
                      e.currentTarget.style.opacity = '0.4';
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    className="p-2.5 glass-cell rounded-xl flex items-center gap-2.5 cursor-grab active:cursor-grabbing hover:!bg-white/85 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-bg-surface border border-border-solid shrink-0">
                      <SafeAvatar
                        src={emp.avatar}
                        name={emp.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {emp.fullName}
                      </p>
                      <p className="text-[9px] font-mono text-text-quaternary">
                        {emp.employeeCode}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 flex flex-col items-center justify-center glass-cell rounded-xl text-center">
                  <Check className="w-5 h-5 text-success mb-1" />
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                    จัดครบทุกคน
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Position grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            {positions.map((pos) => {
              const assigned = employees.filter((e) => e.positionId === pos.id);
              return (
                <div
                  key={pos.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-brand/15', 'border-brand', 'scale-[1.01]');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove(
                      'bg-brand/15',
                      'border-brand',
                      'scale-[1.01]',
                    );
                  }}
                  onDrop={(e) => handleDropToPosition(e, pos.id)}
                  className="glass-cell rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {pos.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="badge bg-brand/15 text-brand-accent border border-brand/20">
                          {pos.code}
                        </span>
                        <span className="text-[10px] font-semibold text-text-tertiary">
                          <Users className="w-3 h-3 inline mr-0.5" />
                          {assigned.length}/{pos.minRequired}+
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {assigned.length > 0 && (
                        <button
                          onClick={() => setClearConfirm(pos)}
                          className="p-2 min-h-[36px] min-w-[36px] text-text-tertiary hover:text-warn hover:bg-warn/10 rounded-lg transition-all"
                          title="ล้างพนักงานทั้งหมด"
                          aria-label="ล้างพนักงาน"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(pos)}
                        className="p-2 min-h-[36px] min-w-[36px] text-danger bg-danger/10 hover:bg-danger/15 rounded-lg transition-colors"
                        aria-label="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[50px] p-2 bg-bg-surface/60 rounded-lg border border-border-solid">
                    {assigned.length > 0 ? (
                      assigned.map((emp) => (
                        <div
                          key={emp.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('employeeId', emp.id);
                            e.currentTarget.style.opacity = '0.4';
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 bg-bg-elevated rounded-md shadow-sm border border-border-solid cursor-grab active:cursor-grabbing hover:!bg-white/80 transition-colors"
                        >
                          <div className="w-4 h-4 rounded overflow-hidden bg-bg-surface shrink-0">
                            <SafeAvatar
                              src={emp.avatar}
                              name={emp.fullName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-text-secondary">
                            {emp.fullName}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="w-full flex items-center justify-center py-2">
                        <span className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">
                          ลากพนักงานมาวาง
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mobile: tap to assign */}
                  <button
                    onClick={() => setMobileAssignPosition(pos)}
                    className="lg:hidden w-full py-2 text-xs font-semibold text-brand-accent bg-brand/10 hover:bg-brand/15 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    เพิ่มพนักงานเข้าตำแหน่งนี้
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mobileAssignPosition && (
        <MobileAssignModal
          position={mobileAssignPosition}
          employees={employees}
          positions={positions}
          onClose={() => setMobileAssignPosition(null)}
          onAssign={(empId, posId) => {
            const emp = employees.find((e) => e.id === empId);
            if (emp) {
              onUpdateEmployee({ ...emp, positionId: posId }).catch(showError);
            }
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(clearConfirm)}
        title="ล้างพนักงานทั้งหมด"
        message={`ล้างพนักงานทั้งหมดในตำแหน่ง "${clearConfirm?.name || ''}" ? พนักงานจะถูกย้ายไปยังตำแหน่งแรก`}
        confirmLabel="ล้างทั้งหมด"
        variant="warning"
        onConfirm={async () => {
          if (!clearConfirm) return;
          const pos = clearConfirm;
          const fallback = positions[0];
          if (fallback && fallback.id !== pos.id) {
            const results = await Promise.allSettled(
              employees
                .filter((e) => e.positionId === pos.id)
                .map((e) => onUpdateEmployee({ ...e, positionId: fallback.id })),
            );
            const failed = results.filter((r) => r.status === 'rejected').length;
            if (failed > 0) {
              toast.error(`ล้างไม่สำเร็จ ${failed} คน`);
            } else {
              toast.success('ล้างตำแหน่งเรียบร้อย', pos.name);
            }
          }
        }}
        onCancel={() => setClearConfirm(null)}
      />

      <ConfirmModal
        open={Boolean(deleteConfirm)}
        title="ลบตำแหน่ง"
        message={`ลบตำแหน่ง "${deleteConfirm?.name || ''}" ? การกระทำนี้ไม่สามารถยกเลิกได้`}
        confirmLabel="ลบ"
        variant="danger"
        onConfirm={async () => {
          if (!deleteConfirm) return;
          const pos = deleteConfirm;
          try {
            await onDelete(pos.id);
            toast.success('ลบตำแหน่งสำเร็จ', pos.name);
          } catch (err: unknown) {
            showError(err);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

interface MobileAssignModalProps {
  position: Position;
  employees: Employee[];
  positions: Position[];
  onClose: () => void;
  onAssign: (empId: string, posId: string) => void;
}

function MobileAssignModal({ position, employees, positions, onClose, onAssign }: MobileAssignModalProps) {
  const candidates = employees.filter((e) => e.positionId !== position.id);
  return (
    <div className="lg:hidden fixed inset-0 z-[100] flex items-end justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full bg-bg-panel rounded-t-2xl shadow-overlay overflow-hidden animate-slide-up border border-border-solid max-h-[85vh] flex flex-col">
        <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mt-3" />
        <div className="p-5 border-b border-border-solid flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary">{position.name}</h3>
            <p className="text-xs text-text-tertiary">เลือกพนักงานเข้าตำแหน่งนี้</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-tertiary hover:text-text-primary bg-bg-surface rounded-lg border border-border-solid"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
          {candidates.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-tertiary">
              พนักงานทุกคนอยู่ในตำแหน่งนี้แล้ว
            </div>
          ) : (
            candidates.map((emp) => {
              const currentPos = positions.find((p) => p.id === emp.positionId);
              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    onAssign(emp.id, position.id);
                    onClose();
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 glass-cell rounded-xl text-left hover:!bg-white/85 transition-colors',
                  )}
                >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-surface border border-border-solid shrink-0">
                      <SafeAvatar
                        src={emp.avatar}
                        name={emp.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {emp.fullName}
                    </p>
                    <p className="text-[10px] font-mono text-text-quaternary">
                      {emp.employeeCode}
                      {currentPos && ` · ${currentPos.name}`}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-brand-accent" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
