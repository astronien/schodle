// Realtime subscription + polling + visibility refresh for the schedules
// table, including the throttled refetch queue. Extracted from useData.
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { getSessionToken } from '../../lib/session';
import { REALTIME_THROTTLE_MS, POLL_INTERVAL_MS } from '../../config/constants';
import type { ScheduleEntry } from '../../types';
import type { ScheduleRow } from './mappers';
import type { NotifType } from './usePushNotifier';

interface RealtimeDeps {
  fetchAll: (silent?: boolean) => Promise<void>;
  fetchSchedulesOnly: () => Promise<ScheduleEntry[]>;
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
  sendPush: (employeeId: string, title: string, body: string, url?: string, notifType?: NotifType) => Promise<void>;
  recentNotificationRef: React.RefObject<Map<string, number>>;
  pruneRecentNotifications: () => void;
}

export function useRealtimeSchedules({
  fetchAll,
  fetchSchedulesOnly,
  setSchedules,
  sendPush,
  recentNotificationRef,
  pruneRecentNotifications,
}: RealtimeDeps) {
  const realtimeInFlightRef = useRef<Promise<void> | null>(null);
  const realtimePendingRef = useRef<boolean>(false);

  const refreshSchedulesThrottled = useCallback(() => {
    const run = async () => {
      try {
        const fresh = await fetchSchedulesOnly();
        setSchedules(fresh);
      } catch (err) {
        console.error('[refreshSchedulesThrottled] failed:', err);
      } finally {
        realtimeInFlightRef.current = null;
        if (realtimePendingRef.current) {
          realtimePendingRef.current = false;
          void run();
        }
      }
    };
    if (realtimeInFlightRef.current) {
      realtimePendingRef.current = true;
      return;
    }
    realtimeInFlightRef.current = run();
  }, [fetchSchedulesOnly, setSchedules]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('realtime:schedules')
      .on('system', { event: 'CHANNEL_ERROR' }, () => {
        const token = getSessionToken();
        if (token) console.warn('[realtime] channel error — will refresh data and retry');
        void fetchAll(true);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          void fetchAll(true);
        }, 5000);
      })
      .on('system', { event: 'TIMED_OUT' }, () => {
        if (getSessionToken()) console.warn('[realtime] timed out — refreshing');
        void fetchAll(true);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        (payload) => {
          const eventType = payload.eventType;
          const record = (payload.new || payload.old) as Partial<ScheduleRow> | undefined;
          const employeeId = record?.employee_id;
          const date = record?.date;
          const status = record?.status;
          const shiftTypeId = record?.shift_type_id;

          if (employeeId && date) {
            pruneRecentNotifications();
            const key = `${eventType}:${employeeId}:${date}:${status || ''}:${shiftTypeId || ''}`;
            if (!recentNotificationRef.current.has(key)) {
              const title = 'อัปเดตตารางงาน';
              let body = `ตารางงานวันที่ ${date} มีการเปลี่ยนแปลง`;
              let notifType: 'schedule_changes' | 'approval_status' = 'schedule_changes';

              if (eventType === 'INSERT') {
                body = `มีรายการตารางงานใหม่วันที่ ${date}`;
              } else if (eventType === 'DELETE') {
                body = `รายการตารางงานวันที่ ${date} ถูกลบ`;
              } else if (status === 'approved') {
                body = `กะงานวันที่ ${date} ได้รับการอนุมัติแล้ว`;
                notifType = 'approval_status';
              } else if (status === 'rejected') {
                body = `กะงานวันที่ ${date} ไม่ได้รับการอนุมัติ`;
                notifType = 'approval_status';
              }

              recentNotificationRef.current.set(key, Date.now());
              void sendPush(employeeId, title, body, '/dashboard', notifType);
            }
          }

          setTimeout(refreshSchedulesThrottled, REALTIME_THROTTLE_MS);
        },
      )
      .subscribe();

    const pollId = setInterval(() => {
      refreshSchedulesThrottled();
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSchedulesThrottled();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisibility);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [refreshSchedulesThrottled, sendPush, fetchAll, pruneRecentNotifications, recentNotificationRef]);
}
