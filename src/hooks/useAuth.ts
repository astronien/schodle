import { useState, useEffect, useCallback } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import type { Employee } from '../types';

const AUTH_KEY = 'schodle_auth_employee_id';

export type AuthEmployee = Employee & {
  position?: { code: string; name: string };
};

export function useAuth() {
  const [currentEmployee, setCurrentEmployee] = useState<AuthEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    const storedId = localStorage.getItem(AUTH_KEY);
    if (!storedId) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*, positions(code, name)')
      .eq('id', storedId)
      .single();

    if (error || !data) {
      localStorage.removeItem(AUTH_KEY);
      setIsLoading(false);
      return;
    }

    setCurrentEmployee({
      id: data.id,
      employeeCode: data.employee_code,
      fullName: data.full_name,
      positionId: data.position_id,
      role: data.role as Employee['role'],
      phone: data.phone || undefined,
      email: data.email || undefined,
      avatar: data.avatar || undefined,
      weeklyOffDay: typeof data.weekly_off_day === 'number' ? data.weekly_off_day : undefined,
      position: data.positions,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (employeeCode: string, password: string) => {
    setAuthError(null);
    setIsLoading(true);

    const { data, error } = await supabase
      .from('employees')
      .select('*, positions(code, name)')
      .eq('employee_code', employeeCode)
      .single();

    if (error || !data) {
      setAuthError('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
      setIsLoading(false);
      return false;
    }

    if (!data.password_hash) {
      setAuthError('บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ');
      setIsLoading(false);
      return false;
    }

    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) {
      setAuthError('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
      setIsLoading(false);
      return false;
    }

    localStorage.setItem(AUTH_KEY, data.id);
    setCurrentEmployee({
      id: data.id,
      employeeCode: data.employee_code,
      fullName: data.full_name,
      positionId: data.position_id,
      role: data.role as Employee['role'],
      phone: data.phone || undefined,
      email: data.email || undefined,
      avatar: data.avatar || undefined,
      weeklyOffDay: typeof data.weekly_off_day === 'number' ? data.weekly_off_day : undefined,
      position: data.positions,
    });
    setIsLoading(false);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setCurrentEmployee(null);
    window.location.reload();
  }, []);

  const isManager =
    currentEmployee?.position?.code === 'BSM' ||
    currentEmployee?.position?.code === 'ABSM';

  return {
    currentEmployee,
    isLoggedIn: !!currentEmployee,
    isManager,
    isLoading,
    authError,
    login,
    logout,
  };
}
