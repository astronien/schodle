// swap-schedule-shifts Edge Function
// ----------------------------------
// Atomically swaps shift_type_id between two schedules on the same date.
// Manager/admin only. Calls the swap_schedule_shifts() Postgres function
// in a single transaction.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

interface SwapBody {
  requester_id?: string;
  target_id?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (session.role !== "manager" && session.role !== "admin") {
    return json({ error: "ต้องใช้สิทธิ์ผู้จัดการหรือแอดมิน" }, 403);
  }

  let body: SwapBody;
  try {
    body = (await req.json()) as SwapBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const requesterId = (body.requester_id ?? "").trim();
  const targetId = (body.target_id ?? "").trim();
  if (!UUID_REGEX.test(requesterId) || !UUID_REGEX.test(targetId)) {
    return json({ error: "schedule id ไม่ถูกต้อง" }, 400);
  }
  if (requesterId === targetId) {
    return json({ error: "ไม่สามารถสลับรายการเดียวกันได้" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Supabase environment missing" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error: rpcError } = await supabase.rpc("swap_schedule_shifts", {
    p_requester_id: requesterId,
    p_target_id: targetId,
  });

  if (rpcError) {
    console.error("RPC error:", rpcError);
    return json({ error: rpcError.message || "ไม่สามารถสลับกะได้" }, 400);
  }

  return json({ swapped: data ?? [] });
});
