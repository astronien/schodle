import { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { AlertCircle, AlertTriangle, XCircle, CheckCircle2, ChevronRight, Plus, Check, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getDiceBearAvatar } from '../../lib/validators';
import { validateAssignShift } from '../../lib/conflict-validator';
import { useToast } from '../../lib/toast';
import type { AppSettings, Employee, Position, ScheduleEntry, ShiftType } from '../../types';

interface ShiftEditorProps {
  open: boolean;
  selectedDate: Date | null;
  currentUser: Employee;
  employees: Employee[];
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  positions: Position[];
  settings: AppSettings;
  isUpdating: boolean;
  validationError: string | null;
  uploadFile: (file: File) => Promise<string>;
  onClearError: () => void;
  onClose: () => void;
  onConfirm: (shiftId: string | null, reason?: string, evidenceUrl?: string, isLateScan?: boolean) => Promise<void>;
  onSwap: (targetEmployeeId: string) => Promise<void>;
  getDaySchedule: (date: Date) => ScheduleEntry | undefined;
}

export function ShiftEditor({
  open,
  selectedDate,
  currentUser,
  employees,
  schedules,
  shiftTypes,
  settings,
  isUpdating,
  validationError,
  uploadFile,
  onClearError,
  onClose,
  onConfirm,
  onSwap,
  getDaySchedule,
}: ShiftEditorProps) {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isLateScan, setIsLateScan] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [targetSwapId, setTargetSwapId] = useState<string | null>(null);

  const toast = useToast();

  const currentShiftId = selectedShiftId || (selectedDate ? getDaySchedule(selectedDate)?.shiftTypeId : null) || null;
  const shiftType = selectedDate ? shiftTypes.find((t) => t.id === currentShiftId) : null;
  const isOffDay =
    typeof currentUser.weeklyOffDay === 'number' &&
    (selectedDate ? selectedDate.getDay() === currentUser.weeklyOffDay : false);

  const conflictWarnings = useMemo(() => {
    if (!currentShiftId || !selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return validateAssignShift(currentUser.id, dateStr, currentShiftId, schedules, employees, shiftTypes);
  }, [currentShiftId, selectedDate, currentUser.id, schedules, employees, shiftTypes]);

  if (!open || !selectedDate) return null;

  const reset = () => {
    setSelectedShiftId(null);
    setRequestReason('');
    setAttachment(null);
    setIsLateScan(false);
    setIsSwapping(false);
    setTargetSwapId(null);
  };

  const handleConfirm = async () => {
    let evidenceUrl: string | undefined;
    if (attachment) {
      try {
        evidenceUrl = await uploadFile(attachment);
      } catch (err: unknown) {
        toast.error('อัปโหลดหลักฐานไม่สำเร็จ', err instanceof Error ? err.message : undefined);
        return;
      }
    }
    await onConfirm(currentShiftId, requestReason, evidenceUrl, isLateScan);
    reset();
  };

  const handleSwapConfirm = async () => {
    if (!targetSwapId) return;
    await onSwap(targetSwapId);
    reset();
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity" onClick={handleClose}></div>

      <div className="relative w-full sm:max-w-md bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay overflow-hidden animate-slide-up border border-border-solid flex flex-col max-h-[88vh]">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden"></div>

        <div className="p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-medium text-text-primary">
                {settings.allowEmployeeSetShifts ? 'เลือกกะงาน' : 'ส่งคำขอลา/หยุด'}
              </h3>
              <p className="text-sm font-medium text-brand-accent">
                {format(selectedDate, 'EEEE ที่ d MMMM yyyy', { locale: th })}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 bg-bg-surface rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors border border-border-solid"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {validationError && (
            <div className="mb-5 p-3.5 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-danger">{validationError}</p>
            </div>
          )}

          {conflictWarnings.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {conflictWarnings.map((w, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-2 p-2.5 rounded-xl border text-xs',
                    w.severity === 'error'
                      ? 'text-danger bg-danger/10 border-danger/20'
                      : 'text-warn bg-warn/10 border-warn/20',
                  )}
                >
                  {w.severity === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium">{w.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-4">
            {settings.allowEmployeeSetShifts ? null : (
              <p className="text-[11px] text-text-tertiary font-semibold mb-2">
                เลือกประเภทการลาที่ผู้จัดการเปิดให้
              </p>
            )}
            <div className="grid grid-cols-1 gap-2">
              {(() => {
                const visible = shiftTypes.filter((t) => {
                  const isVisible = t.isVisible || t.id === 'xc';
                  const isWeeklyOffMatch = !isOffDay || t.code === 'X';
                  // Two modes:
                  //  - work mode (allowEmployeeSetShifts=true): show every
                  //    visible shift so the employee can self-pick.
                  //  - leave mode (allowEmployeeSetShifts=false): show ONLY
                  //    shifts the manager flagged as isLeave. This is the
                  //    "คำขอลา พนักงานเลือกได้ตามที่ผู้จัดการตั้งค่าไว้" rule.
                  const isAllowedBySetting = settings.allowEmployeeSetShifts
                    ? true
                    : Boolean(t.isLeave);
                  return isVisible && isWeeklyOffMatch && isAllowedBySetting;
                });

                if (visible.length === 0 && !settings.allowEmployeeSetShifts) {
                  return (
                    <div className="p-6 text-center text-text-tertiary text-xs">
                      <p className="font-semibold text-text-secondary mb-1">ยังไม่มีประเภทการลาให้เลือก</p>
                      <p>ผู้จัดการยังไม่ได้เปิดประเภทการลาในระบบ กรุณาติดต่อผู้จัดการ</p>
                    </div>
                  );
                }

                return visible.map((type) => {
                  const isSelected = selectedShiftId === type.id;
                  const count = schedules.filter(
                    (s) =>
                      isSameDay(new Date(`${s.date}T00:00:00`), selectedDate) &&
                      s.shiftTypeId === type.id &&
                      s.status !== 'rejected'
                  ).length;
                  const isFull = count >= 3 && type.id !== 'xc';
                  const yearApproved = schedules.filter(
                    (s) =>
                      s.employeeId === currentUser.id &&
                      s.status === 'approved' &&
                      s.shiftTypeId === type.id &&
                      new Date(`${s.date}T00:00:00`).getFullYear() === new Date().getFullYear() &&
                      type.isLeave
                  ).length;
                  const remaining = type.isLeave && type.annualQuota ? type.annualQuota - yearApproved : null;
                  return (
                    <button
                      key={type.id}
                      disabled={isFull}
                      onClick={() => {
                        setSelectedShiftId(type.id);
                        onClearError();
                      }}
                      className={cn(
                        'flex items-center justify-between p-3.5 rounded-lg border transition-all duration-200 active:scale-[0.98]',
                        isSelected
                          ? 'border-brand bg-brand/15 ring-1 ring-brand/25'
                          : isFull
                          ? 'border-border-solid bg-bg-surface opacity-50 cursor-not-allowed'
                          : 'border-border-solid hover:border-border-solid-light bg-bg-surface'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-md flex items-center justify-center text-xs font-medium text-white',
                            isFull && 'grayscale'
                          )}
                          style={{ backgroundColor: type.color }}
                        >
                          {type.code}
                        </div>
                        <div className="text-left">
                          <p className={cn('font-medium text-sm', isFull ? 'text-text-quaternary' : 'text-text-primary')}>
                            {type.name}
                          </p>
                          <p className="text-xs text-text-tertiary font-medium">
                            {type.startTime} - {type.endTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {type.id !== 'xc' && (
                          <span
                            className={cn(
                              'text-[10px] font-medium px-2 py-1 rounded-md',
                              isFull ? 'bg-danger/10 text-danger' : 'bg-bg-surface text-text-quaternary'
                            )}
                          >
                            {isFull ? 'เต็ม' : `${count}/3`}
                          </span>
                        )}
                        {remaining !== null && (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-1 rounded-md',
                              remaining <= 0 ? 'bg-danger/10 text-danger' : remaining <= 3 ? 'bg-warn/10 text-warn' : 'bg-success/10 text-success'
                            )}
                          >
                            คง{remaining}/{type.annualQuota}
                          </span>
                        )}
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-accent" />}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Swap and "late scan" are two separate, mutually-exclusive
                requests — only one can be active at a time so employees
                don't end up submitting the wrong one by mistake. */}
            {getDaySchedule(selectedDate) && !isSwapping && !isLateScan && (
              <button
                onClick={() => {
                  setIsSwapping(true);
                  setIsLateScan(false);
                  setAttachment(null);
                }}
                className="mt-3 w-full p-3.5 bg-brand/15 border border-brand/30 rounded-lg flex items-center justify-between group hover:bg-brand/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand text-white rounded-md group-hover:scale-110 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-text-primary uppercase tracking-wide">ขอสลับกะงาน</p>
                    <p className="text-[10px] text-brand-accent font-semibold">แลกกะกับเพื่อนร่วมงานในวันนี้</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
              </button>
            )}

            {getDaySchedule(selectedDate) && !isSwapping && (
              <div className="mt-3 flex items-center justify-between p-3.5 bg-bg-surface rounded-lg border border-border-solid">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      isLateScan ? 'bg-warn/20 text-warn' : 'bg-bg-elevated text-text-tertiary border border-border-solid'
                    )}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">มาสาย / ลืมแสกนนิ้ว</p>
                    <p className="text-[10px] text-text-tertiary">ต้องแนบหลักฐานเพื่อยืนยัน</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsLateScan(!isLateScan);
                    setAttachment(null);
                  }}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative shrink-0',
                    isLateScan ? 'bg-warn' : 'bg-bg-elevated'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all',
                      isLateScan ? 'right-1' : 'left-1'
                    )}
                  ></div>
                </button>
              </div>
            )}

            {isLateScan && (
              <div className="mt-3 p-4 bg-brand/15 border border-dashed border-brand/30 rounded-lg flex flex-col items-center gap-2 animate-fade-in">
                <input
                  type="file"
                  accept="image/*"
                  id="evidence"
                  className="hidden"
                  onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                />
                <label htmlFor="evidence" className="flex flex-col items-center cursor-pointer group">
                  <div className="p-2.5 bg-bg-surface rounded-full shadow-sm text-brand-accent mb-1 group-hover:scale-110 transition-transform border border-border-solid">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-brand-accent uppercase tracking-wide">
                    {attachment ? attachment.name : 'แนบหลักฐานรูปภาพ'}
                  </span>
                  <span className="text-[10px] text-text-tertiary mt-1">
                    ต้องแนบรูปภาพเพื่อยืนยัน
                  </span>
                </label>
              </div>
            )}

            {isSwapping && (
              <div className="mt-3 p-4 bg-brand/15 rounded-lg border border-brand/30 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                    เลือกเพื่อนที่จะสลับกะด้วย
                  </span>
                  <button
                    onClick={() => setIsSwapping(false)}
                    className="text-xs font-semibold text-text-secondary hover:text-text-primary px-2 py-1 rounded-md hover:bg-bg-surface"
                  >
                    ยกเลิก
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {employees
                    .filter((e) => e.id !== currentUser.id)
                    .map((emp) => {
                      const empShift = schedules.find(
                        (s) => s.employeeId === emp.id && s.date === format(selectedDate, 'yyyy-MM-dd')
                      );
                      if (!empShift) return null;
                      const empShiftType = shiftTypes.find((t) => t.id === empShift.shiftTypeId);
                      return (
                        <button
                          key={emp.id}
                          onClick={() => setTargetSwapId(emp.id)}
                          className={cn(
                            'w-full p-3 rounded-md border flex items-center justify-between transition-all',
                            targetSwapId === emp.id
                              ? 'bg-bg-elevated border-brand shadow-raised'
                              : 'bg-bg-surface border-border-solid hover:border-border-solid-light'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-bg-elevated">
                              <img src={getDiceBearAvatar(emp.fullName)} alt="" className="w-full h-full" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-semibold text-text-primary">{emp.fullName}</p>
                              <p className="text-[10px] font-semibold text-text-tertiary">
                                {empShiftType?.name} ({empShiftType?.startTime})
                              </p>
                            </div>
                          </div>
                          {targetSwapId === emp.id && <Check className="w-4 h-4 text-brand-accent" />}
                        </button>
                      );
                    })}
                </div>
                {targetSwapId && (
                  <button
                    onClick={handleSwapConfirm}
                    className="mt-3 w-full py-3 bg-brand text-white rounded-lg text-sm font-semibold shadow-raised hover:bg-brand-hover transition-colors"
                  >
                    ยืนยันการขอสลับกะ
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3 mt-5">
              {shiftType && !isLateScan && (
                <>
                  {shiftType.requiresEvidence && (
                    <div className="p-4 bg-brand/15 border border-dashed border-brand/30 rounded-lg flex flex-col items-center gap-2 animate-fade-in">
                      <input
                        type="file"
                        accept="image/*"
                        id="evidence"
                        className="hidden"
                        onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                      />
                      <label htmlFor="evidence" className="flex flex-col items-center cursor-pointer group">
                        <div className="p-2.5 bg-bg-surface rounded-full shadow-sm text-brand-accent mb-1 group-hover:scale-110 transition-transform border border-border-solid">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-brand-accent uppercase tracking-wide">
                          {attachment ? attachment.name : 'แนบหลักฐานรูปภาพ'}
                        </span>
                        <span className="text-[10px] text-text-tertiary mt-1">
                          ต้องแนบรูปภาพเพื่อยืนยัน
                        </span>
                      </label>
                    </div>
                  )}

                  {shiftType.requiresReason && (
                    <div className="p-4 bg-bg-surface rounded-lg border border-border-solid animate-fade-in">
                      <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
                        ระบุเหตุผลความจำเป็น
                      </label>
                      <textarea
                        value={requestReason}
                        onChange={(e) => setRequestReason(e.target.value)}
                        placeholder="กรุณาระบุรายละเอียดเพิ่มเติม..."
                        className="input-field"
                        rows={2}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border-solid flex gap-3 shrink-0 pb-[env(safe-area-inset-bottom)]">
            <button onClick={() => onConfirm(null)} className="btn btn-ghost px-5 py-3.5 rounded-lg font-medium">
              ล้างกะ
            </button>
            <button
              disabled={
                isUpdating ||
                Boolean(!isLateScan && shiftType?.requiresReason && !requestReason) ||
                Boolean(!isLateScan && shiftType?.requiresEvidence && !attachment) ||
                Boolean(isLateScan && !attachment)
              }
              onClick={handleConfirm}
              className={cn(
                'flex-1 btn rounded-lg font-medium py-3.5',
                isUpdating ||
                  Boolean(!isLateScan && shiftType?.requiresReason && !requestReason) ||
                  Boolean(!isLateScan && shiftType?.requiresEvidence && !attachment) ||
                  Boolean(isLateScan && !attachment)
                  ? 'bg-bg-surface text-text-quaternary cursor-not-allowed'
                  : 'btn-primary'
              )}
            >
              {isUpdating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'ยืนยันการลงกะ'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
