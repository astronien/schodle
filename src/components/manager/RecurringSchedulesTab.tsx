import { useState } from 'react';
import { format } from 'date-fns';
import { Repeat, Plus, Trash2, Clock, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../lib/toast';
import { DAY_NAMES_SHORT } from '../../config/constants';
import type { Employee, RecurringSchedule, ShiftType } from '../../types';

const DAY_LABELS = DAY_NAMES_SHORT.map((d) => `${d}.`);

interface RecurringSchedulesTabProps {
  recurringSchedules: RecurringSchedule[];
  employees: Employee[];
  shiftTypes: ShiftType[];
  onCreate: (recurring: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (recurring: RecurringSchedule) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onApplyToMonth: (month: Date, employeeIds?: string[]) => Promise<{ count: number; message: string }>;
  currentMonth: Date;
}

export function RecurringSchedulesTab({
  recurringSchedules,
  employees,
  shiftTypes,
  onCreate,
  onUpdate,
  onDelete,
  onApplyToMonth,
  currentMonth,
}: RecurringSchedulesTabProps) {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formShiftTypeId, setFormShiftTypeId] = useState('');
  const [formDays, setFormDays] = useState<number[]>([]);
  const [formStartDate, setFormStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formEndDate, setFormEndDate] = useState('');
  const [formNote, setFormNote] = useState('');

  const activeSchedules = recurringSchedules.filter((r) => r.isActive);
  const inactiveSchedules = recurringSchedules.filter((r) => !r.isActive);

  const resetForm = () => {
    setFormEmployeeId('');
    setFormShiftTypeId('');
    setFormDays([]);
    setFormStartDate(format(new Date(), 'yyyy-MM-dd'));
    setFormEndDate('');
    setFormNote('');
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (r: RecurringSchedule) => {
    setFormEmployeeId(r.employeeId);
    setFormShiftTypeId(r.shiftTypeId);
    setFormDays(r.daysOfWeek);
    setFormStartDate(r.startDate);
    setFormEndDate(r.endDate || '');
    setFormNote(r.note || '');
    setEditingId(r.id);
    setShowForm(true);
  };

  const toggleDay = (day: number) => {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleSave = async () => {
    if (!formEmployeeId) { toast.warning('กรุณาเลือกพนักงาน'); return; }
    if (!formShiftTypeId) { toast.warning('กรุณาเลือกประเภทกะ'); return; }
    if (formDays.length === 0) { toast.warning('กรุณาเลือกวันในสัปดาห์'); return; }
    if (!formStartDate) { toast.warning('กรุณาเลือกวันที่เริ่มต้น'); return; }

    setIsSaving(true);
    try {
      const data = {
        employeeId: formEmployeeId,
        shiftTypeId: formShiftTypeId,
        daysOfWeek: formDays,
        startDate: formStartDate,
        endDate: formEndDate || undefined,
        isActive: true,
        note: formNote || undefined,
      };

      if (editingId) {
        await onUpdate({ ...data, id: editingId, createdAt: '', updatedAt: '' });
        toast.success('อัปเดตตารางซ้ำเรียบร้อย');
      } else {
        await onCreate(data);
        toast.success('เพิ่มตารางซ้ำเรียบร้อย');
      }
      resetForm();
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (r: RecurringSchedule) => {
    try {
      await onUpdate({ ...r, isActive: !r.isActive });
      toast.success(r.isActive ? 'ปิดใช้งานตารางซ้ำ' : 'เปิดใช้งานตารางซ้ำ');
    } catch (err: unknown) {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const result = await onApplyToMonth(currentMonth);
      toast.success('ใช้ตารางซ้ำสำเร็จ', result.message);
    } catch (err: unknown) {
      toast.error('ใช้ตารางซ้ำไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsApplying(false);
    }
  };

  const renderRow = (r: RecurringSchedule) => {
    const emp = employees.find((e) => e.id === r.employeeId);
    const shift = shiftTypes.find((t) => t.id === r.shiftTypeId);
    return (
      <div
        key={r.id}
        className={cn(
          'flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all',
          r.isActive ? 'bg-bg-surface border-border-solid' : 'bg-bg-surface/50 border-border-solid/50 opacity-60',
        )}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary truncate">{emp?.fullName || 'ไม่พบพนักงาน'}</p>
              <p className="text-[10px] text-text-tertiary">{emp?.employeeCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-1">
              {DAY_LABELS.map((label, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center',
                    r.daysOfWeek.includes(i)
                      ? 'bg-brand text-white'
                      : 'text-text-quaternary bg-bg-elevated',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {shift?.name || 'ไม่พบกะ'}
            </span>
            <span>ตั้งแต่ {r.startDate}</span>
            {r.endDate && <span>ถึง {r.endDate}</span>}
          </div>
          {r.note && <p className="text-[10px] text-text-quaternary italic">{r.note}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleToggleActive(r)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all',
              r.isActive
                ? 'bg-success/15 text-success hover:bg-success/25'
                : 'bg-text-quaternary/10 text-text-quaternary hover:bg-text-quaternary/20',
            )}
          >
            {r.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </button>
          <button
            onClick={() => openEdit(r)}
            className="px-3 py-1.5 rounded-lg bg-brand/10 text-brand-accent hover:bg-brand/20 text-[10px] font-bold transition-all"
          >
            แก้ไข
          </button>
          <button
            onClick={async () => {
              try {
                await onDelete(r.id);
                toast.success('ลบตารางซ้ำแล้ว');
              } catch (err: unknown) {
                toast.error('ลบตารางซ้ำไม่สำเร็จ', err instanceof Error ? err.message : undefined);
              }
            }}
            className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center">
            <Repeat className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary">ตารางซ้ำ</h3>
            <p className="text-xs text-text-tertiary">ตั้งค่ารูปแบบกะที่ซ้ำทุกสัปดาห์</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApply}
            disabled={isApplying || activeSchedules.length === 0}
            className="btn btn-primary text-xs"
          >
            <Repeat className="w-4 h-4" />
            {isApplying ? 'กำลังใช้...' : 'ใช้กับเดือนนี้'}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn btn-primary text-xs"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตารางซ้ำ
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 rounded-2xl border-brand/30 space-y-4">
          <h4 className="text-sm font-bold text-text-primary">
            {editingId ? 'แก้ไขตารางซ้ำ' : 'เพิ่มตารางซ้ำ'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-quaternary uppercase tracking-wider">พนักงาน</label>
              <select
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-solid text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="">-- เลือกพนักงาน --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-quaternary uppercase tracking-wider">ประเภทกะ</label>
              <select
                value={formShiftTypeId}
                onChange={(e) => setFormShiftTypeId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-solid text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="">-- เลือกกะ --</option>
                {shiftTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-quaternary uppercase tracking-wider">วันในสัปดาห์</label>
            <div className="flex gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'w-10 h-10 rounded-xl text-xs font-bold transition-all',
                    formDays.includes(i)
                      ? 'bg-brand text-white shadow-md'
                      : 'bg-bg-surface text-text-tertiary hover:bg-bg-elevated border border-border-solid',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-quaternary uppercase tracking-wider">วันที่เริ่มต้น</label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-solid text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-quaternary uppercase tracking-wider">วันที่สิ้นสุด (ไม่บังคับ)</label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-solid text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-quaternary uppercase tracking-wider">หมายเหตุ (ไม่บังคับ)</label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="เช่น กะประจำของพนักงาน"
              className="w-full px-3 py-2.5 rounded-xl bg-bg-surface border border-border-solid text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={resetForm} className="btn btn-ghost text-xs">
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={isSaving} className="btn btn-primary text-xs">
              {isSaving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มตารางซ้ำ'}
            </button>
          </div>
        </div>
      )}

      {recurringSchedules.length === 0 && !showForm ? (
        <div className="card p-10 text-center">
          <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-text-quaternary">
            <Repeat className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-1">ยังไม่มีตารางซ้ำ</h3>
          <p className="text-sm text-text-tertiary mb-4">เพิ่มตารางซ้ำสำหรับพนักงานที่มีกะประจำทุกสัปดาห์</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตารางซ้ำ
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeSchedules.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-text-quaternary uppercase tracking-wider mb-3">
                กำลังใช้งาน ({activeSchedules.length})
              </h4>
              <div className="space-y-2">
                {activeSchedules.map(renderRow)}
              </div>
            </div>
          )}
          {inactiveSchedules.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold text-text-quaternary uppercase tracking-wider mb-3">
                ปิดใช้งาน ({inactiveSchedules.length})
              </h4>
              <div className="space-y-2">
                {inactiveSchedules.map(renderRow)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}