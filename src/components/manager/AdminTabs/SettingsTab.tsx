import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Users,
  Bell,
  Check,
  X as XIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Send,
  Smartphone,
  Activity,
  Share,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../lib/toast';
import { AdminPageHeader } from '../AdminSidebar';
import {
  getPushDiagnostic,
  type PushDiagnostic,
} from '../../../lib/push';
import type { AppSettings } from '../../../types';

interface SettingsTabProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
  onEnableNotifications: () => Promise<void>;
  isSubscribing: boolean;
  onSendTestPush: () => Promise<{ success: boolean; sent?: number; error?: string }>;
}

export function SettingsTab({
  settings,
  onSave,
  onEnableNotifications,
  isSubscribing,
  onSendTestPush,
}: SettingsTabProps) {
  const [diag, setDiag] = useState<PushDiagnostic | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const toast = useToast();
  const [local, setLocal] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const update = (patch: Partial<AppSettings>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(local);
      setIsDirty(false);
      toast.success('บันทึกการตั้งค่าสำเร็จ');
    } catch (err: unknown) {
      toast.error('บันทึกการตั้งค่าไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocal(settings);
    setIsDirty(false);
  };

  const refreshDiagnostic = useCallback(async () => {
    setDiagLoading(true);
    try {
      const d = await getPushDiagnostic();
      setDiag(d);
    } finally {
      setDiagLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshDiagnostic();
  }, [refreshDiagnostic]);

  const handleTestPush = async () => {
    if (!diag?.subscribed) {
      toast.warning('ยังไม่ได้สมัครรับการแจ้งเตือน', 'กรุณาเปิดใช้งานก่อน');
      return;
    }
    setTesting(true);
    try {
      const res = await onSendTestPush();
      if (res.success) {
        toast.success(
          'ส่งทดสอบสำเร็จ',
          res.sent && res.sent > 0
            ? `ส่งไปยังอุปกรณ์ ${res.sent} เครื่อง`
            : 'รอสักครู่ ควรจะมีแจ้งเตือนปรากฏขึ้น',
        );
      } else {
        toast.error('ส่งทดสอบไม่สำเร็จ', res.error);
      }
    } catch (err: unknown) {
      toast.error('ส่งทดสอบไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      <AdminPageHeader
        icon={Store}
        title="ตั้งค่าแอป"
        description="การตั้งค่าทั่วไปสำหรับร้านและพนักงาน"
      />

      <div className="space-y-4">
        {/* Card 1: Store & App info */}
        <section className="glass-cell rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand/15 flex items-center justify-center">
              <Store className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">ข้อมูลร้าน</h4>
              <p className="text-[10px] text-text-tertiary">
                ชื่อที่ใช้แสดงในหน้า Login และ Header
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-text-quaternary uppercase tracking-wider mb-1.5">
                  ชื่อร้าน
                </label>
                <input
                  type="text"
                  value={local.storeName}
                  onChange={(e) => update({ storeName: e.target.value })}
                  className="input-field w-full"
                  placeholder="เช่น Central Plaza Rama 9"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-quaternary uppercase tracking-wider mb-1.5">
                  ชื่อแอป
                </label>
                <input
                  type="text"
                  value={local.appName}
                  onChange={(e) => update({ appName: e.target.value })}
                  className="input-field w-full"
                  placeholder="เช่น ShiftFlow"
                />
              </div>
            </div>

            <div className="hidden lg:block" />

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">
                ตัวอย่างการแสดงผล
              </p>
              <div className="space-y-2">
                <div className="glass-nav rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-brand rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px] font-bold">SF</span>
                  </div>
                  <span className="text-sm font-bold text-text-primary truncate">
                    {local.appName || '—'}
                  </span>
                </div>
                <div className="glass-nav rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-tertiary leading-relaxed">
                    ระบบจัดการตารางงาน
                    <br />
                    <span className="font-bold text-text-secondary">{local.appName || '—'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Employee permissions */}
        <section className="glass-cell rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-success" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-text-primary">สิทธิ์พนักงาน</h4>
                <p className="text-[10px] text-text-tertiary">
                  กำหนดว่าพนักงานสามารถเลือกกะงานเองได้หรือไม่
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                update({ allowEmployeeSetShifts: !local.allowEmployeeSetShifts })
              }
              className={cn(
                'shrink-0 w-12 h-7 rounded-full transition-colors relative',
                local.allowEmployeeSetShifts ? 'bg-success' : 'bg-bg-elevated',
              )}
              aria-label="สลับสิทธิ์พนักงาน"
            >
              <div
                className={cn(
                  'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all flex items-center justify-center',
                  local.allowEmployeeSetShifts ? 'right-0.5' : 'left-0.5',
                )}
              >
                {local.allowEmployeeSetShifts ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <XIcon className="w-3.5 h-3.5 text-text-quaternary" />
                )}
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              className={cn(
                'rounded-xl p-3 border transition-colors',
                local.allowEmployeeSetShifts
                  ? 'bg-success/10 border-success/30'
                  : 'bg-bg-surface border-border-solid',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle2
                  className={cn(
                    'w-3.5 h-3.5',
                    local.allowEmployeeSetShifts ? 'text-success' : 'text-text-quaternary',
                  )}
                />
                <p
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    local.allowEmployeeSetShifts ? 'text-success' : 'text-text-quaternary',
                  )}
                >
                  เมื่อเปิด
                </p>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                พนักงานเลือกกะงานทุกประเภทได้เองจากหน้า Dashboard
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl p-3 border transition-colors',
                !local.allowEmployeeSetShifts
                  ? 'bg-warn/10 border-warn/30'
                  : 'bg-bg-surface border-border-solid',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertCircle
                  className={cn(
                    'w-3.5 h-3.5',
                    !local.allowEmployeeSetShifts ? 'text-warn' : 'text-text-quaternary',
                  )}
                />
                <p
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    !local.allowEmployeeSetShifts ? 'text-warn' : 'text-text-quaternary',
                  )}
                >
                  เมื่อปิด
                </p>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                เห็นเฉพาะ "ประเภทการลา" ที่ผู้จัดการเปิดให้
              </p>
            </div>
          </div>
        </section>

        {/* Card 3: Notifications */}
        <section className="glass-cell rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-warn/15 flex items-center justify-center">
              <Bell className="w-4 h-4 text-warn" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-text-primary">การแจ้งเตือน</h4>
              <p className="text-[10px] text-text-tertiary">
                รับการแจ้งเตือนทันทีบนอุปกรณ์นี้เมื่อมีอัปเดต
              </p>
            </div>
            <button
              onClick={refreshDiagnostic}
              disabled={diagLoading}
              className="p-1.5 text-text-tertiary hover:text-text-primary rounded-md hover:bg-white/60"
              title="รีเฟรชสถานะ"
              aria-label="รีเฟรชสถานะ"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', diagLoading && 'animate-spin')} />
            </button>
          </div>

          {/* Diagnostic panel */}
          {diag && (
            <div className="bg-white/50 rounded-xl p-3 space-y-1.5 border border-border-solid">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Activity className="w-3 h-3 text-text-quaternary" />
                <p className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">
                  สถานะระบบ
                </p>
              </div>
              <DiagRow
                ok={diag.serviceWorker === 'registered'}
                label="Service Worker"
                value={
                  diag.serviceWorker === 'registered'
                    ? 'ลงทะเบียนแล้ว'
                    : diag.serviceWorker === 'unsupported'
                    ? 'เบราว์เซอร์ไม่รองรับ'
                    : 'ยังไม่ได้ลงทะเบียน'
                }
              />
              <DiagRow
                ok={diag.permission === 'granted'}
                warn={diag.permission === 'default'}
                label="Notification Permission"
                value={
                  diag.permission === 'granted'
                    ? 'อนุญาต'
                    : diag.permission === 'denied'
                    ? 'ถูกปฏิเสธ (เปิดในตั้งค่าเบราว์เซอร์)'
                    : diag.permission === 'unavailable'
                    ? 'ไม่รองรับ'
                    : 'ยังไม่ได้ขอ'
                }
              />
              <DiagRow
                ok={diag.subscribed}
                label="Push Subscription"
                value={diag.subscribed ? 'ลงทะเบียนแล้ว' : 'ยังไม่ได้ลงทะเบียน'}
              />
            </div>
          )}

          {/* iOS PWA install hint */}
          {diag?.isIOS && !diag.isStandalone && (
            <div className="bg-warn/10 border border-warn/30 rounded-xl p-3 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-warn shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-warn">iOS ต้องติดตั้ง PWA ก่อน</p>
                <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                  แตะ{' '}
                  <Share className="w-3 h-3 inline -mt-0.5" aria-label="Share" />{' '}
                  แล้วเลือก <b>"เพิ่มในหน้าจอโฮม"</b> แล้วเปิดแอปจากไอคอน
                  (เปิดจาก Safari tab ปกติจะรับ push ไม่ได้)
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 glass-nav rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0',
                  isSubscribing
                    ? 'bg-warn animate-pulse'
                    : diag?.subscribed
                    ? 'bg-success'
                    : 'bg-text-quaternary',
                )}
              />
              <p className="text-xs font-semibold text-text-secondary">
                {isSubscribing
                  ? 'กำลังเปิดใช้งาน...'
                  : diag?.subscribed
                  ? 'เปิดใช้งานแล้ว — พร้อมรับการแจ้งเตือน'
                  : 'แตะปุ่มเพื่อเปิดใช้งานบนอุปกรณ์นี้'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {diag?.subscribed && (
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestPush}
                  className="btn btn-ghost text-xs px-3 py-2 whitespace-nowrap"
                  title="ส่งแจ้งเตือนทดสอบมาที่เครื่องนี้"
                >
                  {testing ? (
                    <span className="w-3 h-3 border-2 border-text-tertiary/30 border-t-text-tertiary rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3 h-3" /> ทดสอบ
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                disabled={isSubscribing}
                onClick={async () => {
                  await onEnableNotifications();
                  refreshDiagnostic();
                }}
                className="btn btn-secondary text-xs px-5 py-2 whitespace-nowrap"
              >
                {isSubscribing ? 'กำลังตั้งค่า...' : diag?.subscribed ? 'ตั้งค่าใหม่' : 'เปิดใช้งาน'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4 animate-slide-up">
          <div className="mx-auto max-w-3xl glass-nav rounded-2xl shadow-overlay p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-2 h-2 rounded-full bg-warn animate-pulse shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleReset}
                className="btn btn-ghost text-xs px-4 py-2 whitespace-nowrap"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary text-xs px-5 py-2 whitespace-nowrap"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    บันทึก
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DiagRowProps {
  ok: boolean;
  warn?: boolean;
  label: string;
  value: string;
}

function DiagRow({ ok, warn, label, value }: DiagRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-text-tertiary font-medium">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1 font-bold',
          ok ? 'text-success' : warn ? 'text-warn' : 'text-danger',
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            ok ? 'bg-success' : warn ? 'bg-warn' : 'bg-danger',
          )}
        />
        {value}
      </span>
    </div>
  );
}
