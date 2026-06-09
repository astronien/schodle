import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../types';

/**
 * Export schedules as CSV
 */
export function exportCSV(
  currentMonth: Date,
  employees: Employee[],
  schedules: ScheduleEntry[],
  shiftTypes: ShiftType[],
  positions: Position[],
) {
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const monthSchedules = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
  });

  const headers = [
    'รหัสพนักงาน', 'ชื่อ', 'ตำแหน่ง', 'กลุ่ม',
    ...days.map((d) => format(d, 'd/MM')),
    'จำนวนวันที่ทำงาน',
  ];

  const rows = employees.map((emp) => {
    const pos = positions.find((p) => p.id === emp.positionId);
    const dayCols = days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const s = monthSchedules.find((sc) => sc.employeeId === emp.id && sc.date === dateStr);
      if (!s) return '';
      const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
      return st?.code || '';
    });
    const workDays = dayCols.filter((c) => c && c !== 'X').length;
    return [
      emp.employeeCode, emp.fullName, pos?.name || '', emp.groupId || '',
      ...dayCols,
      workDays,
    ];
  });

  const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schedule-${format(currentMonth, 'yyyy-MM')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and open a print-friendly HTML view of the schedule
 */
export function printSchedule(
  currentMonth: Date,
  employees: Employee[],
  schedules: ScheduleEntry[],
  shiftTypes: ShiftType[],
  positions: Position[],
  storeName: string,
) {
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const monthStr = format(currentMonth, 'MMMM yyyy');
  const monthSchedules = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
  });

  const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  let tableRows = employees
    .map((emp) => {
      const pos = positions.find((p) => p.id === emp.positionId);
      const dayCells = days
        .map((d) => {
          const dateStr = format(d, 'yyyy-MM-dd');
          const s = monthSchedules.find((sc) => sc.employeeId === emp.id && sc.date === dateStr);
          if (!s) return '<td class="empty"></td>';
          const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
          return `<td class="shift" style="background:${st?.color || '#ccc'};color:#fff">${st?.code || ''}</td>`;
        })
        .join('');
      return `<tr>
        <td class="emp-name">${emp.fullName}</td>
        <td class="emp-code">${emp.employeeCode}</td>
        <td class="emp-pos">${pos?.name || ''}</td>
        ${dayCells}
      </tr>`;
    })
    .join('');

  // Summary row
  const headerCells = days
    .map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dailyCount = new Set(
        monthSchedules.filter((s) => s.date === dateStr).map((s) => s.employeeId),
      ).size;
      return `<th>${format(d, 'd')}<br><small>${dayNames[d.getDay()]}</small><br><small>${dailyCount} คน</small></th>`;
    })
    .join('');

  const shiftLegend = shiftTypes
    .filter((t) => t.isVisible)
    .map((st) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:11px;">
    <span style="width:10px;height:10px;border-radius:3px;background:${st.color};display:inline-block"></span>
    ${st.name} (${st.code} ${st.startTime}-${st.endTime})
  </span>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ตารางกะงาน - ${storeName}</title>
  <style>
    @page { size: landscape; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun','Sarabun PSK','Noto Sans Thai','Tahoma',sans-serif; padding: 20px; color: #1a1a2e; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px double #1a1a2e; }
    .header h1 { font-size: 22px; margin-bottom: 4px; }
    .header p { font-size: 13px; color: #666; }
    .legend { margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ccc; padding: 4px 3px; text-align: center; white-space: nowrap; }
    th { background: #1a1a2e; color: #fff; font-size: 10px; position: sticky; top: 0; }
    th small { font-weight: normal; opacity: 0.8; }
    .emp-name { text-align: left; font-weight: 600; min-width: 130px; background: #fafafa; position: sticky; left: 0; }
    .emp-code { text-align: center; font-size: 10px; color: #666; min-width: 60px; }
    .emp-pos { text-align: center; font-size: 10px; color: #666; min-width: 70px; }
    td.shift { font-weight: 700; font-size: 10px; border-radius: 2px; }
    td.empty { background: #fafafa; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${storeName}</h1>
    <p>ตารางกะงาน ประจำเดือน ${monthStr}</p>
    <p>พิมพ์เมื่อ ${format(new Date(), 'd MMMM yyyy HH:mm')}</p>
  </div>
  <div class="legend">${shiftLegend}</div>
  <div style="overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th style="text-align:left;min-width:130px">ชื่อพนักงาน</th>
          <th style="min-width:60px">รหัส</th>
          <th style="min-width:70px">ตำแหน่ง</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>Schodle · สร้างโดยระบบจัดกะอัตโนมัติ</p>
  </div>
  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer;background:#1a1a2e;color:#fff;border:none;border-radius:8px;">🖨 พิมพ์ตาราง</button>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

/**
 * Export as simple text table for quick paste into chat/email
 */
export function exportTextSummary(
  currentMonth: Date,
  employees: Employee[],
  schedules: ScheduleEntry[],
  shiftTypes: ShiftType[],
): string {
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const monthStr = format(currentMonth, 'MMMM yyyy');
  const monthSchedules = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
  });

  const dayShort = days.map((d) => format(d, 'd'));
  const header = 'พนักงาน\t' + dayShort.join('\t');
  const rows = employees.map((emp) => {
    const cells = days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const s = monthSchedules.find((sc) => sc.employeeId === emp.id && sc.date === dateStr);
      if (!s) return '-';
      const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
      return st?.code || '-';
    });
    return `${emp.fullName}\t${cells.join('\t')}`;
  });

  return `ตารางกะ ${monthStr}\n\n${header}\n${rows.join('\n')}`;
}