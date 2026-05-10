/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;


precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: PushEvent) => {

  const data = event.data ? event.data.json() : { title: 'Notification', body: 'You have a new update!' };
  
  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'ดูรายละเอียด' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {

  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data)
  );
});
