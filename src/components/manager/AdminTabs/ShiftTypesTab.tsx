import { useState } from 'react';
import { Trash2, Plus, Clock, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../lib/toast';
import { CreateShiftTypeModal } from '../Modals/CreationModals';
import { AdminPageHeader } from '../AdminSidebar';
import { ConfirmModal } from '../../ConfirmModal';
import type { ShiftType } from '../../../types';

const SHIFT_CATEGORIES: Array<{ id: 'morning' | 'afternoon' | 'other'; label: string }> = [
  { id: 'morning', label: 'เช้า' },
  { id: 'afternoon', label: 'บ่าย' },
  { id: 'other', label: 'อื่นๆ' },
];

const TOGGLEABLE: Array<{
  key: keyof ShiftType;
  label: string;
  activeColor: string;
  description: string;
}> = [
  {
    key: 'requiresApproval',
    label: 'ต้องรออนุมัติ',
    activeColor: 'bg-brand',
    description: 'พนักงานเลือกแล้วรอหัวหน้าอนุมัติ',
  },
  {
    key: 'requiresReason',
    label: 'ต้องใส่เหตุผล',
    activeColor: 'bg-warn',
    description: 'พนักงานต้องระบุเหตุผลประกอบ',
  },
  {
    key: 'requiresEvidence',
    label: 'ต้องแนบรูป',
    activeColor: 'bg-brand',
    description: 'พนักงานต้องแนบรูปหลักฐาน',
  },
  {
    key: 'isLeave',
    label: 'เป็นประเภทการลา',
    activeColor: 'bg-danger',
    description: 'พนักงานสามารถเลือกจากเมนูขอลาได้',
  },
];

interface ShiftTypesTabProps {
  shiftTypes: ShiftType[];
  onCreate: (input: Omit<ShiftType, 'id'>) => Promise<void>;
  onUpdate: (shiftType: ShiftType) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ShiftTypesTab({ shiftTypes, onCreate, onUpdate, onDelete }: ShiftTypesTabProps) {
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ShiftType | null>(null);

  const handleCreate = async (input: Omit<ShiftType, 'id'>) => {
    await onCreate(input);
    setIsCreateOpen(false);
  };

  const showError = (err: unknown) =>
    toast.error('อัปเดตไม่สำเร็จ', err instanceof Error ? err.message : undefined);

  const visible = shiftTypes.filter((t) => t.isVisible);
  const leaveCount = shiftTypes.filter((t) => t.isLeave).length;
  const workCount = shiftTypes.filter((t) => !t.isLeave && t.targetStaff).length;

  return (
    <div className="animate-fade-in">
      <AdminPageHeader
        icon={Clock}
        title="จัดการกะงาน"
        description={`${visible.length} ประเภท · ${leaveCount} กะลา · ${workCount} กะทำงาน`}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary text-xs py-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            เพิ่มกะงาน
          </button>
        }
      />

      <CreateShiftTypeModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      />

      <ConfirmModal
        open={Boolean(deleteConfirm)}
        title="ลบกะงาน"
        message={`ลบกะ "${deleteConfirm?.name || ''}" ? การกระทำนี้ไม่สามารถยกเลิกได้`}
        confirmLabel="ลบ"
        variant="danger"
        onConfirm={async () => {
          if (!deleteConfirm) return;
          const t = deleteConfirm;
          try {
            await onDelete(t.id);
            toast.success('ลบกะงานสำเร็จ', t.name);
          } catch (err: unknown) {
            showError(err);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

      {shiftTypes.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center">
          <div className="w-14 h-14 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-3 text-text-quaternary">
            <Clock className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-text-primary mb-1">ยังไม่มีประเภทกะ</h4>
          <p className="text-xs text-text-tertiary">กดปุ่ม "เพิ่มกะงาน" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {shiftTypes.map((type) => {
            const isExpanded = expandedId === type.id;
            return (
              <div
                key={type.id}
                className="glass-cell rounded-2xl overflow-hidden hover:!bg-white/85 transition-colors"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : type.id)}
                  className="p-4 flex items-center gap-3 cursor-pointer"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm"
                    style={{ backgroundColor: type.color }}
                  >
                    {type.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">
                      {type.name}
                    </p>
                    <p className="text-[11px] text-text-tertiary font-medium">
                      {type.startTime} – {type.endTime}
                      {type.targetStaff ? ` · เป้า ${type.targetStaff} คน` : ''}
                      {type.isLeave ? ' · กะลา' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {TOGGLEABLE.filter((t) => type[t.key]).length > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand/15 text-brand-accent">
                        {TOGGLEABLE.filter((t) => type[t.key]).length} ตั้งค่า
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(type);
                      }}
                      className="p-2 text-danger bg-danger/10 hover:bg-danger/15 rounded-lg transition-colors"
                      aria-label="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-border-solid space-y-4 animate-slide-down">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider mb-1.5">
                          สี
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={type.color}
                            onChange={(e) =>
                              onUpdate({ ...type, color: e.target.value }).catch(showError)
                            }
                            className="h-9 w-14 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                          />
                          <span className="text-xs font-mono text-text-tertiary uppercase">
                            {type.color}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider mb-1.5">
                          เป้าคน
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={type.targetStaff || 0}
                          onChange={(e) =>
                            onUpdate({ ...type, targetStaff: parseInt(e.target.value) || 0 }).catch(
                              showError,
                            )
                          }
                          className="w-full px-3 py-1.5 bg-white/70 border border-border-solid rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider mb-1.5">
                        หมวด AI
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {SHIFT_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => onUpdate({ ...type, category: cat.id }).catch(showError)}
                            className={cn(
                              'py-2 rounded-lg text-xs font-bold transition-all border',
                              type.category === cat.id
                                ? 'bg-brand/20 border-brand/50 text-brand-accent shadow-sm'
                                : 'bg-white/60 border-border-solid text-text-tertiary hover:bg-white/80',
                            )}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {TOGGLEABLE.map((item) => {
                        const value = Boolean(type[item.key]);
                        return (
                          <div
                            key={item.key as string}
                            className="flex items-center justify-between p-2.5 bg-white/60 rounded-lg border border-border-solid"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold text-text-primary leading-none">
                                {item.label}
                              </p>
                              <p className="text-[10px] text-text-tertiary mt-0.5 leading-tight">
                                {item.description}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                onUpdate({ ...type, [item.key]: !value }).catch(showError)
                              }
                              className={cn(
                                'w-11 h-6 rounded-full transition-colors relative shrink-0',
                                value ? item.activeColor : 'bg-bg-elevated',
                              )}
                            >
                              <div
                                className={cn(
                                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all flex items-center justify-center',
                                  value ? 'right-0.5' : 'left-0.5',
                                )}
                              >
                                {value && <Check className="w-3 h-3 text-current" />}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
