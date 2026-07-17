// self-reset-password Edge Function
// -----------------------------------
// Lets a locked-out employee reset their own password back to the
// default (their employee code) from the login page, without a session.
// Only the employee code is required. The reset also sets
// must_change_password so the next login forces choosing a new password.
//
// Required Supabase secrets:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Supabase environment missing" }, 500);

  let body: { employee_code?: string };
  try {
    body = (await req.json()) as { employee_code?: string };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const employeeCode = (body.employee_code ?? "").trim();
  if (!employeeCode) {
    return json({ error: "กรุณากรอกรหัสพนักงาน" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Employee codes are matched case-insensitively; escape ilike wildcards
  // so codes containing % or _ still match literally.
  const escapedCode = employeeCode.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data: candidates, error: lookupError } = await supabase
    .from("employees")
    .select("id, employee_code")
    .ilike("employee_code", escapedCode)
    .limit(2);

  if (lookupError) {
    console.error("Lookup error:", lookupError);
    return json({ error: "ไม่สามารถตรวจสอบผู้ใช้ได้" }, 500);
  }
  // If two codes differ only by case, only an exact match is unambiguous.
  const employee =
    candidates?.find((c) => c.employee_code === employeeCode) ??
    (candidates?.length === 1 ? candidates[0] : undefined);

  if (!employee) {
    return json({ error: "ไม่พบรหัสพนักงานนี้ในระบบ" }, 401);
  }

  const newHash = await bcrypt.hash(employee.employee_code, 10);
  const { error: updateError } = await supabase
    .from("employees")
    .update({ password_hash: newHash, must_change_password: true })
    .eq("id", employee.id);
  if (updateError) {
    console.error("Update error:", updateError);
    return json({ error: "ไม่สามารถรีเซ็ตรหัสผ่านได้" }, 500);
  }

  return json({ success: true, employee_code: employee.employee_code });
});
