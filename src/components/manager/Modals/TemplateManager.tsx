import { useState, useEffect } from 'react';
import { X, Save, Trash2, Play, FileText } from 'lucide-react';
import { useToast } from '../../../lib/toast';
import { ConfirmModal } from '../../ConfirmModal';
import { DAY_NAMES_SHORT } from '../../../config/constants';
import {
  loadTemplates as loadTemplatesAsync,
  createTemplateFromSchedules as createTemplateFromSchedulesAsync,
  applyTemplateToMonth,
  deleteTemplate as deleteTemplateAsync,
} from '../../../lib/schedule-templates';
import type { ScheduleTemplate } from '../../../lib/schedule-templates';
import type { ScheduleEntry, Employee } from '../../../types';

interface TemplateManagerProps {
  open: boolean;
  onClose: () => void;
  currentMonth: Date;
  schedules: ScheduleEntry[];
  employees: Employee[];
  onApply: (assignments: { employeeId: string; date: string; shiftTypeId: string }[]) => void;
}

export function TemplateManager({
  open,
  onClose,
  currentMonth,
  schedules,
  employees,
  onApply,
}: TemplateManagerProps) {
  const toast = useToast();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ScheduleTemplate | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    loadTemplatesAsync()
      .then((data) => { if (!cancelled) setTemplates(data); })
      .catch(() => { if (!cancelled) setTemplates([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const handleSave = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const template = await createTemplateFromSchedulesAsync(newName.trim(), schedules, currentMonth);
      setTemplates((prev) => [template, ...prev]);
      setNewName('');
      toast.success('บันทึกเทมเพลตสำเร็จ', template.patterns.length + ' คน');
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = async (template: ScheduleTemplate) => {
    setIsApplying(template.id);
    try {
      const assignments = applyTemplateToMonth(template, currentMonth, schedules);
      if (assignments.length === 0) {
        toast.info('ไม่มีรายการใหม่ให้ใช้ — ทุกวันมีตารางอยู่แล้ว');
        return;
      }
      onApply(assignments);
      toast.success('ใช้เทมเพลตสำเร็จ', `${assignments.length} รายการ`);
      onClose();
    } catch (err: unknown) {
      toast.error('ใช้เทมเพลตไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsApplying(null);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteConfirm(templates.find((t) => t.id === id) || null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTemplateAsync(deleteConfirm.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteConfirm.id));
      toast.success('ลบเทมเพลตแล้ว');
    } catch {
      toast.error('ลบเทมเพลตไม่สำเร็จ');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay animate-slide-up border border-white/40 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-border-solid shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            <h3 className="text-base font-bold text-text-primary">จัดการเทมเพลต</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-xl text-text-tertiary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save new template */}
        <div className="p-4 border-b border-border-solid shrink-0">
          <p className="text-xs font-semibold text-text-tertiary mb-2">บันทึกตารางเดือนปัจจุบันเป็นเทมเพลต</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ชื่อเทมเพลต (เช่น ตาราง A/B/C)"
              className="input-field flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={!newName.trim() || isSaving}
              className="btn btn-primary text-xs px-4 py-2 whitespace-nowrap"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save className="w-4 h-4" /> บันทึก</>
              )}
            </button>
          </div>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <span className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin block mx-auto" />
              <p className="text-xs text-text-tertiary mt-2">กำลังโหลด...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-text-quaternary mx-auto mb-2" />
              <p className="text-xs text-text-tertiary">ยังไม่มีเทมเพลต</p>
              <p className="text-[10px] text-text-quaternary">บันทึกตารางเดือนปัจจุบันเพื่อสร้างเทมเพลตแรก</p>
            </div>
          ) : (
            templates.map((tpl) => {
              const dayNames = [...DAY_NAMES_SHORT];
              const patternSummary = tpl.patterns.length + ' คน';
              return (
                <div key={tpl.id} className="p-3 rounded-xl bg-bg-surface border border-border-solid hover:border-brand/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-text-primary">{tpl.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleApply(tpl)}
                        disabled={isApplying === tpl.id}
                        className="btn btn-primary text-[10px] px-3 py-1.5"
                      >
                        {isApplying === tpl.id ? (
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><Play className="w-3 h-3" /> ใช้เทมเพลต</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(tpl.id)}
                        className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-text-quaternary">
                    {patternSummary} · สร้างเมื่อ {new Date(tpl.createdAt).toLocaleDateString('th-TH')}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tpl.patterns.slice(0, 3).map((p) => {
                      const emp = employees.find((e) => e.id === p.employeeId);
                      const days = Object.keys(p.shiftsByDay)
                        .map(Number)
                        .sort((a, b) => a - b)
                        .map((d) => dayNames[d])
                        .join(', ');
                      return (
                        <span key={p.employeeId} className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-brand/10 text-brand-accent">
                          {emp?.fullName || '???'}: {days}
                        </span>
                      );
                    })}
                    {tpl.patterns.length > 3 && (
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-bg-elevated text-text-quaternary">
                        +{tpl.patterns.length - 3} คน
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteConfirm)}
        title="ลบเทมเพลต"
        message={`ลบเทมเพลต "${deleteConfirm?.name || ''}" ?`}
        confirmLabel="ลบ"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
