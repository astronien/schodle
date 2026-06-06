import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../lib/toast';
import type { AppSettings } from '../../../types';

interface SettingsTabProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
  onEnableNotifications: () => Promise<void>;
  isSubscribing: boolean;
}

export function SettingsTab({ settings, onSave, onEnableNotifications, isSubscribing }: SettingsTabProps) {
  const toast = useToast();
  const [local, setLocal] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(local);
      toast.success('บันทึกการตั้งค่าสำเร็จ');
    } catch (err: unknown) {
      toast.error('บันทึกการตั้งค่าไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-tertiary">
          ตั้งค่าชื่อร้านและชื่อแอปพลิเคชัน
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">
            ชื่อร้าน (Store Name)
          </label>
          <input
            type="text"
            value={local.storeName}
            onChange={(e) => setLocal({ ...local, storeName: e.target.value })}
            className="input-field w-full"
            placeholder="เช่น Central Plaza Rama 9"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">
            ชื่อเว็บ / แอป (App Name)
          </label>
          <input
            type="text"
            value={local.appName}
            onChange={(e) => setLocal({ ...local, appName: e.target.value })}
            className="input-field w-full"
            placeholder="เช่น ShiftFlow"
          />
        </div>

        <div className="p-4 bg-white/[0.02] border border-border-solid rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                การตั้งค่ากะงานพนักงาน
              </h4>
              <p className="text-xs text-text-tertiary">
                อนุญาตให้พนักงานสามารถเลือกและตั้งค่ากะงานของตัวเองได้จากหน้า Dashboard
              </p>
            </div>
            <button
              onClick={() => setLocal({ ...local, allowEmployeeSetShifts: !local.allowEmployeeSetShifts })}
              className={cn(
                'w-12 h-6 rounded-full transition-all relative',
                local.allowEmployeeSetShifts ? 'bg-success' : 'bg-white/10'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all',
                  local.allowEmployeeSetShifts ? 'right-1' : 'left-1'
                )}
              ></div>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-light" />
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  การแจ้งเตือนผ่านมือถือ (Native Notifications)
                </h4>
              </div>
              <p className="text-xs text-text-tertiary">
                รับการแจ้งเตือนทันทีบน iOS และ Android เมื่อมีการอัปเดตตารางงานหรือคำขอลา
              </p>
            </div>
            <button
              type="button"
              disabled={isSubscribing}
              onClick={onEnableNotifications}
              className="btn btn-secondary text-xs px-6 py-2.5 whitespace-nowrap"
            >
              {isSubscribing ? 'กำลังตั้งค่า...' : 'เปิดใช้งานบนอุปกรณ์นี้'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary px-8">
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              บันทึกการตั้งค่า
            </>
          )}
        </button>
      </div>

      <div className="p-4 bg-brand/10 border border-brand/20 rounded-xl">
        <p className="text-xs text-brand font-medium leading-relaxed">
          * การเปลี่ยนชื่อร้านและชื่อแอปจะมีผลกับพนักงานทุกคนทันทีในหน้า Login และหน้า Header
        </p>
      </div>
    </div>
  );
}
