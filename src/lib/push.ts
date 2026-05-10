import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export async function subscribeToNotifications(employeeId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน');
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('กรุณาอนุญาตการแจ้งเตือนในตั้งค่าเบราว์เซอร์');
    }

    // 2. Get registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // 4. Save to Supabase
    const { error } = await supabase.from('push_subscriptions').upsert({
      employee_id: employeeId,
      subscription: subscription.toJSON(),
    }, {
      onConflict: 'employee_id, subscription'
    });

    if (error) throw error;

    return true;
  } catch (error: any) {
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
