import { Clock, Bell, Users, LogOut } from 'lucide-react';
import type { Employee, UserRole } from '../../types';
import { subscribeToNotifications } from '../../lib/push';
import { useState } from 'react';
import { useToast } from '../../lib/toast';
import { cn } from '../../lib/utils';

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
    <header className="sticky top-0 z-30 border-b border-border-solid bg-bg-panel/90 backdrop-blur-xl safe-top">

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
          <button
            onClick={handleEnableNotifications}
            disabled={isSubscribing}
            className="relative p-2 text-text-tertiary hover:text-brand hover:bg-bg-surface rounded-full transition-all duration-200"
            title="เปิดการแจ้งเตือน"
          >
            <Bell className={cn("w-5 h-5", isSubscribing && "animate-pulse text-brand")} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full"></span>
          </button>

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
                className="w-9 h-9 bg-bg-surface hover:bg-brand/10 rounded-full flex items-center justify-center transition-all duration-200 border border-border-solid"
                title="สลับบทบาท"
              >
                <Users className="w-4 h-4 text-text-secondary" />
              </button>
            )}

            <button
              onClick={onLogout}
              className="w-9 h-9 bg-bg-surface hover:bg-danger/10 hover:border-danger/30 rounded-full flex items-center justify-center transition-all duration-200 border border-border-solid"
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
