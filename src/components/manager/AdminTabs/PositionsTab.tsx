import { useState } from 'react';
import { Trash2, Check, Plus } from 'lucide-react';
import { CreatePositionModal } from '../Modals/CreationModals';
import { getDiceBearAvatar } from '../../../lib/validators';
import { useToast } from '../../../lib/toast';
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

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-72 flex-shrink-0 space-y-5 lg:sticky lg:top-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-warn rounded-full"></div>
            <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
              พนักงานรอจัดตำแหน่ง
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-danger/10', 'border-danger/40', 'scale-[1.02]');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('bg-danger/10', 'border-danger/40', 'scale-[1.02]');
            }}
            onDrop={handleDropToUnassign}
            className="p-5 border-2 border-dashed border-surface-200 rounded-xl flex flex-col items-center justify-center gap-3 text-text-quaternary transition-all duration-200 hover:border-danger/30 hover:bg-danger/10 group"
          >
            <div className="p-2.5 bg-bg-panel group-hover:bg-danger/15 rounded-xl transition-colors">
              <Trash2 className="w-5 h-5 group-hover:text-danger" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-relaxed">
              ลากมาวางที่นี่
              <br />
              เพื่อยกเลิกตำแหน่ง
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
            {employees.filter((e) => !e.positionId).length > 0 ? (
              employees
                .filter((e) => !e.positionId)
                .map((emp) => (
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
                    className="p-3 bg-bg-surface rounded-xl border border-surface-200 shadow-sm flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-brand-300 hover:shadow-md transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface flex-shrink-0">
                      <img src={emp.avatar || getDiceBearAvatar(emp.fullName)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-text-primary truncate">{emp.fullName}</div>
                      <div className="text-[9px] font-semibold text-text-quaternary uppercase tracking-wider">
                        รอยืนยันตำแหน่ง
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-10 flex flex-col items-center justify-center bg-bg-panel rounded-xl border border-success/20 px-4 text-center">
                <span className="text-xs font-bold text-text-quaternary uppercase tracking-wider">
                  จัดครบทุกคนแล้ว 🎉
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-5 bg-brand rounded-full"></div>
              <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
                การจัดการตำแหน่งงาน
              </span>
            </div>
            <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary text-xs py-2 shadow-raised">
              <Plus className="w-4 h-4" />
              เพิ่มตำแหน่ง
            </button>
          </div>

          <CreatePositionModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={handleCreate} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.map((pos) => {
              const assignedEmployees = employees.filter((e) => e.positionId === pos.id);
              return (
                <div
                  key={pos.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-brand/15', 'border-brand', 'scale-[1.01]');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-brand/15', 'border-brand', 'scale-[1.01]');
                  }}
                  onDrop={(e) => handleDropToPosition(e, pos.id)}
                  className="card p-5 rounded-xl border-2 border-dashed border-surface-200 flex flex-col gap-4 hover:border-brand/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-text-primary leading-tight">{pos.name}</div>
                      <span className="badge bg-brand/15 text-brand-accent border border-brand/20 mt-1.5">
                        {pos.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {assignedEmployees.length > 0 && (
                        <button
                          onClick={() =>
                            employees
                              .filter((e) => e.positionId === pos.id)
                              .forEach((e) => {
                                const fallback = positions[0];
                                if (fallback) {
                                  onUpdateEmployee({ ...e, positionId: fallback.id }).catch(showError);
                                }
                              })
                          }
                          className="p-2 text-text-quaternary hover:text-warn hover:bg-warn/10 rounded-lg transition-all"
                          title="ล้างพนักงานทั้งหมดในตำแหน่งนี้"
                        >
                          <Check className="w-4 h-4 rotate-45" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          onDelete(pos.id)
                            .then(() => toast.success('ลบตำแหน่งสำเร็จ', pos.name))
                            .catch(showError)
                        }
                        className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 min-h-[60px] p-2 bg-bg-panel/50 rounded-lg border border-success/20">
                    {assignedEmployees.length > 0 ? (
                      assignedEmployees.map((emp) => (
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
                          className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-surface rounded-lg shadow-sm border border-success/20 cursor-grab active:cursor-grabbing hover:border-brand/30 transition-all animate-fade-in"
                        >
                          <div className="w-5 h-5 rounded-md overflow-hidden bg-bg-surface">
                            <img src={emp.avatar || getDiceBearAvatar(emp.fullName)} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[11px] font-semibold text-text-secondary">{emp.fullName}</span>
                        </div>
                      ))
                    ) : (
                      <div className="w-full flex items-center justify-center py-5">
                        <span className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">
                          ลากพนักงานมาวาง
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
