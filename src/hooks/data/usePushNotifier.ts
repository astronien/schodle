// Push-notification helpers with dedup windows, extracted from useData.
import { useCallback, useRef } from 'react';
import { sendPushToEmployee, sendPushToRole } from '../../lib/push';
import {
  PUSH_DEDUP_WINDOW_MS,
  PUSH_DEDUP_MAP_MAX_SIZE,
  RECENT_NOTIFICATION_WINDOW_MS,
} from '../../config/constants';

export type NotifType = 'schedule_changes' | 'approval_status' | 'new_requests';

export function usePushNotifier() {
  // Tracks realtime events we've already notified about (shared with the
  // realtime subscription and updateSchedule so they don't double-notify).
  const recentNotificationRef = useRef<Map<string, number>>(new Map());
  const recentPushKeys = useRef(new Map<string, number>());

  const shouldSendPush = useCallback((key: string): boolean => {
    const now = Date.now();
    const last = recentPushKeys.current.get(key);
    if (last && now - last < PUSH_DEDUP_WINDOW_MS) return false;
    recentPushKeys.current.set(key, now);
    if (recentPushKeys.current.size > PUSH_DEDUP_MAP_MAX_SIZE) {
      for (const [k, t] of recentPushKeys.current) {
        if (now - t > PUSH_DEDUP_WINDOW_MS * 2) recentPushKeys.current.delete(k);
      }
    }
    return true;
  }, []);

  const pruneRecentNotifications = useCallback(() => {
    const now = Date.now();
    for (const [k, ts] of recentNotificationRef.current.entries()) {
      if (now - ts > RECENT_NOTIFICATION_WINDOW_MS) {
        recentNotificationRef.current.delete(k);
      }
    }
  }, []);

  const sendPush = useCallback(
    async (employeeId: string, title: string, body: string, url?: string, notifType?: NotifType) => {
      const dedupKey = `e:${employeeId}:${title}:${body}`;
      if (!shouldSendPush(dedupKey)) return;
      try {
        const result = await sendPushToEmployee(employeeId, title, body, url, notifType);
        if (!result.success) {
          console.warn('[sendPush] Non-fatal failure:', result.error);
        } else if (typeof result.sent === 'number' && result.failed && result.failed > 0) {
          console.warn(`[sendPush] Partial delivery: ${result.sent} sent, ${result.failed} failed`);
        }
      } catch (err) {
        console.error('[sendPush] Notification failed:', err);
      }
    },
    [shouldSendPush],
  );

  const sendPushRole = useCallback(
    async (role: string, title: string, body: string, url?: string) => {
      const dedupKey = `r:${role}:${title}:${body}`;
      if (!shouldSendPush(dedupKey)) return;
      try {
        const result = await sendPushToRole(role, title, body, url);
        if (!result.success) {
          console.warn('[sendPushRole] Non-fatal failure:', result.error);
        } else if (typeof result.sent === 'number' && result.failed && result.failed > 0) {
          console.warn(`[sendPushRole] Partial delivery: ${result.sent} sent, ${result.failed} failed`);
        }
      } catch (err) {
        console.error('[sendPushRole] Notification failed:', err);
      }
    },
    [shouldSendPush],
  );

  return { sendPush, sendPushRole, recentNotificationRef, pruneRecentNotifications };
}
