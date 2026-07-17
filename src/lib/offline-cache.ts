const CACHE_PREFIX = 'schodle_cache_';
const CACHE_EXPIRY_MS = 1000 * 60 * 30;

function getCacheKey(table: string): string {
  return `${CACHE_PREFIX}${table}`;
}

export function getCachedData<T>(table: string): T[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(table));
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: T[]; timestamp: number };
    if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(getCacheKey(table));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCachedData<T>(table: string, data: T[]) {
  try {
    localStorage.setItem(
      getCacheKey(table),
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function clearAllCaches() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage unavailable — ignore
  }
}
