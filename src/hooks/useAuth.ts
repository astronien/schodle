/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { clearSessionToken, getSessionToken, setSessionToken } from '../lib/session';
import type { Employee } from '../types';

const AUTH_KEY = 'schodle_auth_employee_id';

export type AuthEmployee = Employee & {
  position?: { code: string; name: string } | null;
  mustChangePassword?: boolean;
};

interface SessionPayload {
  session: string;
  employee: AuthEmployee;
  expiresAt: number;
}

async function callVerifyPassword(employeeCode: string, password: string): Promise<SessionPayload> {
  const { data, error } = await supabase.functions.invoke<SessionPayload>('verify-password', {
    body: { employee_code: employeeCode, password },
  });
  if (error) {
    const message = (data as { error?: string } | null)?.error ?? error.message;
    throw new Error(message);
  }
  if (!data) {
    throw new Error('ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์');
  }
  return data;
}

async function fetchEmployeeProfile(id: string): Promise<AuthEmployee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, position_id, group_id, role, phone, email, avatar, weekly_off_day, must_change_password, positions!employees_position_id_fkey(code, name)')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const positionRaw = (data as { positions?: unknown }).positions;
  const position = Array.isArray(positionRaw) ? positionRaw[0] : positionRaw;
  return {
    id: data.id,
    employeeCode: data.employee_code,
    fullName: data.full_name,
    positionId: data.position_id,
    groupId: data.group_id || undefined,
    role: data.role as Employee['role'],
    phone: data.phone || undefined,
    email: data.email || undefined,
    avatar: data.avatar || undefined,
    weeklyOffDay: typeof data.weekly_off_day === 'number' ? data.weekly_off_day : undefined,
    mustChangePassword: !!data.must_change_password,
    position: (position as { code: string; name: string } | null) ?? null,
  };
}

export function useAuth() {
  const [currentEmployee, setCurrentEmployee] = useState<AuthEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    const storedId = localStorage.getItem(AUTH_KEY);
    const token = getSessionToken();
    if (!storedId || !token) {
      setIsLoading(false);
      return;
    }

    // Check if session token is expired by decoding JWT payload
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) {
          localStorage.removeItem(AUTH_KEY);
          clearSessionToken();
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // If token can't be decoded, clear it
      localStorage.removeItem(AUTH_KEY);
      clearSessionToken();
      setIsLoading(false);
      return;
    }

    const profile = await fetchEmployeeProfile(storedId);
    if (!profile) {
      localStorage.removeItem(AUTH_KEY);
      clearSessionToken();
      setIsLoading(false);
      return;
    }
    setCurrentEmployee(profile);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (employeeCode: string, password: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const result = await callVerifyPassword(employeeCode, password);
      localStorage.setItem(AUTH_KEY, result.employee.id);
      setSessionToken(result.session);
      setCurrentEmployee(result.employee);
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบได้';
      setAuthError(message);
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    clearSessionToken();
    setCurrentEmployee(null);
    window.location.reload();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!currentEmployee) return;
    const profile = await fetchEmployeeProfile(currentEmployee.id);
    if (profile) {
      setCurrentEmployee(profile);
    }
  }, [currentEmployee]);

  const clearMustChangePassword = useCallback(() => {
    setCurrentEmployee((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
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
    refreshProfile,
    clearMustChangePassword,
  };
}
