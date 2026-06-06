import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, Bell, Image, Clock, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getEmployeeMonthlyStats } from '../../lib/schedule-utils';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../../types';

interface ReportPanelProps {
  currentMonth: Date;
  schedules: ScheduleEntry[];
  employees: Employee[];
  shiftTypes: ShiftType[];
  positions: Position[];
}

export function ReportPanel({
  currentMonth,
  schedules,
  employees,
  shiftTypes,
  positions,
}: ReportPanelProps) {
  const [reportEmployeeId, setReportEmployeeId] = useState<string | null>(null);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const monthSchedules = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
  });

  const getEmployeeStats = (empId: string) => getEmployeeMonthlyStats(empId, monthSchedules, shiftTypes);

  const totalEmployees = employees.length;
  const allXc = monthSchedules.filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.code === 'XC').length;
  const allV = monthSchedules.filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.code === 'V').length;
  const allSick = monthSchedules.filter((s) => {
    const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
    return st?.name?.includes('ป่วย') || st?.code === 'SICK';
  }).length;
  const allLate = monthSchedules.filter(
    (s) => s.employeeNote?.includes('มาสาย') || s.employeeNote?.includes('ลืมแสกน')
  ).length;
  const allPending = monthSchedules.filter((s) => s.status === 'pending').length;

  const handleExportCSV = () => {
    const headers = [
      'รหัส', 'ชื่อ', 'ตำแหน่ง',
      ...daysInMonth.map((d) => format(d, 'd/MM')),
      'วันทำงาน', 'ขาด', 'ลา', 'ป่วย', 'สาย',
    ];
    const rows = employees.map((emp) => {
      const stats = getEmployeeStats(emp.id);
      const pos = positions.find((p) => p.id === emp.positionId);
      const dayCols = daysInMonth.map((d) => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const s = monthSchedules.find((sc) => sc.employeeId === emp.id && sc.date === dateStr);
        if (!s) return '';
        const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
        let label = st?.code || '';
        if (s.status === 'pending') label += '(รอ)';
        if (s.swapWithId) label += '(สลับ)';
        return label;
      });
      return [
        emp.employeeCode, emp.fullName, pos?.name || '',
        ...dayCols,
        stats.workDays,
        stats.counts['XC'] || 0, stats.counts['V'] || 0, stats.counts['SICK'] || 0,
        stats.lateCount,
      ];
    });
    const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${format(currentMonth, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (reportEmployeeId) {
    const emp = employees.find((e) => e.id === reportEmployeeId);
    if (!emp) return null;
    const stats = getEmployeeStats(emp.id);
    const pos = positions.find((p) => p.id === emp.positionId);
    const empSchedules = monthSchedules
      .filter((s) => s.employeeId === emp.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setReportEmployeeId(null)}
            className="p-2 rounded-md hover:bg-bg-surface border border-transparent hover:border-border-solid transition-all text-text-tertiary hover:text-text-primary"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-1.5 h-6 bg-brand rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
            รายละเอียดตารางงาน
          </h2>
        </div>

        <div className="card p-5 sm:p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-bg-surface border border-border-solid">
              <img
                src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">{emp.fullName}</h3>
              <p className="text-xs font-semibold text-text-quaternary uppercase tracking-wider">
                {emp.employeeCode} · {pos?.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="p-3 bg-success/10 rounded-lg text-center">
              <p className="text-lg font-bold text-success">{stats.workDays}</p>
              <p className="text-[10px] font-semibold text-success/70 uppercase">วันทำงาน</p>
            </div>
            <div className="p-3 bg-danger/10 rounded-lg text-center">
              <p className="text-lg font-bold text-danger">{stats.counts['XC'] || 0}</p>
              <p className="text-[10px] font-semibold text-danger/70 uppercase">ขาด</p>
            </div>
            <div className="p-3 bg-warn/10 rounded-lg text-center">
              <p className="text-lg font-bold text-warn">{stats.counts['V'] || 0}</p>
              <p className="text-[10px] font-semibold text-warn/70 uppercase">ลา</p>
            </div>
            <div className="p-3 bg-brand/10 rounded-lg text-center">
              <p className="text-lg font-bold text-brand-accent">{stats.counts['SICK'] || 0}</p>
              <p className="text-[10px] font-semibold text-brand/70 uppercase">ป่วย</p>
            </div>
            <div className="p-3 bg-warn/10 rounded-lg text-center">
              <p className="text-lg font-bold text-warn">{stats.lateCount}</p>
              <p className="text-[10px] font-semibold text-warn/70 uppercase">สาย</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-solid">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-quaternary uppercase tracking-wider">วันที่</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-quaternary uppercase tracking-wider">กะงาน</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-quaternary uppercase tracking-wider">สถานะ</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-quaternary uppercase tracking-wider">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {daysInMonth.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const s = empSchedules.find((sc) => sc.date === dateStr);
                  const st = s ? shiftTypes.find((t) => t.id === s.shiftTypeId) : null;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <tr key={dateStr} className={cn('border-b border-white/[0.03]', isWeekend && 'bg-white/[0.01]')}>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-text-primary">{format(day, 'd')}</span>
                        <span className="text-text-quaternary ml-1.5">{format(day, 'EEE', { locale: th })}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        {st ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }}></div>
                            <span className="font-medium text-text-primary">{st.name}</span>
                            <span className="text-text-quaternary text-xs">({st.code})</span>
                          </div>
                        ) : (
                          <span className="text-text-quaternary">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {s ? (
                          <span className={cn(
                            'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md',
                            s.status === 'approved' && 'bg-success/10 text-success',
                            s.status === 'pending' && 'bg-warn/10 text-warn',
                            s.status === 'rejected' && 'bg-danger/10 text-danger',
                          )}>
                            {s.status === 'approved' ? 'อนุมัติ' : s.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธ'}
                          </span>
                        ) : (
                          <span className="text-text-quaternary text-xs">ไม่มีข้อมูล</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {s?.swapWithId && (
                            <span className="text-[10px] font-bold bg-brand/10 text-brand-accent px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              สลับกับ {employees.find((e) => e.id === s.swapWithId)?.fullName || '?'}
                            </span>
                          )}
                          {(s?.employeeNote?.includes('มาสาย') || s?.employeeNote?.includes('ลืมแสกน')) && (
                            <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              มาสาย
                            </span>
                          )}
                          {s?.employeeNote && !s.employeeNote.includes('มาสาย') && !s.employeeNote.includes('ลืมแสกน') && !s.employeeNote.includes('สลับกะ') && (
                            <span className="text-[10px] text-text-tertiary">{s.employeeNote}</span>
                          )}
                          {s?.evidenceUrl && (
                            <a
                              href={s.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold bg-brand/10 text-brand-accent px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-brand/20 transition-colors"
                            >
                              <Image className="w-3 h-3" />
                              ดูหลักฐาน
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-brand rounded-full"></div>
        <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
          รายงานสรุปเดือน {format(currentMonth, 'MMMM yyyy', { locale: th })}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-text-primary">{totalEmployees}</p>
          <p className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">พนักงานทั้งหมด</p>
        </div>
        <div className="card p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-danger">{allXc}</p>
          <p className="text-[10px] font-semibold text-danger/70 uppercase tracking-wider">วันขาด</p>
        </div>
        <div className="card p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-warn">{allV}</p>
          <p className="text-[10px] font-semibold text-warn/70 uppercase tracking-wider">วันลา</p>
        </div>
        <div className="card p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-brand-accent">{allSick}</p>
          <p className="text-[10px] font-semibold text-brand/70 uppercase tracking-wider">วันป่วย</p>
        </div>
        <div className="card p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-warn">{allLate}</p>
          <p className="text-[10px] font-semibold text-warn/70 uppercase tracking-wider">วันสาย</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {allPending > 0 && (
            <span className="text-xs font-semibold bg-warn/10 text-warn px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              {allPending} คำขอรออนุมัติ
            </span>
          )}
        </div>
        <button onClick={handleExportCSV} className="btn btn-ghost text-xs flex items-center gap-1.5">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="space-y-3">
        {employees.map((emp) => {
          const stats = getEmployeeStats(emp.id);
          const pos = positions.find((p) => p.id === emp.positionId);
          const hasAlert = stats.pendingCount > 0 || stats.swapCount > 0;
          return (
            <button
              key={emp.id}
              onClick={() => setReportEmployeeId(emp.id)}
              className="w-full card p-4 sm:p-5 rounded-xl flex items-center gap-4 hover:border-brand/30 transition-all text-left group"
            >
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg-surface border border-border-solid shrink-0">
                <img
                  src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-text-primary truncate">{emp.fullName}</p>
                  {hasAlert && <span className="w-2 h-2 bg-warn rounded-full animate-pulse shrink-0"></span>}
                </div>
                <p className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">
                  {emp.employeeCode} · {pos?.name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-md">{stats.workDays} ทำงาน</span>
                  {stats.counts['XC'] > 0 && <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-1 rounded-md">{stats.counts['XC']} ขาด</span>}
                  {stats.counts['V'] > 0 && <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-1 rounded-md">{stats.counts['V']} ลา</span>}
                  {(stats.counts['SICK'] || 0) > 0 && <span className="text-[10px] font-bold bg-brand/10 text-brand-accent px-2 py-1 rounded-md">{stats.counts['SICK']} ป่วย</span>}
                  {stats.lateCount > 0 && <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-1 rounded-md">{stats.lateCount} สาย</span>}
                  {stats.pendingCount > 0 && <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-1 rounded-md">{stats.pendingCount} รอ</span>}
                  {stats.swapCount > 0 && <span className="text-[10px] font-bold bg-brand/10 text-brand-accent px-2 py-1 rounded-md">{stats.swapCount} สลับ</span>}
                </div>
                <ChevronRight className="w-4 h-4 text-text-quaternary group-hover:text-brand transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
