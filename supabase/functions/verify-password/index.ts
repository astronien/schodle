// Verify-password Edge Function
// --------------------------------
// Accepts { employee_code, password } and returns a signed session token
// plus the employee profile. The bcrypt compare happens here using the
// service role so the hash never leaves the database. The token is an
// HMAC-SHA256 JWT signed with SCHODLE_SESSION_SECRET; the client stores
// it in sessionStorage and re-sends it as `Authorization: Bearer …` for
// any privileged Edge Function calls.
//
// Required Supabase secrets:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - SCHODLE_SESSION_SECRET (set in Supabase dashboard)
//
// Optional:
//   - SESSION_TTL_SECONDS (default 8h)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bcrypt as bcryptMod } from "https://esm.sh/bcryptjs@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

async function signSession(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encode = (obj: unknown) =>
    base64UrlEncode(encoder.encode(JSON.stringify(obj)));
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = await hmacSha256(secret, signingInput);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

interface VerifyBody {
  employee_code?: string;
  password?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("SCHODLE_SESSION_SECRET");
  if (!secret) {
    console.error("SCHODLE_SESSION_SECRET is not set");
    return json({ error: "Server misconfigured" }, 500);
  }

  const ttlSeconds = Number(Deno.env.get("SESSION_TTL_SECONDS") ?? 60 * 60 * 8);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Supabase environment missing" }, 500);
  }

  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const employeeCode = (body.employee_code ?? "").trim();
  const password = (body.password ?? "").trim();
  if (!employeeCode || !password) {
    return json({ error: "กรุณากรอกรหัสพนักงานและรหัสผ่าน" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: employee, error: lookupError } = await supabase
    .from("employees")
    .select("id, employee_code, full_name, position_id, role, password_hash, must_change_password")
    .eq("employee_code", employeeCode)
    .maybeSingle();

  if (lookupError) {
    console.error("Lookup error:", lookupError);
    return json({ error: "ไม่สามารถตรวจสอบผู้ใช้ได้" }, 500);
  }
  if (!employee) {
    return json({ error: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" }, 401);
  }
  if (!employee.password_hash) {
    return json({ error: "บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ" }, 401);
  }

  const passwordOk = await bcryptMod.compare(password, employee.password_hash);
  if (!passwordOk) {
    return json({ error: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" }, 401);
  }

  const { data: position, error: positionError } = await supabase
    .from("positions")
    .select("code, name")
    .eq("id", employee.position_id)
    .maybeSingle();
  if (positionError) {
    console.error("Position lookup error:", positionError);
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const session = await signSession(
    {
      sub: employee.id,
      code: employee.employee_code,
      role: employee.role,
      pos: position?.code,
      iat: issuedAt,
      exp: issuedAt + ttlSeconds,
    },
    secret,
  );

  return json({
    session,
    employee: {
      id: employee.id,
      employeeCode: employee.employee_code,
      fullName: employee.full_name,
      positionId: employee.position_id,
      role: employee.role,
      mustChangePassword: !!employee.must_change_password,
      position: position ?? null,
    },
    expiresAt: issuedAt + ttlSeconds,
  });
});
