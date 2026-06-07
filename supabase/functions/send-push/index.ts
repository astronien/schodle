// send-push Edge Function
// -----------------------
// Sends a Web Push to one or more employees. Manager/admin only.
// Reliability features:
//   - Single retry with exponential backoff for 5xx errors
//   - Cleans up stale subscriptions (404/410/401 — endpoint gone or VAPID rotated)
//   - Bounded concurrency (5 in-flight) to avoid overwhelming the push service
//   - Returns a per-target delivery summary so the client can log

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const encoder = new TextEncoder();

function base64UrlDecode(input: string): Uint8Array {
  const padding = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSha256Verify(secret: string, data: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return crypto.subtle.verify("HMAC", key, base64UrlDecode(signature), encoder.encode(data));
}

async function verifySession(token: string, secret: string): Promise<{ sub: string; exp: number; role?: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  const valid = await hmacSha256Verify(secret, `${headerB64}.${payloadB64}`, signature);
  if (!valid) return null;
  let payload: { sub: string; exp: number; role?: string };
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
  } catch {
    return null;
  }
  if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const STALE_STATUSES = new Set([400, 401, 403, 404, 410]);
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_CONCURRENCY = 5;
const RETRY_DELAY_MS = 1000;

const MANAGER_POSITION_CODES = new Set(["BSM", "ABSM"]);

function isManagerOrAdmin(session: { role?: string; pos?: string }): boolean {
  if (session.role === "manager" || session.role === "admin") return true;
  if (session.pos && MANAGER_POSITION_CODES.has(session.pos)) return true;
  return false;
}

interface PushBody {
  employee_id?: string;
  role?: string;
  title?: string;
  body?: string;
  url?: string;
  self_test?: boolean;
}

interface SubscriptionRow {
  subscription: PushSubscriptionJSON;
  employee_id: string;
}

interface DeliveryResult {
  employee_id: string;
  success: boolean;
  error?: string;
  attempts: number;
  stale_removed: boolean;
}

async function sendOne(sub: PushSubscriptionJSON, payload: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    await webpush.sendNotification(sub, payload);
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    return { ok: false, status: e.statusCode, error: e.message || "send failed" };
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    const idx = cursor++;
    if (idx >= items.length) return;
    results[idx] = await worker(items[idx]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("SCHODLE_SESSION_SECRET");
  if (!secret) return json({ error: "Server misconfigured" }, 500);

  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: "Missing session token" }, 401);
  const session = await verifySession(match[1], secret);
  if (!session) return json({ error: "Invalid or expired session" }, 401);

  let body: PushBody;
  try {
    body = (await req.json()) as PushBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const isSelfTest = body.self_test === true;
  const isNotifyRole = !isSelfTest && !body.employee_id && !!body.role;
  const isManagerTarget = isNotifyRole && (body.role === "manager" || body.role === "admin");
  const isPushToSelf = !!body.employee_id && body.employee_id === session.sub;

  if (isSelfTest) {
    if (body.employee_id && !isPushToSelf) {
      return json(
        { error: "self_test ใช้ได้เฉพาะ employee_id ของผู้ส่งเท่านั้น", v: "self-test-403" },
        403,
      );
    }
  } else if (!isManagerTarget && !isPushToSelf && !isManagerOrAdmin(session)) {
    return json(
      {
        error: "ต้องใช้สิทธิ์ผู้จัดการหรือแอดมิน",
        v: "auth-denied",
        hint: "Send to role=manager is allowed for all authenticated users; send to self is allowed for any user",
      },
      403,
    );
  }

  const title = (body.title ?? "").trim();
  const message = (body.body ?? "").trim();
  const url = body.url || "/";
  if (!title) return json({ error: "ต้องระบุ title" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Supabase environment missing" }, 500);
  if (!vapidPublic || !vapidPrivate) {
    return json({ error: "VAPID keys are not configured on the server" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let targetIds: string[];
  if (isSelfTest) {
    targetIds = [session.sub];
  } else if (body.employee_id) {
    targetIds = [body.employee_id];
  } else if (body.role) {
    const codes = Array.from(MANAGER_POSITION_CODES);
    const [byRole, posResult] = await Promise.all([
      supabase.from("employees").select("id").eq("role", body.role),
      supabase.from("positions").select("id").in("code", codes),
    ]);
    if (byRole.error) {
      return json({ error: "ไม่สามารถค้นหาพนักงานตาม role ได้" }, 500);
    }
    const posIds = (posResult.data ?? []).map((p) => p.id);
    targetIds = (byRole.data ?? []).map((r) => r.id);
    if (posIds.length > 0) {
      const { data: byPos } = await supabase
        .from("employees")
        .select("id")
        .in("position_id", posIds);
      const idSet = new Set(targetIds);
      (byPos ?? []).forEach((r) => idSet.add(r.id));
      targetIds = [...idSet];
    }
  } else {
    return json({ error: "ต้องระบุ employee_id หรือ role" }, 400);
  }

  if (targetIds.length === 0) {
    return json({ success: true, sent: 0, failed: 0, results: [] });
  }

  const { data: subs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("subscription, employee_id")
    .in("employee_id", targetIds);
  if (subErr) return json({ error: "ไม่สามารถค้นหา subscription ได้" }, 500);
  if (!subs || subs.length === 0) {
    return json({ success: true, sent: 0, failed: 0, results: [], note: "no subscriptions" });
  }

  webpush.setVapidDetails("mailto:admin@schodle.app", vapidPublic, vapidPrivate);
  const payload = JSON.stringify({ title, body: message, url });

  const results: DeliveryResult[] = await runWithConcurrency<SubscriptionRow, DeliveryResult>(
    subs as SubscriptionRow[],
    MAX_CONCURRENCY,
    async (row) => {
      let attempt = 0;
      let lastStatus: number | undefined;
      let lastError: string | undefined;
      while (attempt < 2) {
        attempt += 1;
        const res = await sendOne(row.subscription, payload);
        if (res.ok) {
          return { employee_id: row.employee_id, success: true, attempts: attempt, stale_removed: false };
        }
        lastStatus = res.status;
        lastError = res.error;
        if (res.status && STALE_STATUSES.has(res.status)) break;
        if (res.status && RETRY_STATUSES.has(res.status) && attempt < 2) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        break;
      }

      const stale = !!lastStatus && STALE_STATUSES.has(lastStatus);
      if (stale) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("subscription->>endpoint", row.subscription.endpoint);
      }
      return {
        employee_id: row.employee_id,
        success: false,
        error: lastError,
        attempts: attempt,
        stale_removed: stale,
      };
    },
  );

  const sent = results.filter((r) => r.success).length;
  const failed = results.length - sent;
  return json({ success: true, sent, failed, results });
});
