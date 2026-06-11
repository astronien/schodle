import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getNotificationPrefs,
  setNotificationPrefs,
  shouldNotify,
  NOTIFICATION_TYPE_LABELS,
} from './notification-prefs';

describe('notification-prefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns all defaults when no prefs stored', () => {
    const prefs = getNotificationPrefs('emp-1');
    expect(prefs.schedule_changes).toBe(true);
    expect(prefs.approval_status).toBe(true);
    expect(prefs.new_requests).toBe(true);
  });

  it('persists and reads back prefs per employee', () => {
    setNotificationPrefs('emp-1', {
      schedule_changes: false,
      approval_status: true,
      new_requests: false,
    });
    const prefs = getNotificationPrefs('emp-1');
    expect(prefs.schedule_changes).toBe(false);
    expect(prefs.approval_status).toBe(true);
    expect(prefs.new_requests).toBe(false);
  });

  it('isolates prefs between employees', () => {
    setNotificationPrefs('emp-1', {
      schedule_changes: false,
      approval_status: true,
      new_requests: true,
    });
    setNotificationPrefs('emp-2', {
      schedule_changes: true,
      approval_status: false,
      new_requests: true,
    });
    expect(getNotificationPrefs('emp-1').schedule_changes).toBe(false);
    expect(getNotificationPrefs('emp-2').schedule_changes).toBe(true);
    expect(getNotificationPrefs('emp-2').approval_status).toBe(false);
  });

  it('shouldNotify returns true when pref is enabled', () => {
    setNotificationPrefs('emp-1', {
      schedule_changes: false,
      approval_status: true,
      new_requests: true,
    });
    expect(shouldNotify('emp-1', 'schedule_changes')).toBe(false);
    expect(shouldNotify('emp-1', 'approval_status')).toBe(true);
  });

  it('shouldNotify returns true by default for unknown employees', () => {
    expect(shouldNotify('unknown', 'schedule_changes')).toBe(true);
  });

  it('has labels for all notification types', () => {
    expect(Object.keys(NOTIFICATION_TYPE_LABELS)).toEqual(
      expect.arrayContaining(['schedule_changes', 'approval_status', 'new_requests']),
    );
    for (const key of Object.keys(NOTIFICATION_TYPE_LABELS)) {
      const entry = NOTIFICATION_TYPE_LABELS[key as keyof typeof NOTIFICATION_TYPE_LABELS];
      expect(entry.label).toBeTruthy();
      expect(entry.description).toBeTruthy();
    }
  });
});
