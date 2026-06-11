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
  _positions: Position[],
  storeName: string,
) {
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const monthStr = format(currentMonth, 'MMMM yyyy');
  const monthSchedules = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
  });

  const dayShort = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  let tableRows = employees
    .map((emp) => {
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
        ${dayCells}
      </tr>`;
    })
    .join('');

  const headerCells = days
    .map((d) => `<th>${format(d, 'd')}<br><small>${dayShort[d.getDay()]}</small></th>`)
    .join('');

  const shiftLegend = shiftTypes
    .filter((t) => t.isVisible)
    .map((st) => `<span style="display:inline-flex;align-items:center;gap:3px;margin-right:10px;font-size:10px;">
    <span style="width:8px;height:8px;border-radius:2px;background:${st.color};display:inline-block"></span>
    ${st.code} ${st.startTime}-${st.endTime}
  </span>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ตารางกะงาน - ${storeName}</title>
  <style>
    @page { size: A4 landscape; margin: 5mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun','Sarabun PSK','Noto Sans Thai','Tahoma',sans-serif; color: #1a1a2e; font-size: 7px; }
    .header { text-align: center; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 2px double #1a1a2e; }
    .header h1 { font-size: 13px; margin-bottom: 1px; }
    .header p { font-size: 8px; color: #666; }
    .legend { margin-bottom: 4px; padding: 3px 6px; background: #f5f5f5; border-radius: 3px; line-height: 1.6; font-size: 7px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #d0d0d0; padding: 1px 0; text-align: center; white-space: nowrap; }
    th { background: #1a1a2e; color: #fff; font-size: 7px; padding: 2px 0; }
    th small { font-weight: normal; opacity: 0.8; }
    .emp-name { text-align: left; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #fafafa; position: sticky; left: 0; font-size: 7px; padding-left: 3px; width: 18%; max-width: 60mm; }
    .emp-code { text-align: center; font-size: 6px; color: #666; width: 5%; }
    td.shift { font-weight: 700; font-size: 7px; border-radius: 1px; }
    td.empty { background: #fafafa; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 4px; text-align: center; font-size: 7px; color: #999; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${storeName}</h1>
    <p>ตารางกะงาน ประจำเดือน ${monthStr} · พิมพ์เมื่อ ${format(new Date(), 'd MMM yyyy HH:mm')}</p>
  </div>
  <div class="legend">${shiftLegend}</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">ชื่อพนักงาน</th>
        <th>รหัส</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <div class="footer">Schodle</div>
  <div class="no-print" style="text-align:center;margin-top:12px">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;background:#1a1a2e;color:#fff;border:none;border-radius:6px;">🖨 พิมพ์ตาราง</button>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
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