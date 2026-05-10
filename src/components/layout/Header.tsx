import { Clock, Bell, Users } from 'lucide-react';
import type { Employee, UserRole } from '../../types';

interface HeaderProps {
  currentUser: Employee;
  role: UserRole;
  onToggleRole: () => void;
}

export function Header({ currentUser, role, onToggleRole }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-bg-panel/80 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center">
            <Clock className="text-white w-4 h-4" />
          </div>
          <h1 className="text-lg sm:text-xl font-medium tracking-tight text-text-primary">
            ShiftFlow
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="relative p-2 text-text-tertiary hover:text-text-primary hover:bg-white/[0.05] rounded-md transition-all duration-200">
            <Bell className="w-5 h-5" />
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
            <button
              onClick={onToggleRole}
              className="w-9 h-9 bg-white/[0.04] hover:bg-white/[0.07] rounded-md flex items-center justify-center transition-all duration-200 border border-white/[0.08]"
              title="สลับบทบาท"
            >
              <Users className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
