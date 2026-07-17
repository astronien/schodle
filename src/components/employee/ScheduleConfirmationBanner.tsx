import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { CheckCircle2, BellRing } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../lib/toast';

interface Props {
  employeeId: string;
  currentMonth: Date;
}

export function ScheduleConfirmationBanner({ employeeId, currentMonth }: Props) {
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  const monthKey = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    let cancelled = false;
    // Deferred to a microtask so setState isn't called synchronously in the
    // effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      void (async () => {
      try {
        const { data, error } = await supabase.rpc('get_my_confirmation', {
          p_month_key: monthKey,
          p_employee_id: employeeId,
        });
        if (!cancelled) {
          if (!error && data && data.length > 0) {
            setConfirmedAt(data[0].confirmed_at);
          } else {
            setConfirmedAt(null);
          }
        }
      } catch {
        if (!cancelled) setConfirmedAt(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
      })();
    });
    return () => { cancelled = true; };
  }, [employeeId, monthKey]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const { error } = await supabase.rpc('confirm_schedule', {
        p_month_key: monthKey,
        p_employee_id: employeeId,
      });
      if (error) throw error;
      setConfirmedAt(new Date().toISOString());
      toast.success('ยืนยันเรียบร้อย', 'ขอบคุณที่ตรวจสอบตารางงาน');
    } catch (err: unknown) {
      toast.error('ยืนยันไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return null;

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: th });

  if (confirmedAt) {
    return (
      <div className="card p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-success">ยืนยันตาราง {monthLabel} แล้ว</p>
          <p className="text-[10px] text-text-tertiary">ขอบคุณที่ตรวจสอบตารางงาน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 rounded-xl bg-brand/10 border border-brand/20 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center shrink-0">
        <BellRing className="w-5 h-5 text-brand" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text-primary">
          ตารางงาน {monthLabel} พร้อมแล้ว
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">
          กรุณาตรวจสอบตารางงานของคุณและยืนยันว่าคุณเห็นแล้ว
        </p>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="mt-3 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {confirming ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          ยืนยันว่าฉันเห็นแล้ว
        </button>
      </div>
    </div>
  );
}
