import { Clock, Bell, Users, LogOut, Check, X } from 'lucide-react';
import type { Employee, UserRole } from '../../types';
import { subscribeToNotifications } from '../../lib/push';
import { useState } from 'react';
import { useToast } from '../../lib/toast';
import { cn } from '../../lib/utils';
import {
  getNotificationPrefs,
  setNotificationPrefs,
  NOTIFICATION_TYPE_LABELS,
  type NotificationPreferences,
  type NotificationType,
} from '../../lib/notification-prefs';

interface HeaderProps {
  currentUser: Employee;
  role: UserRole;
  isManager: boolean;
  onToggleRole: () => void;
  onLogout: () => void;
  appName: string;
}

export function Header({ currentUser, role, isManager, onToggleRole, onLogout, appName }: HeaderProps) {
  const toast = useToast();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [notifPrefs, setNotifPrefsState] = useState<NotificationPreferences>(
    () => getNotificationPrefs(currentUser.id)
  );

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      await subscribeToNotifications(currentUser.id);
      toast.success('เปิดการแจ้งเตือนสำเร็จ');
    } catch (err: unknown) {
      toast.error('เปิดการแจ้งเตือนไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/50 bg-white/72 backdrop-blur-2xl saturate-200 safe-top">

      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center shadow-md">
            <Clock className="text-white w-4 h-4" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
            {appName}
          </h1>

        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              onClick={() => {
                if (!showNotifPrefs) {
                  setNotifPrefsState(getNotificationPrefs(currentUser.id));
                }
                setShowNotifPrefs(!showNotifPrefs);
              }}
              className="relative p-2 text-text-tertiary hover:text-brand hover:bg-bg-surface rounded-full transition-all duration-200"
              title="ตั้งค่าการแจ้งเตือน"
            >
              <Bell className={cn("w-5 h-5", isSubscribing && "animate-pulse text-brand")} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full"></span>
            </button>
            {showNotifPrefs && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 glass-nav rounded-2xl p-4 shadow-overlay animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-text-primary">การแจ้งเตือน</h4>
                  <button onClick={() => setShowNotifPrefs(false)} className="p-1 hover:bg-white/60 rounded-lg">
                    <X className="w-3.5 h-3.5 text-text-tertiary" />
                  </button>
                </div>
                <div className="space-y-2">
                  {(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map((type) => (
                    <div key={type} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/50">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary">{NOTIFICATION_TYPE_LABELS[type].label}</p>
                        <p className="text-[10px] text-text-tertiary leading-tight">{NOTIFICATION_TYPE_LABELS[type].description}</p>
                      </div>
                      <button
                        onClick={() => {
                          const updated = { ...notifPrefs, [type]: !notifPrefs[type] };
                          setNotifPrefsState(updated);
                          setNotificationPrefs(currentUser.id, updated);
                        }}
                        className={cn(
                          'shrink-0 w-10 h-6 rounded-full transition-colors relative',
                          notifPrefs[type] ? 'bg-success' : 'bg-bg-elevated',
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all flex items-center justify-center',
                            notifPrefs[type] ? 'right-0.5' : 'left-0.5',
                          )}
                        >
                          {notifPrefs[type] ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <X className="w-3 h-3 text-text-quaternary" />
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-border-solid">
                  <button
                    onClick={handleEnableNotifications}
                    disabled={isSubscribing}
                    className="w-full btn btn-primary text-xs py-2"
                  >
                    {isSubscribing ? 'กำลังเปิด...' : 'เปิด Push Notification'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border-solid">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-text-primary leading-tight">
                {currentUser.fullName}
              </p>
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mt-0.5">
                {role === 'employee' ? 'พนักงาน' : 'ผู้จัดการ'}
              </p>
            </div>

            {isManager && (
              <button
                onClick={onToggleRole}
                className="w-9 h-9 bg-white/75 hover:bg-white/90 rounded-full flex items-center justify-center transition-all duration-200 border border-white/70 backdrop-blur-md"
                title="สลับบทบาท"
              >
                <Users className="w-4 h-4 text-text-secondary" />
              </button>
            )}

            <button
              onClick={onLogout}
              className="w-9 h-9 bg-white/75 hover:bg-danger/15 hover:border-danger/30 rounded-full flex items-center justify-center transition-all duration-200 border border-white/70 backdrop-blur-md"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
