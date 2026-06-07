import { useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Users, LayoutGrid, Check } from 'lucide-react';
import { getRequestTypeLabel } from '../../lib/schedule-utils';
import type { Employee, Position, ScheduleRequest, ShiftType } from '../../types';

interface RequestListProps {
  requests: ScheduleRequest[];
  employees: Employee[];
  shiftTypes: ShiftType[];
  positions: Position[];
  search: string;
  onSearchChange: (value: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function RequestList({
  requests,
  employees,
  shiftTypes,
  positions,
  search,
  onSearchChange,
  onApprove,
  onReject,
}: RequestListProps) {
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-warn rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
            คำขอที่รอการพิจารณา
          </h2>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัส / กะ"
            className="input-field w-full md:w-72"
          />
          <button onClick={() => onSearchChange('')} className="btn btn-ghost text-xs whitespace-nowrap">
            ล้าง
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {requests.map((request) => {
          const employee = employees.find((e) => e.id === request.employeeId);
          const requestShiftType = shiftTypes.find((t) => t.id === request.shiftTypeId);
          return (
            <div key={request.id} className="card p-5 sm:p-6 rounded-xl animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-bg-surface border border-surface-200">
                  <img
                    src={
                      employee?.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee?.fullName}`
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary">{employee?.fullName}</div>
                  <div className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">
                    {positions.find((p) => p.id === employee?.positionId)?.name}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex justify-between items-center p-3 bg-bg-panel rounded-lg">
                  <span className="text-xs font-medium text-text-tertiary">วันที่ขอ</span>
                  <span className="text-sm font-bold text-text-primary">
                    {format(new Date(request.date), 'd MMM yyyy', { locale: th })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-panel rounded-lg">
                  <span className="text-xs font-medium text-text-tertiary">กะงาน</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: requestShiftType?.color }}></div>
                    <span className="text-sm font-bold text-text-primary">
                      {requestShiftType?.name} ({requestShiftType?.code})
                    </span>
                  </div>
                </div>

                    {request.requestType && (
                      <div className="p-3 bg-brand/15 rounded-lg border border-brand/20 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-brand uppercase tracking-wide">
                            {getRequestTypeLabel(request)}
                          </span>
                          {request.requestType === 'swap' && <Users className="w-4 h-4 text-text-primary" />}
                        </div>
                        {request.requestType === 'swap' && (() => {
                          const targetEmp = employees.find((e) => e.id === request.swapWithId);
                          return (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface border border-brand/20 shadow-sm">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${targetEmp?.fullName}`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-text-primary leading-none mb-0.5">
                                  {targetEmp?.fullName}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                {request.employeeNote && (
                  <div className="p-3 bg-warn/10 rounded-lg border border-warn/30">
                    <span className="text-[10px] font-bold text-warn uppercase tracking-wide block mb-1">
                      หมายเหตุ
                    </span>
                    <p className="text-sm font-semibold text-warn leading-relaxed">
                      &ldquo;{request.employeeNote}&rdquo;
                    </p>
                  </div>
                )}

                {request.evidenceUrl && (
                  <div className="p-3 bg-brand/10 rounded-lg border border-brand/20">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wide block mb-2">
                      หลักฐานแนบ
                    </span>
                    <a
                      href={request.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-border-solid hover:border-brand/40 transition-colors"
                    >
                      <img src={request.evidenceUrl} alt="หลักฐาน" className="w-full h-32 object-cover" />
                      <div className="flex items-center justify-center gap-1.5 py-1.5 bg-white/[0.03] text-brand-accent text-[10px] font-semibold uppercase tracking-wide">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        ดูรูปเต็มขนาด
                      </div>
                    </a>
                  </div>
                )}

                <div className="pt-2">
                  <label className="text-[10px] font-bold text-text-quaternary uppercase tracking-wide block mb-1.5">
                    หมายเหตุของหัวหน้า (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={remarks[request.id] || ''}
                    onChange={(e) => setRemarks((prev) => ({ ...prev, [request.id]: e.target.value }))}
                    placeholder="เช่น เหตุผลที่ปฏิเสธ..."
                    className="w-full bg-bg-panel border border-border-solid rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-quaternary focus:border-brand/40 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => onReject(request.id)} className="btn btn-ghost py-2.5 text-xs font-semibold">
                  ปฏิเสธ
                </button>
                <button
                  onClick={() => onApprove(request.id)}
                  className="btn btn-primary py-2.5 text-xs font-semibold shadow-lg shadow-raised"
                >
                  อนุมัติ
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {requests.length === 0 && (
        <div className="card p-12 sm:p-16 text-center border-dashed">
          <div className="w-14 h-14 bg-bg-panel rounded-full flex items-center justify-center mx-auto mb-4 text-text-quaternary">
            <Check className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-text-primary mb-1">ไม่มีคำขอรออนุมัติ</h3>
          <p className="text-sm font-medium text-text-quaternary">
            เมื่อมีพนักงานขอเปลี่ยนหรือลงกะงานพิเศษ จะปรากฏที่นี่
          </p>
        </div>
      )}
    </div>
  );
}
