/**
 * Centralized constants and magic values.
 * Use this file instead of inline literals so they can be tuned in one place.
 */

/* ── Realtime / Polling ───────────────────────────────────────── */
export const REALTIME_THROTTLE_MS = 1500;
export const RECENT_NOTIFICATION_WINDOW_MS = 7000;
export const PUSH_DEDUP_WINDOW_MS = 30000;
export const PUSH_DEDUP_MAP_MAX_SIZE = 200;
export const POLL_INTERVAL_MS = 15000;

/* ── Session ──────────────────────────────────────────────────── */
export const SESSION_TTL_SECONDS_DEFAULT = 8 * 60 * 60; // 8 hours

/* ── Schedule generator ──────────────────────────────────────── */
export const DEFAULT_LATE_SHIFT_CODES = ['XC', 'EV', 'A2'];
export const DEFAULT_EARLY_SHIFT_CODES = ['M1', 'M2'];
/** Max shift count difference between any two employees after balance. */
export const BALANCE_TOLERANCE = 1;
/** Max re-try iterations per day for Tier 1 strict placement. */
/** Batch size when deleting a month's schedules, to bound the `in` list. */
export const CLEAR_MONTH_CHUNK_SIZE = 200;

export const MAX_ITERATIONS_PER_DAY_MULTIPLIER = 8;
export const MAX_ITERATIONS_PER_DAY_BASE = 10;

/* ── Sales position IDs (legacy hardcoded) ───────────────────── */
export const SALES_POSITION_IDS = new Set(['3', '5']);

/* ── Reports ──────────────────────────────────────────────────── */
export const OVERSTAFFED_THRESHOLD_MULTIPLIER = 1.5;

/* ── Storage ──────────────────────────────────────────────────── */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/* ── Service worker update interval ──────────────────────────── */
export const SW_UPDATE_INTERVAL_MS = 60_000;

/* ── Auth expired event ──────────────────────────────────────── */
export const AUTH_EXPIRED_EVENT = 'schodle:auth-expired';

/* ── Day names (deduped) ──────────────────────────────────────── */
export const DAY_NAMES_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;
export const DAY_NAMES_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'] as const;
