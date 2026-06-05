import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSubscriptionState } from './push';

type NotificationCtor = typeof Notification;

interface MockNotification {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
}

function setNotification(impl: MockNotification | undefined) {
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: impl,
  });
}

function setPushManager(impl: unknown) {
  if (impl === undefined) {
    delete (window as unknown as Record<string, unknown>).PushManager;
  } else {
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      writable: true,
      value: impl,
    });
  }
}

function setServiceWorker(impl: { ready?: Promise<unknown> } | undefined) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: impl,
  });
}

describe('getSubscriptionState', () => {
  const originalNotification = (window as unknown as { Notification?: NotificationCtor }).Notification;
  const originalPushManager = (window as unknown as { PushManager?: unknown }).PushManager;
  const originalSW = navigator.serviceWorker;

  beforeEach(() => {
    setNotification(undefined);
    setPushManager(undefined);
    setServiceWorker(undefined);
  });

  afterEach(() => {
    setNotification(originalNotification);
    setPushManager(originalPushManager);
    setServiceWorker(originalSW);
  });

  it('returns "unsupported" when Notification is undefined', async () => {
    setNotification(undefined);
    setPushManager({});
    setServiceWorker({ ready: Promise.resolve({}) });
    await expect(getSubscriptionState()).resolves.toEqual({ state: 'unsupported' });
  });

  it('returns "unsupported" when PushManager is missing', async () => {
    setNotification({ permission: 'default', requestPermission: async () => 'default' });
    setPushManager(undefined);
    setServiceWorker({ ready: Promise.resolve({}) });
    const result = await getSubscriptionState();
    expect(result.state).toBe('unsupported');
  });

  it('returns "denied" when Notification.permission is denied', async () => {
    setNotification({ permission: 'denied', requestPermission: async () => 'denied' });
    setPushManager({});
    setServiceWorker({ ready: Promise.resolve({}) });
    const result = await getSubscriptionState();
    expect(result.state).toBe('denied');
  });

  it('returns "default" when permission is default', async () => {
    setNotification({ permission: 'default', requestPermission: async () => 'default' });
    setPushManager({});
    setServiceWorker({ ready: Promise.resolve({}) });
    const result = await getSubscriptionState();
    expect(result.state).toBe('default');
  });

  it('returns "granted" with subscribed=false when no subscription exists', async () => {
    setNotification({ permission: 'granted', requestPermission: async () => 'granted' });
    setPushManager({});
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
    };
    setServiceWorker({
      ready: Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration),
    });
    const result = await getSubscriptionState();
    expect(result).toEqual({ state: 'granted', subscribed: false });
  });

  it('returns "granted" with subscribed=true when subscription exists', async () => {
    setNotification({ permission: 'granted', requestPermission: async () => 'granted' });
    setPushManager({});
    const fakeSub = { endpoint: 'https://example.com' };
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(fakeSub),
    };
    setServiceWorker({
      ready: Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration),
    });
    const result = await getSubscriptionState();
    expect(result).toEqual({ state: 'granted', subscribed: true });
  });

  it('falls back to subscribed=false if getSubscription throws', async () => {
    setNotification({ permission: 'granted', requestPermission: async () => 'granted' });
    setPushManager({});
    const pushManager = {
      getSubscription: vi.fn().mockRejectedValue(new Error('boom')),
    };
    setServiceWorker({
      ready: Promise.resolve({ pushManager } as unknown as ServiceWorkerRegistration),
    });
    const result = await getSubscriptionState();
    expect(result).toEqual({ state: 'granted', subscribed: false });
  });
});
