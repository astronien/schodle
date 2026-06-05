import { supabase } from './supabase';

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

export async function subscribeToNotifications(employeeId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new PushNotSupportedError('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน');
  }

  if (typeof Notification === 'undefined') {
    throw new PushNotSupportedError('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน');
  }

  const current: NotificationPermission = Notification.permission;
  if (current === 'denied') {
    throw new PushPermissionDeniedError();
  }

  let permission: NotificationPermission = current;
  if (current === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new PushPermissionDeniedError();
  }

  try {
    const vapidKey = getVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
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
    if (error instanceof PushConfigError) throw error;
    console.error('Push subscription error:', error);
    throw error;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
