// create-employee Edge Function
// ---------------------------
// Creates a new employee and stores a bcrypt hash of the default password
// (the employee code) on the server. Only callable by manager/admin sessions.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const encoder = new TextEncoder();

const MANAGER_POSITION_CODES = new Set(["BSM", "ABSM"]);

function isManagerOrAdmin(session: { role?: string; pos?: string }): boolean {
  if (session.role === "manager" || session.role === "admin") return true;
  if (session.pos && MANAGER_POSITION_CODES.has(session.pos)) return true;
  return false;
}

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

interface CreateEmployeeBody {
  employee_code?: string;
  full_name?: string;
  position_id?: string;
  group_id?: string | null;
  role?: "employee" | "manager" | "admin";
  phone?: string | null;
  email?: string | null;
  avatar?: string | null;
  weekly_off_day?: number | null;
  default_password?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ROLES = new Set(["employee", "manager", "admin"]);

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
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
  if (!isManagerOrAdmin(session)) {
    return json({ error: "ต้องใช้สิทธิ์ผู้จัดการหรือแอดมิน" }, 403);
  }

  let body: CreateEmployeeBody;
  try {
    body = (await req.json()) as CreateEmployeeBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const employeeCode = (body.employee_code ?? "").trim();
  const fullName = (body.full_name ?? "").trim();
  const positionId = (body.position_id ?? "").trim();
  const role = (body.role ?? "employee").trim();
  const defaultPassword = (body.default_password ?? employeeCode).trim();

  if (!employeeCode) return json({ error: "กรุณากรอกรหัสพนักงาน" }, 400);
  if (!fullName) return json({ error: "กรุณากรอกชื่อ-นามสกุล" }, 400);
  if (!isUuid(positionId)) return json({ error: "position_id ไม่ถูกต้อง" }, 400);
  if (!VALID_ROLES.has(role)) return json({ error: "role ไม่ถูกต้อง" }, 400);
  if (defaultPassword.length < 4) return json({ error: "รหัสผ่านเริ่มต้นต้องมีอย่างน้อย 4 ตัวอักษร" }, 400);
  if (typeof body.weekly_off_day === "number" && (body.weekly_off_day < 0 || body.weekly_off_day > 6)) {
    return json({ error: "weekly_off_day ต้องอยู่ระหว่าง 0-6" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Supabase environment missing" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Duplicate check is case-insensitive to match the login lookup;
  // escape ilike wildcards so codes containing % or _ compare literally.
  const escapedCode = employeeCode.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data: existing, error: dupError } = await supabase
    .from("employees")
    .select("id")
    .ilike("employee_code", escapedCode)
    .limit(1)
    .maybeSingle();
  if (dupError) {
    console.error("Duplicate check failed:", dupError);
    return json({ error: "ไม่สามารถตรวจสอบรหัสพนักงานซ้ำได้" }, 500);
  }
  if (existing) return json({ error: `รหัสพนักงาน "${employeeCode}" ซ้ำ (มีอยู่แล้ว)` }, 409);

  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const { data: created, error: insertError } = await supabase
    .from("employees")
    .insert({
      employee_code: employeeCode,
      full_name: fullName,
      position_id: positionId,
      group_id: body.group_id ?? null,
      role,
      phone: body.phone ?? null,
      email: body.email ?? null,
      avatar: body.avatar ?? null,
      weekly_off_day: typeof body.weekly_off_day === "number" ? body.weekly_off_day : null,
      password_hash: passwordHash,
      must_change_password: true,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("Insert error:", insertError);
    return json({ error: "ไม่สามารถสร้างพนักงานได้" }, 500);
  }

  return json({ id: created.id, must_change_password: true });
});
