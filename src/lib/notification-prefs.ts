export type NotificationType = 'schedule_changes' | 'approval_status' | 'new_requests';

export type NotificationPreferences = Record<NotificationType, boolean>;

const STORAGE_KEY = 'schodle_notification_prefs';

const DEFAULT_PREFS: NotificationPreferences = {
  schedule_changes: true,
  approval_status: true,
  new_requests: true,
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { label: string; description: string }> = {
  schedule_changes: {
    label: 'การเปลี่ยนแปลงตาราง',
    description: 'แจ้งเตือนเมื่อมีการเพิ่ม/แก้ไข/ลบตารางงาน',
  },
  approval_status: {
    label: 'ผลอนุมัติคำขอ',
    description: 'แจ้งเตือนเมื่อคำขอได้รับการอนุมัติหรือปฏิเสธ',
  },
  new_requests: {
    label: 'คำขอใหม่จากพนักงาน',
    description: 'แจ้งเตือนเมื่อมีพนักงานส่งคำขอใหม่ (สำหรับผู้จัดการ)',
  },
};

export function getNotificationPrefs(employeeId: string): NotificationPreferences {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_PREFS, ...all[employeeId] };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setNotificationPrefs(employeeId: string, prefs: NotificationPreferences) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[employeeId] = prefs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function shouldNotify(employeeId: string, type: NotificationType): boolean {
  return getNotificationPrefs(employeeId)[type];
}
