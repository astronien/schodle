import { supabase } from './supabase';
import { getSessionToken } from './session';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export class PushNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PushNotSupportedError';
  }
}

export class PushPermissionDeniedError extends Error {
  constructor() {
    super('กรุณาอนุญาตการแจ้งเตือนในตั้งค่าเบราว์เซอร์');
    this.name = 'PushPermissionDeniedError';
  }
}

export class PushConfigError extends Error {
  constructor() {
    super('ระบบยังไม่ได้ตั้งค่า VAPID key กรุณาติดต่อผู้ดูแล');
    this.name = 'PushConfigError';
  }
}

export type PushSubscriptionState =
  | { state: 'unsupported' }
  | { state: 'denied' }
  | { state: 'default' }
  | { state: 'granted'; subscribed: boolean };

export function getVapidPublicKey(): string {
  if (!VAPID_PUBLIC_KEY) {
    throw new PushConfigError();
  }
  return VAPID_PUBLIC_KEY;
}

export function getNotificationPermission(): NotificationPermission | 'unavailable' {
  if (typeof Notification === 'undefined') return 'unavailable';
  return Notification.permission;
}

export async function getSubscriptionState(): Promise<PushSubscriptionState> {
  if (typeof window === 'undefined') return { state: 'unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    return { state: 'unsupported' };
  }
  const permission = Notification.permission;
  if (permission === 'denied') return { state: 'denied' };
  if (permission === 'default') return { state: 'default' };
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return { state: 'granted', subscribed: !!sub };
  } catch {
    return { state: 'granted', subscribed: false };
  }
}

export interface PushDiagnostic {
  serviceWorker: 'registered' | 'unregistered' | 'unsupported';
  permission: NotificationPermission | 'unavailable';
  subscribed: boolean;
  endpoint?: string;
  isIOS: boolean;
  isStandalone: boolean;
}

export async function getPushDiagnostic(): Promise<PushDiagnostic> {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  const isStandalone = detectStandalone();

  const hasSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker;
  const hasPush = typeof window !== 'undefined' && 'PushManager' in window;
  if (!hasSW || !hasPush) {
    return {
      serviceWorker: 'unsupported',
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'unavailable',
      subscribed: false,
      isIOS,
      isStandalone,
    };
  }

  let serviceWorker: PushDiagnostic['serviceWorker'] = 'unregistered';
  let subscribed = false;
  let endpoint: string | undefined;

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      serviceWorker = 'registered';
      const sub = await reg.pushManager.getSubscription();
      subscribed = !!sub;
      endpoint = sub?.endpoint;
    }
  } catch {
    // ignore
  }

  return {
    serviceWorker,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'unavailable',
    subscribed,
    endpoint,
    isIOS,
    isStandalone,
  };
}

function detectStandalone(): boolean {
  try {
    const mqlStandalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
    const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return mqlStandalone || navStandalone;
  } catch {
    return false;
  }
}

async function ensurePermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') {
    throw new PushNotSupportedError('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน');
  }
  const current = Notification.permission;
  if (current === 'denied') throw new PushPermissionDeniedError();
  if (current === 'default') {
    const next = await Notification.requestPermission();
    if (next !== 'granted') throw new PushPermissionDeniedError();
    return next;
  }
  return current;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i);
  }
  return view;
}

export async function subscribeToNotifications(employeeId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new PushNotSupportedError('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน');
  }
  await ensurePermission();

  try {
    const vapidKey = getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const key = urlBase64ToUint8Array(vapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(key),
      });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        employee_id: employeeId,
        subscription: subscription.toJSON(),
      },
      {
        onConflict: 'employee_id, subscription',
      },
    );

    if (error) throw error;
    return true;
  } catch (error: unknown) {
    if (error instanceof PushConfigError || error instanceof PushPermissionDeniedError) throw error;
    console.error('Push subscription error:', error);
    throw error;
  }
}

export async function unsubscribeFromNotifications(employeeId?: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      if (employeeId) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('employee_id', employeeId)
          .eq('subscription->>endpoint', subscription.endpoint);
      }
    }
    return true;
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    return false;
  }
}

interface PushResult {
  success: boolean;
  sent?: number;
  failed?: number;
  error?: string;
}

async function invokeSendPush(body: Record<string, unknown>): Promise<PushResult> {
  const token = getSessionToken();
  if (!token) return { success: false, error: 'no session' };
  const { data, error } = await supabase.functions.invoke<PushResult & { results?: unknown[] }>(
    'send-push',
    { body, headers: { Authorization: `Bearer ${token}` } },
  );
  if (error) return { success: false, error: (data as { error?: string } | null)?.error ?? error.message };
  if (data && 'error' in data && data.error) return { success: false, error: data.error };
  return { success: true, sent: data?.sent, failed: data?.failed };
}

export async function sendPushToEmployee(
  employeeId: string,
  title: string,
  body: string,
  url?: string,
): Promise<PushResult> {
  return invokeSendPush({ employee_id: employeeId, title, body, url });
}

export async function sendPushToRole(
  role: string,
  title: string,
  body: string,
  url?: string,
): Promise<PushResult> {
  return invokeSendPush({ role, title, body, url });
}

export async function sendTestPushToSelf(employeeId: string): Promise<PushResult> {
  return invokeSendPush({
    employee_id: employeeId,
    title: 'ทดสอบการแจ้งเตือน',
    body: 'ถ้าคุณเห็นข้อความนี้ แสดงว่าระบบทำงานสมบูรณ์',
    url: '/',
  });
}
