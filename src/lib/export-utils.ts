import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../types';
import { DAY_NAMES_SHORT } from '../config/constants';

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
    const workDays = dayCols.filter((c) => c && c !== 'X' && c !== 'OFF').length;
    return [
      emp.employeeCode, emp.fullName, pos?.name || '', emp.groupId || '',
      ...dayCols,
      workDays,
    ];
  });

  const csvEscape = (val: string) => {
    if (/^[=+\-@\t\r]/.test(val)) return `"'${val}"`;
    return `"${val}"`;
  };
  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => csvEscape(String(c))).join(','))
    .join('\n');
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

  const dayShort = [...DAY_NAMES_SHORT];
  const safe = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const tableRows = employees
    .map((emp) => {
      const dayCells = days
        .map((d) => {
          const dateStr = format(d, 'yyyy-MM-dd');
          const s = monthSchedules.find((sc) => sc.employeeId === emp.id && sc.date === dateStr);
          if (!s) return '<td class="empty"></td>';
          const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
          return `<td class="shift" style="background:${st?.color || '#ccc'};color:#fff">${safe(st?.code || '')}</td>`;
        })
        .join('');
      return `<tr>
        <td class="emp-name">${safe(emp.fullName)}</td>
        <td class="emp-code">${safe(emp.employeeCode)}</td>
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
    ${safe(st.code)} ${safe(st.startTime)}-${safe(st.endTime)}
  </span>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ตารางกะงาน - ${safe(storeName)}</title>
  <style>
    @page { size: A4 landscape; margin: 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun','Sarabun PSK','Noto Sans Thai','Tahoma',sans-serif; color: #1a1a2e; font-size: 8px; }
    .header { text-align: center; margin-bottom: 3px; padding-bottom: 3px; border-bottom: 2px double #1a1a2e; }
    .header h1 { font-size: 14px; margin-bottom: 1px; }
    .header p { font-size: 8px; color: #666; }
    .legend { margin-bottom: 3px; padding: 2px 6px; background: #f5f5f5; border-radius: 3px; line-height: 1.5; font-size: 7px; }
    .table-wrap { width: 100%; overflow: hidden; }
    table { border-collapse: collapse; font-size: 7px; width: 100%; }
    th, td { border: 0.5px solid #bbb; padding: 1px 1px; text-align: center; white-space: nowrap; }
    th { background: #1a1a2e; color: #fff; font-size: 7px; padding: 2px 1px; }
    th small { font-weight: normal; opacity: 0.8; }
    .emp-name { text-align: left; font-weight: 600; white-space: nowrap; background: #fafafa; position: sticky; left: 0; font-size: 7px; padding-left: 3px; }
    .emp-code { text-align: center; font-size: 6px; color: #666; }
    td.shift { font-weight: 700; font-size: 7px; border-radius: 1px; }
    td.empty { background: #fafafa; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 3px; text-align: center; font-size: 7px; color: #999; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${safe(storeName)}</h1>
    <p>ตารางกะงาน ประจำเดือน ${safe(monthStr)} · พิมพ์เมื่อ ${format(new Date(), 'd MMM yyyy HH:mm')}</p>
  </div>
  <div class="legend">${shiftLegend}</div>
  <div class="table-wrap">
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
  </div>
  <div class="footer">Schodle</div>
  <div class="no-print" style="text-align:center;margin-top:12px">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;background:#1a1a2e;color:#fff;border:none;border-radius:6px;">🖨 พิมพ์ตาราง</button>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        var wrap = document.querySelector('.table-wrap');
        if (wrap) {
          var pageW = document.documentElement.clientWidth;
          var tableW = wrap.scrollWidth;
          if (tableW > pageW) {
            wrap.style.zoom = (pageW / tableW * 0.98).toFixed(3);
          }
        }
        window.print();
      }, 300);
    };
  </script>
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

/**
 * Export schedule as PDF
 */
export async function exportPDF(
  currentMonth: Date,
  employees: Employee[],
  schedules: ScheduleEntry[],
  shiftTypes: ShiftType[],
  positions: Position[],
  storeName: string,
): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const monthStr = format(currentMonth, 'MMMM yyyy', { locale: undefined });
  const monthSchedules = schedules.filter((s) => {
    const d = new Date(s.date);
    return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth) && s.status === 'approved';
  });

  const shiftLegend = shiftTypes
    .filter((t) => t.isVisible)
    .map((t) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:11px;"><span style="width:10px;height:10px;border-radius:50%;background:${t.color};display:inline-block;"></span>${t.code} ${t.startTime}-${t.endTime}</span>`)
    .join('');

  const headerCells = days.map((d) => `<th style="padding:4px 2px;font-size:9px;font-weight:700;border-bottom:1px solid #ddd;min-width:22px;text-align:center;">${format(d, 'd')}</th>`).join('');

  const rows = employees.map((emp) => {
    const pos = positions.find((p) => p.id === emp.positionId);
    const cells = days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const s = monthSchedules.find((sc) => sc.employeeId === emp.id && sc.date === dateStr);
      if (!s) return '<td style="padding:3px 2px;border-bottom:1px solid #eee;font-size:9px;text-align:center;"></td>';
      const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
      return `<td style="padding:3px 2px;border-bottom:1px solid #eee;font-size:9px;text-align:center;"><span style="display:inline-block;padding:1px 4px;border-radius:3px;background:${st?.color || '#999'};color:#fff;font-weight:700;font-size:8px;">${st?.code || '?'}</span></td>`;
    }).join('');
    return `<tr><td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:10px;font-weight:600;white-space:nowrap;">${emp.fullName}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:9px;color:#888;">${emp.employeeCode}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:9px;">${pos?.code || ''}</td>${cells}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:-apple-system,system-ui,sans-serif;padding:16px;color:#333;}</style></head><body>
    <div style="margin-bottom:12px;"><h2 style="font-size:16px;font-weight:800;margin-bottom:2px;">${storeName} — ตารางงาน ${monthStr}</h2><p style="font-size:10px;color:#888;">พิมพ์เมื่อ ${new Date().toLocaleDateString('th-TH')} · จำนวน ${employees.length} คน</p></div>
    <div style="margin-bottom:10px;font-size:10px;">${shiftLegend}</div>
    <table style="width:100%;border-collapse:collapse;font-size:10px;"><thead><tr><th style="padding:4px 6px;text-align:left;font-size:10px;font-weight:700;border-bottom:2px solid #333;min-width:100px;">พนักงาน</th><th style="padding:4px 6px;text-align:left;font-size:10px;font-weight:700;border-bottom:2px solid #333;min-width:50px;">รหัส</th><th style="padding:4px 6px;text-align:left;font-size:10px;font-weight:700;border-bottom:2px solid #333;min-width:40px;">ตำแหน่ง</th>${headerCells}</tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;

  const opt = {
    margin: [5, 5, 5, 5] as [number, number, number, number],
    filename: `schedule-${format(currentMonth, 'yyyy-MM')}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4landscape' as const, orientation: 'landscape' as const },
  };

  await html2pdf().set(opt).from(html).save();
}