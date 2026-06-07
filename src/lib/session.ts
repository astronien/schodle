export const SESSION_TOKEN_KEY = 'schodle_session_token';

// Debug helper: in DevTools console, run:
//   import('./lib/session').then(m => m.getSessionToken())
// Or paste: sessionStorage.getItem('schodle_session_token')

export function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // sessionStorage unavailable (private mode, etc.) — silently ignore
  }
}

export function clearSessionToken(): void {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // ignore
  }
}
