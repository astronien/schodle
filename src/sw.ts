/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;


precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string } = {
    title: 'การแจ้งเตือน',
    body: 'คุณมีอัปเดตใหม่',
  };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options: NotificationOptions & { vibrate?: number[] } = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    tag: 'schodle-push',
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Schodle', options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {

  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data)
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

