import { useState } from 'react';
import { X, Plus, Check, Pencil } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../lib/toast';
import type { Employee, Position, PositionGroup, ShiftType } from '../../../types';

interface CreateEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { fullName: string; employeeCode: string; groupId?: string }) => Promise<void>;
  positionGroups: PositionGroup[];
}

export function CreateEmployeeModal({ open, onClose, onCreate, positionGroups }: CreateEmployeeModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const reset = () => {
    setName('');
    setCode('');
    setGroupId('');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.warning('กรอกข้อมูลไม่ครบ', 'ต้องระบุทั้งชื่อและรหัสพนักงาน');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreate({ fullName: name.trim(), employeeCode: code.trim(), groupId: groupId || undefined });
      toast.success('เพิ่มพนักงานสำเร็จ', `${name.trim()} (${code.trim()})`);
      reset();
      onClose();
    } catch (err: unknown) {
      toast.error('เพิ่มพนักงานไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay overflow-hidden animate-slide-up border border-white/40">
        <div className="w-10 h-1 bg-text-quaternary/30 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary">เพิ่มพนักงาน</h3>
              <p className="text-xs font-semibold text-text-tertiary mt-0.5">กำหนดชื่อ/รหัสพนักงาน</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/60 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white border border-border-solid transition-colors shrink-0"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ชื่อพนักงาน</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field w-full" placeholder="ชื่อ-นามสกุล" />
            </label>
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">รหัสพนักงาน</div>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field w-full" placeholder="รหัส" />
            </label>
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">กลุ่มตำแหน่ง (Optional)</div>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field w-full">
                <option value="">-- เลือกกลุ่ม (ถ้ามี) --</option>
                {positionGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-bg-elevated text-text-tertiary border border-border-solid rounded-xl text-sm font-semibold hover:bg-white/80 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> บันทึก
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CreatePositionModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: Omit<Position, 'id'>) => Promise<void>;
}

export function CreatePositionModal({ open, onClose, onCreate }: CreatePositionModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const reset = () => {
    setName('');
    setCode('');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.warning('กรอกข้อมูลไม่ครบ', 'ต้องระบุทั้งชื่อและรหัสตำแหน่ง');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreate({ code, name, minRequired: 1 });
      toast.success('เพิ่มตำแหน่งสำเร็จ', `${name} (${code})`);
      reset();
      onClose();
    } catch (err: unknown) {
      toast.error('เพิ่มตำแหน่งไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay overflow-hidden animate-slide-up border border-white/40">
        <div className="w-10 h-1 bg-text-quaternary/30 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary">เพิ่มตำแหน่ง</h3>
              <p className="text-xs font-semibold text-text-tertiary mt-0.5">กำหนดชื่อ/รหัสตำแหน่ง</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/60 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white border border-border-solid transition-colors shrink-0"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ชื่อตำแหน่ง</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field w-full" placeholder="เช่น Cashier" />
            </label>
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">รหัสตำแหน่ง</div>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field w-full" placeholder="เช่น CSR" />
            </label>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-bg-elevated text-text-tertiary border border-border-solid rounded-xl text-sm font-semibold hover:bg-white/80 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> บันทึก
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CATEGORIES: Array<{ id: 'morning' | 'afternoon' | 'other'; label: string }> = [
  { id: 'morning', label: 'กะเช้า' },
  { id: 'afternoon', label: 'กะบ่าย' },
  { id: 'other', label: 'อื่นๆ' },
];

interface CreateShiftTypeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: Omit<ShiftType, 'id'>) => Promise<void>;
}

export function CreateShiftTypeModal({ open, onClose, onCreate }: CreateShiftTypeModalProps) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [color, setColor] = useState('#22c55e');
  const [category, setCategory] = useState<'morning' | 'afternoon' | 'other'>('morning');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const reset = () => {
    setCode('');
    setName('');
    setStartTime('09:00');
    setEndTime('18:00');
    setColor('#22c55e');
    setCategory('morning');
  };

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      toast.warning('กรอกข้อมูลไม่ครบ', 'ต้องระบุทั้งรหัสและชื่อกะ');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreate({
        code: code.trim(),
        name: name.trim(),
        startTime,
        endTime,
        color,
        requiresApproval: false,
        requiresReason: false,
        requiresEvidence: false,
        isVisible: true,
        isLeave: false,
        category,
      });
      toast.success('เพิ่มประเภทกะสำเร็จ', `${name} (${code})`);
      reset();
      onClose();
    } catch (err: unknown) {
      toast.error('เพิ่มกะงานไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay overflow-hidden animate-slide-up border border-white/40">
        <div className="w-10 h-1 bg-text-quaternary/30 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary">เพิ่มประเภทกะ</h3>
              <p className="text-xs font-semibold text-text-tertiary mt-0.5">กำหนดรหัส/ชื่อ/เวลา/สี</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/60 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white border border-border-solid transition-colors shrink-0"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">รหัสกะ</div>
                <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field w-full" placeholder="เช่น X" />
              </label>
              <label className="space-y-1 block">
                <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ชื่อกะ</div>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-field w-full" placeholder="เช่น OFF" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">เริ่ม</div>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field w-full" />
              </label>
              <label className="space-y-1 block">
                <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">เลิก</div>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field w-full" />
              </label>
            </div>

            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ประเภท (สำหรับ AI จัดตาราง)</div>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'py-2 px-1 rounded-xl text-[10px] font-bold transition-all border active:scale-[0.97]',
                      category === cat.id
                        ? 'bg-brand/20 border-brand text-brand-accent shadow-sm'
                        : 'bg-white/50 border-border-solid text-text-quaternary hover:bg-white/80',
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </label>

            <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-border-solid">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">สี</div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-14 bg-transparent border-0 p-0 cursor-pointer rounded"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-bg-elevated text-text-tertiary border border-border-solid rounded-xl text-sm font-semibold hover:bg-white/80 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                   <Check className="w-4 h-4" /> บันทึก
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditEmployeeModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onUpdate: (employee: Employee) => Promise<void>;
  positions: Position[];
  positionGroups: PositionGroup[];
}

export function EditEmployeeModal({ open, employee, onClose, onUpdate, positions, positionGroups }: EditEmployeeModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [positionId, setPositionId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (!open || !employee) return null;

  if (!initialized) {
    setName(employee.fullName);
    setCode(employee.employeeCode);
    setPositionId(employee.positionId || '');
    setGroupId(employee.groupId || '');
    setInitialized(true);
  }

  const handleClose = () => {
    setInitialized(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.warning('กรอกข้อมูลไม่ครบ', 'ต้องระบุทั้งชื่อและรหัสพนักงาน');
      return;
    }
    setIsSubmitting(true);
    try {
      await onUpdate({
        ...employee,
        fullName: name.trim(),
        employeeCode: code.trim(),
        positionId: positionId || employee.positionId,
        groupId: groupId || undefined,
      });
      toast.success('แก้ไขพนักงานสำเร็จ', name.trim());
      setInitialized(false);
      handleClose();
    } catch (err: unknown) {
      toast.error('แก้ไขพนักงานไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={handleClose} />
      <div className="relative w-full sm:max-w-md bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay overflow-hidden animate-slide-up border border-white/40">
        <div className="w-10 h-1 bg-text-quaternary/30 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary">แก้ไขพนักงาน</h3>
              <p className="text-xs font-semibold text-text-tertiary mt-0.5">{employee.fullName}</p>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 bg-white/60 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white border border-border-solid transition-colors shrink-0"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ชื่อพนักงาน</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field w-full" placeholder="ชื่อ-นามสกุล" />
            </label>
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">รหัสพนักงาน</div>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field w-full" placeholder="รหัส" />
            </label>
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ตำแหน่ง</div>
              <select value={positionId} onChange={(e) => setPositionId(e.target.value)} className="input-field w-full">
                <option value="">-- เลือกตำแหน่ง --</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">กลุ่มตำแหน่ง (Optional)</div>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field w-full">
                <option value="">-- เลือกกลุ่ม (ถ้ามี) --</option>
                {positionGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-bg-elevated text-text-tertiary border border-border-solid rounded-xl text-sm font-semibold hover:bg-white/80 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Pencil className="w-4 h-4" /> บันทึก
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
