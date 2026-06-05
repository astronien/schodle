import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_TOKEN_KEY,
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from './session';

function withThrowingSessionStorage<T>(fn: () => T): T {
  const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get: () => {
      throw new Error('SecurityError');
    },
  });
  try {
    return fn();
  } finally {
    if (original) Object.defineProperty(window, 'sessionStorage', original);
  }
}

describe('session token helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('getSessionToken', () => {
    it('returns null when nothing is stored', () => {
      expect(getSessionToken()).toBeNull();
    });

    it('returns the stored token', () => {
      sessionStorage.setItem(SESSION_TOKEN_KEY, 'eyJhbGc.foo.bar');
      expect(getSessionToken()).toBe('eyJhbGc.foo.bar');
    });

    it('returns null when sessionStorage throws', () => {
      expect(withThrowingSessionStorage(() => getSessionToken())).toBeNull();
    });
  });

  describe('setSessionToken', () => {
    it('stores the token', () => {
      setSessionToken('token-abc');
      expect(sessionStorage.getItem(SESSION_TOKEN_KEY)).toBe('token-abc');
    });

    it('does not throw when sessionStorage is unavailable', () => {
      expect(() =>
        withThrowingSessionStorage(() => setSessionToken('token-abc')),
      ).not.toThrow();
    });
  });

  describe('clearSessionToken', () => {
    it('removes the token', () => {
      sessionStorage.setItem(SESSION_TOKEN_KEY, 'old');
      clearSessionToken();
      expect(sessionStorage.getItem(SESSION_TOKEN_KEY)).toBeNull();
    });

    it('does not throw when sessionStorage is unavailable', () => {
      sessionStorage.setItem(SESSION_TOKEN_KEY, 'old');
      expect(() => withThrowingSessionStorage(() => clearSessionToken())).not.toThrow();
    });
  });
});
