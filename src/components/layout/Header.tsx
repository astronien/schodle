import { Clock, Bell, Users, LogOut } from 'lucide-react';
import type { Employee, UserRole } from '../../types';
import { subscribeToNotifications } from '../../lib/push';
import { useState } from 'react';
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
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      await subscribeToNotifications(currentUser.id);
      alert('เปิดการแจ้งเตือนสำเร็จ!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถเปิดการแจ้งเตือนได้');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-bg-panel/90 backdrop-blur-xl safe-top">

      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center">
            <Clock className="text-white w-4 h-4" />
          </div>
          <h1 className="text-lg sm:text-xl font-medium tracking-tight text-text-primary">
            {appName}
          </h1>

        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleEnableNotifications}
            disabled={isSubscribing}
            className="relative p-2 text-text-tertiary hover:text-brand hover:bg-white/[0.05] rounded-md transition-all duration-200"
            title="เปิดการแจ้งเตือน"
          >
            <Bell className={cn("w-5 h-5", isSubscribing && "animate-pulse text-brand")} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full"></span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-white/[0.08]">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-text-secondary leading-tight">
                {currentUser.fullName}
              </p>
              <p className="text-[10px] font-medium text-text-quaternary uppercase tracking-wider mt-0.5">
                {role === 'employee' ? 'พนักงาน' : 'ผู้จัดการ'}
              </p>
            </div>

            {isManager && (
              <button
                onClick={onToggleRole}
                className="w-9 h-9 bg-white/[0.04] hover:bg-white/[0.07] rounded-md flex items-center justify-center transition-all duration-200 border border-white/[0.08]"
                title="สลับบทบาท"
              >
                <Users className="w-4 h-4 text-text-tertiary" />
              </button>
            )}

            <button
              onClick={onLogout}
              className="w-9 h-9 bg-white/[0.04] hover:bg-danger/10 hover:border-danger/30 rounded-md flex items-center justify-center transition-all duration-200 border border-white/[0.08]"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
