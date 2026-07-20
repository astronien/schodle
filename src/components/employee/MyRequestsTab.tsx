// "ระบบขอลา" tab for employees — request history list, extracted from App.tsx.
import { Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import type { ScheduleEntry, ShiftType } from '../../types';

interface MyRequestsTabProps {
  currentUserId: string;
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  onCancelRequest: (id: string) => void;
}

export function MyRequestsTab({ currentUserId, schedules, shiftTypes, onCancelRequest }: MyRequestsTabProps) {
  const myRequests = schedules
    .filter(
      (s) =>
        s.employeeId === currentUserId &&
        s.createdBy === 'employee' &&
        (s.status === 'approved' || s.status === 'pending' || s.status === 'rejected'),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4 pb-24">
      <div className="px-4 pt-2">
        <h2 className="text-xl font-bold text-text-primary">ระบบขอลา</h2>
        <p className="text-xs text-text-tertiary">ติดตามสถานะคำขอลาและวันหยุดของคุณ</p>
      </div>

      {myRequests.length === 0 ? (
        <div className="card p-10 text-center mx-4">
          <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-text-quaternary">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-1">ยังไม่มีรายการ</h3>
          <p className="text-sm text-text-tertiary">คุณยังไม่ได้ส่งคำขอลาหรือวันหยุดในขณะนี้</p>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {myRequests.map((s) => {
            const sType = shiftTypes.find((t) => t.id === s.shiftTypeId);
            const isApproved = s.status === 'approved';

            return (
              <div
                key={s.id}
                className={cn(
                  'p-4 rounded-2xl border transition-all duration-200 animate-fade-in',
                  isApproved
                    ? 'bg-success/10 border-success/30'
                    : 'bg-warn/10 border-warn/30',
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm',
                        isApproved ? 'bg-success' : s.status === 'rejected' ? 'bg-danger' : 'bg-warn',
                      )}
                    >
                      {sType?.code || '??'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">{sType?.name || 'ไม่ทราบประเภท'}</span>
                        {s.requestType === 'late_scan' && (
                          <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                            มาสาย/ลืมแสกน
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-tertiary font-medium">
                        {format(new Date(`${s.date}T00:00:00`), 'eeee d MMMM yyyy', { locale: th })}
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-[10px] font-bold px-2 py-1 rounded-lg',
                      isApproved ? 'bg-success/20 text-success' : s.status === 'rejected' ? 'bg-danger/20 text-danger' : 'bg-warn/20 text-warn',
                    )}
                  >
                    {isApproved ? 'อนุมัติแล้ว' : s.status === 'rejected' ? 'ปฏิเสธ' : 'รออนุมัติ'}
                  </div>
                </div>

                {s.status === 'pending' && (
                  <button
                    onClick={() => onCancelRequest(s.id)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-danger/30 text-danger text-xs font-bold hover:bg-danger/5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    ยกเลิกคำขอ
                  </button>
                )}

                {(s.employeeNote || s.managerRemark) && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-border-solid">
                    {s.employeeNote && (
                      <div className="flex gap-2">
                        <div className="text-[10px] font-bold text-text-quaternary uppercase shrink-0">คำขอ:</div>
                        <div className="text-xs text-text-secondary italic">&ldquo;{s.employeeNote}&rdquo;</div>
                      </div>
                    )}
                    {s.managerRemark && (
                      <div className="flex gap-2">
                        <div className="text-[10px] font-bold text-text-quaternary uppercase shrink-0">เหตุผล:</div>
                        <div className="text-xs text-text-primary font-medium">{s.managerRemark}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
