import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_TOKEN_KEY,
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from './session';

const originalGetItem = Storage.prototype.getItem;
const originalSetItem = Storage.prototype.setItem;
const originalRemoveItem = Storage.prototype.removeItem;

function withThrowingStorage<T>(fn: () => T): T {
  Storage.prototype.getItem = () => {
    throw new Error('SecurityError');
  };
  Storage.prototype.setItem = () => {
    throw new Error('SecurityError');
  };
  Storage.prototype.removeItem = () => {
    throw new Error('SecurityError');
  };
  try {
    return fn();
  } finally {
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
    Storage.prototype.removeItem = originalRemoveItem;
  }
}

function setInStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    sessionStorage.setItem(key, value);
  }
}

function getFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return sessionStorage.getItem(key);
  }
}

describe('session token helpers', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  describe('getSessionToken', () => {
    it('returns null when nothing is stored', () => {
      expect(getSessionToken()).toBeNull();
    });

    it('returns the stored token', () => {
      setInStorage(SESSION_TOKEN_KEY, 'eyJhbGc.foo.bar');
      expect(getSessionToken()).toBe('eyJhbGc.foo.bar');
    });

    it('returns null when storage throws', () => {
      expect(withThrowingStorage(() => getSessionToken())).toBeNull();
    });
  });

  describe('setSessionToken', () => {
    it('stores the token', () => {
      setSessionToken('token-abc');
      expect(getFromStorage(SESSION_TOKEN_KEY)).toBe('token-abc');
    });

    it('does not throw when storage is unavailable', () => {
      expect(() =>
        withThrowingStorage(() => setSessionToken('token-abc')),
      ).not.toThrow();
    });
  });

  describe('clearSessionToken', () => {
    it('removes the token', () => {
      setInStorage(SESSION_TOKEN_KEY, 'old');
      clearSessionToken();
      expect(getFromStorage(SESSION_TOKEN_KEY)).toBeNull();
    });

    it('does not throw when storage is unavailable', () => {
      setInStorage(SESSION_TOKEN_KEY, 'old');
      expect(() => withThrowingStorage(() => clearSessionToken())).not.toThrow();
    });
  });
});

