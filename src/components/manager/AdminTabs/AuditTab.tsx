import { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, Filter, Users } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { AdminPageHeader } from '../AdminSidebar';

type AuditEntry = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  employee_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  employees: { full_name: string | null } | null;
};

const ACTION_LABELS: Record<string, string> = {
  create: 'สร้าง',
  update: 'แก้ไข',
  delete: 'ลบ',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'text-success bg-success/10 border-success/20',
  update: 'text-warn bg-warn/10 border-warn/20',
  delete: 'text-danger bg-danger/10 border-danger/20',
};

const TABLE_LABELS: Record<string, string> = {
  employees: 'พนักงาน',
  schedules: 'ตารางงาน',
  positions: 'ตำแหน่ง',
  shift_types: 'กะงาน',
  position_groups: 'กลุ่มตำแหน่ง',
  recurring_schedules: 'ตารางซ้ำ',
  settings: 'ตั้งค่า',
};

export function AuditTab() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          employee_id,
          action,
          table_name,
          record_id,
          old_data,
          new_data,
          created_at,
          employees!audit_logs_employee_id_fkey ( full_name )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (tableFilter) {
        query = query.eq('table_name', tableFilter);
      }
      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) throw fetchErr;

      setLogs(((data || []) as unknown as AuditLogRow[]).map((row) => ({
        id: row.id,
        employee_id: row.employee_id,
        employee_name: row.employees?.full_name || null,
        action: row.action,
        table_name: row.table_name,
        record_id: row.record_id,
        old_data: row.old_data,
        new_data: row.new_data,
        created_at: row.created_at,
      })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [tableFilter, actionFilter]);

  useEffect(() => {
    // Deferred to a microtask so fetchLogs' synchronous setState calls don't
    // run inside the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => { void fetchLogs(); });
  }, [fetchLogs]);

  return (
    <div className="animate-fade-in pb-24">
      <AdminPageHeader
        icon={History}
        title="บันทึกการใช้งาน"
        description="ประวัติการเปลี่ยนแปลงข้อมูลทั้งหมดในระบบ"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-quaternary" />
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="input-field text-xs py-1.5 px-3"
          >
            <option value="">ทุกตาราง</option>
            {Object.entries(TABLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-field text-xs py-1.5 px-3"
          >
            <option value="">ทุกการกระทำ</option>
            <option value="create">สร้าง</option>
            <option value="update">แก้ไข</option>
            <option value="delete">ลบ</option>
          </select>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn btn-ghost text-xs px-3 py-1.5"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          รีเฟรช
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-solid">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-bg-surface border-b border-border-solid">
              <th className="text-left p-3 font-bold text-text-quaternary uppercase tracking-wider">เวลา</th>
              <th className="text-left p-3 font-bold text-text-quaternary uppercase tracking-wider">พนักงาน</th>
              <th className="text-left p-3 font-bold text-text-quaternary uppercase tracking-wider">รายการ</th>
              <th className="text-left p-3 font-bold text-text-quaternary uppercase tracking-wider">การกระทำ</th>
              <th className="text-left p-3 font-bold text-text-quaternary uppercase tracking-wider">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-text-tertiary">
                  <span className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin block mx-auto mb-2" />
                  กำลังโหลด...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-danger">{error}</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-text-quaternary">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  ไม่พบรายการ
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr key={entry.id} className="border-b border-border-solid hover:bg-bg-surface/50 transition-colors">
                  <td className="p-3 text-text-tertiary whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-text-quaternary" />
                      <span className="font-semibold text-text-primary">
                        {entry.employee_name || 'ระบบ'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-text-secondary">
                    {TABLE_LABELS[entry.table_name] || entry.table_name}
                  </td>
                  <td className="p-3">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', ACTION_COLORS[entry.action] || '')}>
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                  </td>
                  <td className="p-3 text-text-secondary max-w-[300px] truncate">
                    {entry.action === 'create' && entry.new_data && (
                      <span>เพิ่มข้อมูลใหม่</span>
                    )}
                    {entry.action === 'delete' && entry.old_data && (
                      <span>ลบข้อมูล</span>
                    )}
                    {entry.action === 'update' && entry.old_data && entry.new_data && (
                      <span className="flex flex-wrap gap-1">
                        {Object.keys(entry.new_data).filter((k) => {
                          const old = JSON.stringify(entry.old_data?.[k]);
                          const newVal = JSON.stringify(entry.new_data?.[k]);
                          return old !== newVal && !['updated_at', 'created_at'].includes(k);
                        }).slice(0, 3).map((key) => {
                          const label = key.replace(/_/g, ' ');
                          return (
                            <span key={key} className="bg-bg-elevated px-1.5 py-0.5 rounded text-[9px]">
                              {label}
                            </span>
                          );
                        })}
                        {Object.keys(entry.new_data).filter((k) => {
                          const old = JSON.stringify(entry.old_data?.[k]);
                          const newVal = JSON.stringify(entry.new_data?.[k]);
                          return old !== newVal && !['updated_at', 'created_at'].includes(k);
                        }).length > 3 && (
                          <span className="text-text-quaternary text-[9px]">
                            +{Object.keys(entry.new_data).filter((k) => {
                              const old = JSON.stringify(entry.old_data?.[k]);
                              const newVal = JSON.stringify(entry.new_data?.[k]);
                              return old !== newVal && !['updated_at', 'created_at'].includes(k);
                            }).length - 3} รายการ
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
