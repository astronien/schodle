import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../lib/toast';
import { CreateShiftTypeModal } from '../Modals/CreationModals';
import type { ShiftType } from '../../../types';

const SHIFT_CATEGORIES: Array<{ id: 'morning' | 'afternoon' | 'other'; label: string }> = [
  { id: 'morning', label: 'เช้า' },
  { id: 'afternoon', label: 'บ่าย' },
  { id: 'other', label: 'อื่นๆ' },
];

const TOGGLEABLE: Array<{ key: keyof ShiftType; label: string; activeColor: string }> = [
  { key: 'requiresApproval', label: 'ต้องรออนุมัติ', activeColor: 'bg-brand' },
  { key: 'requiresReason', label: 'ต้องใส่เหตุผล', activeColor: 'bg-warn' },
  { key: 'requiresEvidence', label: 'ต้องแนบรูป', activeColor: 'bg-brand' },
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

  const handleCreate = async (input: Omit<ShiftType, 'id'>) => {
    await onCreate(input);
    setIsCreateOpen(false);
  };

  const showError = (err: unknown) => toast.error('อัปเดตไม่สำเร็จ', err instanceof Error ? err.message : undefined);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <span className="text-sm font-medium text-text-tertiary">
          ประเภทกะงานทั้งหมด ({shiftTypes.length} ประเภท)
        </span>
        <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary text-xs py-2 shadow-raised">
          <Plus className="w-4 h-4" />
          เพิ่มประเภทกะ
        </button>
      </div>

      <CreateShiftTypeModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shiftTypes.map((type) => (
          <div key={type.id} className="card p-5 flex flex-col gap-4 hover:border-brand/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }}></div>
                <div>
                  <span className="text-base font-bold text-text-primary leading-none">{type.code}</span>
                  <p className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider mt-0.5">
                    {type.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  onDelete(type.id)
                    .then(() => toast.success('ลบกะงานสำเร็จ', type.name))
                    .catch(showError)
                }
                className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-bg-panel rounded-xl border border-success/20">
              <span className="text-[10px] font-bold text-text-quaternary uppercase">สี</span>
              <input
                type="color"
                value={type.color}
                onChange={(e) => onUpdate({ ...type, color: e.target.value }).catch(showError)}
                className="h-7 w-12 bg-transparent border-0 p-0 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-bg-panel rounded-xl border border-success/20 flex flex-col items-center">
                <span className="text-[9px] font-bold text-text-quaternary uppercase">เริ่ม</span>
                <span className="text-sm font-bold text-text-secondary">{type.startTime}</span>
              </div>
              <div className="p-2.5 bg-bg-panel rounded-xl border border-success/20 flex flex-col items-center">
                <span className="text-[9px] font-bold text-text-quaternary uppercase">เลิก</span>
                <span className="text-sm font-bold text-text-secondary">{type.endTime}</span>
              </div>
              <div className="p-2.5 bg-brand/15 rounded-xl border border-brand/20 flex flex-col items-center">
                <span className="text-[9px] font-bold text-text-primary uppercase">เป้าคน</span>
                <input
                  type="number"
                  min="0"
                  value={type.targetStaff || 0}
                  onChange={(e) => onUpdate({ ...type, targetStaff: parseInt(e.target.value) || 0 }).catch(showError)}
                  className="w-full bg-transparent text-center text-sm font-bold text-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 py-3 border-t border-white/[0.03]">
              <div className="text-[9px] font-bold text-text-quaternary uppercase tracking-wider mb-1 px-1">
                ประเภทกะสำหรับ AI
              </div>
              <div className="grid grid-cols-3 gap-2 px-1">
                {SHIFT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onUpdate({ ...type, category: cat.id }).catch(showError)}
                    className={cn(
                      'py-1.5 rounded-lg text-[9px] font-bold transition-all border',
                      type.category === cat.id
                        ? 'bg-brand/20 border-brand/50 text-brand-accent shadow-sm'
                        : 'bg-white/5 border-white/5 text-text-quaternary hover:bg-white/10'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-white/[0.03]">
              {TOGGLEABLE.map((item) => {
                const value = type[item.key];
                return (
                  <div
                    key={item.key as string}
                    className="flex items-center justify-between p-2 hover:bg-bg-panel rounded-lg transition-colors"
                  >
                    <span className="text-xs font-bold text-text-tertiary uppercase tracking-wide">
                      {item.label}
                    </span>
                    <button
                      onClick={() => onUpdate({ ...type, [item.key]: !value }).catch(showError)}
                      className={cn('w-10 h-5 rounded-full transition-colors relative', value ? item.activeColor : 'bg-bg-elevated')}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 w-4 h-4 bg-bg-surface rounded-full shadow-sm transition-all',
                          value ? 'right-0.5' : 'left-0.5'
                        )}
                      ></div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
