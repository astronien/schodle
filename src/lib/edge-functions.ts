// Shared wrapper around supabase.functions.invoke that handles the
// error-parsing boilerplate: on non-2xx responses `data` is null and the
// server's message lives in the Response attached to FunctionsHttpError
// as `context`. Previously this block was copy-pasted at every call site.
import { supabase } from './supabase';
import { getSessionToken } from './session';
import { AUTH_EXPIRED_EVENT } from '../config/constants';

interface InvokeOptions {
  /** Attach the Schodle session token as a Bearer header (throws if missing). */
  requireAuth?: boolean;
  /** Dispatch AUTH_EXPIRED_EVENT and throw a session-expired error on 401-like failures. */
  dispatchAuthExpired?: boolean;
}

const SESSION_EXPIRED_MSG = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';

export async function invokeEdgeFunction<T extends { error?: string }>(
  name: string,
  body: Record<string, unknown>,
  { requireAuth = true, dispatchAuthExpired = false }: InvokeOptions = {},
): Promise<T | null> {
  let headers: Record<string, string> | undefined;
  if (requireAuth) {
    const token = getSessionToken();
    if (!token) throw new Error(SESSION_EXPIRED_MSG);
    headers = { Authorization: `Bearer ${token}` };
  }

  const { data, error: fnError } = await supabase.functions.invoke<T>(name, { body, headers });

  if (fnError) {
    const ctx = (fnError as { context?: Response }).context;
    let serverMsg: string | null = null;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = (await ctx.json()) as { error?: string };
        serverMsg = parsed?.error ?? null;
      } catch {
        // ignore parse errors
      }
    }
    const msg = serverMsg ?? (data as { error?: string } | null)?.error ?? fnError.message;
    if (
      dispatchAuthExpired &&
      (ctx?.status === 401 || msg.includes('401') || msg.includes('expired') || msg.includes('Invalid'))
    ) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      throw new Error(SESSION_EXPIRED_MSG);
    }
    throw new Error(msg);
  }
  if (data && data.error) {
    throw new Error(data.error);
  }
  return data;
}
