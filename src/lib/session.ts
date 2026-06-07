export const SESSION_TOKEN_KEY = 'schodle_session_token';

const storage = (() => {
  try {
    localStorage.setItem('__test', '1');
    localStorage.removeItem('__test');
    return localStorage;
  } catch {
    return sessionStorage;
  }
})();

export function getSessionToken(): string | null {
  try {
    return storage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    storage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // storage unavailable (private mode, etc.) — silently ignore
  }
}

export function clearSessionToken(): void {
  try {
    storage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // ignore
  }
}
