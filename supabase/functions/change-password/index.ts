// change-password Edge Function
// ----------------------------
// Updates the caller's password_hash and clears must_change_password.
// Requires a valid session token issued by verify-password.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bcrypt as bcryptMod } from "https://esm.sh/bcryptjs@2";

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

async function verifySession(token: string, secret: string): Promise<{ sub: string; exp: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  const valid = await hmacSha256Verify(secret, `${headerB64}.${payloadB64}`, signature);
  if (!valid) return null;
  let payload: { sub: string; exp: number };
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

  let body: { new_password?: string; current_password?: string };
  try {
    body = (await req.json()) as { new_password?: string; current_password?: string };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const newPassword = (body.new_password ?? "").trim();
  const currentPassword = (body.current_password ?? "").trim();
  if (newPassword.length < 6) {
    return json({ error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: employee, error: lookupError } = await supabase
    .from("employees")
    .select("id, password_hash")
    .eq("id", session.sub)
    .maybeSingle();
  if (lookupError || !employee) return json({ error: "ไม่พบบัญชีผู้ใช้" }, 404);

  if (currentPassword) {
    const ok = await bcryptMod.compare(currentPassword, employee.password_hash ?? "");
    if (!ok) return json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, 401);
  }

  const newHash = await bcryptMod.hash(newPassword, 10);
  const { error: updateError } = await supabase
    .from("employees")
    .update({ password_hash: newHash, must_change_password: false })
    .eq("id", session.sub);
  if (updateError) {
    console.error("Update error:", updateError);
    return json({ error: "ไม่สามารถอัปเดตรหัสผ่านได้" }, 500);
  }

  return json({ success: true });
});
