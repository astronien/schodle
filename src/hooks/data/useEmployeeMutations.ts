// Employee CRUD (create/reset go through Edge Functions), extracted from useData.
import { useCallback } from 'react';
import { dbUpdate, dbDelete } from '../../lib/db-query';
import { invokeEdgeFunction } from '../../lib/edge-functions';
import type { Employee } from '../../types';

interface EmployeeMutationDeps {
  employees: Employee[];
  fetchAll: (silent?: boolean) => Promise<void>;
  refreshEmployees: () => Promise<void>;
  refreshRecurring: () => Promise<void>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useEmployeeMutations({
  employees,
  fetchAll,
  refreshEmployees,
  refreshRecurring,
}: EmployeeMutationDeps) {
  const createEmployee = useCallback(
    async (employee: Omit<Employee, 'id'>) => {
      const dup = employees.find((e) => e.employeeCode === employee.employeeCode);
      if (dup) {
        throw new Error(`รหัสพนักงาน "${employee.employeeCode}" ซ้ำ (มีอยู่แล้ว)`);
      }

      if (!UUID_REGEX.test(employee.positionId)) {
        throw new Error(`position_id "${employee.positionId}" ไม่ใช่ UUID ที่ถูกต้อง`);
      }

      await invokeEdgeFunction<{ id?: string; error?: string }>(
        'create-employee',
        {
          employee_code: employee.employeeCode,
          full_name: employee.fullName,
          position_id: employee.positionId,
          group_id: employee.groupId || null,
          role: employee.role,
          phone: employee.phone || null,
          email: employee.email || null,
          avatar: employee.avatar || null,
          weekly_off_day: typeof employee.weeklyOffDay === 'number' ? employee.weeklyOffDay : null,
        },
        { dispatchAuthExpired: true },
      );

      await fetchAll(true);
    },
    [employees, fetchAll],
  );

  const updateEmployee = useCallback(
    async (employee: Employee) => {
      const oldEmployee = employees.find((e) => e.id === employee.id);
      const codeChanged = oldEmployee && oldEmployee.employeeCode !== employee.employeeCode;

      const updateData: Record<string, unknown> = {
        employee_code: employee.employeeCode,
        full_name: employee.fullName,
        position_id: employee.positionId,
        group_id: employee.groupId || null,
        role: employee.role,
        phone: employee.phone || null,
        email: employee.email || null,
        avatar: employee.avatar || null,
        weekly_off_day: typeof employee.weeklyOffDay === 'number' ? employee.weeklyOffDay : null,
      };

      if (codeChanged) {
        updateData.password_hash = null;
        updateData.must_change_password = true;
      }

      const { error: updErr } = await dbUpdate('employees', updateData, { id: employee.id });

      if (updErr) {
        throw new Error(updErr.message || 'Supabase update failed');
      }

      await fetchAll(true);
    },
    [employees, fetchAll],
  );

  const resetEmployeePassword = useCallback(
    async (employee: Employee) => {
      await invokeEdgeFunction<{ success?: boolean; error?: string }>(
        'reset-employee-password',
        { employee_id: employee.id, employee_code: employee.employeeCode },
        { dispatchAuthExpired: true },
      );
      await refreshEmployees();
    },
    [refreshEmployees],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      // Delete related schedules first to avoid foreign key constraint
      const { error: schedErr } = await dbDelete('schedules', { employee_id: id });
      if (schedErr) {
        console.warn('[deleteEmployee] Failed to delete related schedules:', schedErr.message);
      }
      // Also delete recurring schedules
      const { error: recErr } = await dbDelete('recurring_schedules', { employee_id: id });
      if (recErr) {
        console.warn('[deleteEmployee] Failed to delete recurring schedules:', recErr.message);
      }
      const { error: delErr } = await dbDelete('employees', { id });
      if (delErr) {
        throw new Error(delErr.message || 'Supabase delete failed');
      }
      await Promise.all([refreshEmployees(), refreshRecurring(), fetchAll(true)]);
    },
    [fetchAll, refreshEmployees, refreshRecurring],
  );

  return { createEmployee, updateEmployee, resetEmployeePassword, deleteEmployee };
}
