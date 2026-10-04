// Realtime subscription + polling + visibility refresh for the schedules
// table, including the throttled refetch queue. Extracted from useData.
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { getSessionToken } from '../../lib/session';
import { REALTIME_THROTTLE_MS, POLL_INTERVAL_MS, REALTIME_ERROR_RELOAD_COOLDOWN_MS } from '../../config/constants';
import type { ScheduleRow } from './mappers';
import type { NotifType } from './usePushNotifier';

interface RealtimeDeps {
  fetchAll: (silent?: boolean) => Promise<void>;
  /** Sequenced schedules refresh — never lets an older response win. */
  refreshSchedules: () => Promise<void>;
  sendPush: (employeeId: string, title: string, body: string, url?: string, notifType?: NotifType) => Promise<void>;
  recentNotificationRef: React.RefObject<Map<string, number>>;
  pruneRecentNotifications: () => void;
}

export function useRealtimeSchedules({
  fetchAll,
  refreshSchedules,
  sendPush,
  recentNotificationRef,
  pruneRecentNotifications,
}: RealtimeDeps) {
  const realtimeInFlightRef = useRef<Promise<void> | null>(null);
  const realtimePendingRef = useRef<boolean>(false);

  // Coalesces bursts into at most one in-flight refresh plus one queued.
  const refreshSchedulesThrottled = useCallback(() => {
    const run = async (): Promise<void> => {
      try {
        await refreshSchedules();
      } catch (err) {
        console.error('[refreshSchedulesThrottled] failed:', err);
      } finally {
        if (realtimePendingRef.current) {
          realtimePendingRef.current = false;
          // Track the chained run as in flight too — previously it was not,
          // so new triggers started yet more overlapping fetches.
          realtimeInFlightRef.current = run();
        } else {
          realtimeInFlightRef.current = null;
        }
      }
    };
    if (realtimeInFlightRef.current) {
      realtimePendingRef.current = true;
      return;
    }
    realtimeInFlightRef.current = run();
  }, [refreshSchedules]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // supabase-js keeps retrying a broken channel, firing CHANNEL_ERROR /
    // TIMED_OUT over and over. Each used to trigger a full 7-table reload
    // (twice), flooding the backend — and every failed reload was a chance to
    // clobber fresh data. Throttle those reloads; the 15s poll keeps
    // schedules current regardless.
    let lastErrorReloadAt = 0;
    const reloadAfterRealtimeFailure = () => {
      const now = Date.now();
      if (now - lastErrorReloadAt < REALTIME_ERROR_RELOAD_COOLDOWN_MS) return;
      lastErrorReloadAt = now;
      void fetchAll(true);
    };

    const channel = supabase
      .channel('realtime:schedules')
      .on('system', { event: 'CHANNEL_ERROR' }, () => {
        const token = getSessionToken();
        if (token) console.warn('[realtime] channel error — will refresh data and retry');
        reloadAfterRealtimeFailure();
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(refreshSchedulesThrottled, 5000);
      })
      .on('system', { event: 'TIMED_OUT' }, () => {
        if (getSessionToken()) console.warn('[realtime] timed out — refreshing');
        reloadAfterRealtimeFailure();
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
