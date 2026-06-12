// Edge Function: db-query
// Executes database queries with session verification using service role
// This allows client-side code to perform operations without direct table access
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

interface FilterCondition {
  eq?: unknown;
  gte?: unknown;
  lte?: unknown;
  lt?: unknown;
  gt?: unknown;
  neq?: unknown;
  in?: unknown[];
}

interface QueryRequest {
  table: string;
  operation: "select" | "insert" | "update" | "upsert" | "delete";
  data?: unknown;
  filter?: Record<string, unknown | FilterCondition>;
  select?: string;
  order?: { column: string; ascending?: boolean };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("SCHODLE_SESSION_SECRET");
  if (!secret) return json({ error: "Server misconfigured" }, 500);

  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: "Missing session token" }, 401);
  
  const session = await verifySession(match[1], secret);
  if (!session) return json({ error: "Invalid or expired session" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Supabase environment missing" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let body: QueryRequest;
  try {
    body = (await req.json()) as QueryRequest;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { table, operation, data, filter, select, order } = body;

  if (!table || !operation) {
    return json({ error: "Missing table or operation" }, 400);
  }

  try {
    let query;

    // Helper function to apply filters
    const applyFilters = (q: any, filter?: Record<string, unknown | FilterCondition>) => {
      if (!filter) return q;
      
      for (const [key, value] of Object.entries(filter)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Complex filter condition
          const condition = value as FilterCondition;
          if (condition.eq !== undefined) q = q.eq(key, condition.eq);
          if (condition.gte !== undefined) q = q.gte(key, condition.gte);
          if (condition.lte !== undefined) q = q.lte(key, condition.lte);
          if (condition.lt !== undefined) q = q.lt(key, condition.lt);
          if (condition.gt !== undefined) q = q.gt(key, condition.gt);
          if (condition.neq !== undefined) q = q.neq(key, condition.neq);
          if (condition.in !== undefined) q = q.in(key, condition.in);
        } else {
          // Simple equality filter
          q = q.eq(key, value);
        }
      }
      return q;
    };

    switch (operation) {
      case "select":
        query = supabase.from(table).select(select || "*");
        query = applyFilters(query, filter);
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }
        break;

      case "insert":
        query = supabase.from(table).insert(data as Record<string, unknown>);
        break;

      case "update":
        query = supabase.from(table).update(data as Record<string, unknown>);
        query = applyFilters(query, filter);
        break;

      case "upsert":
        query = supabase.from(table).upsert(data as Record<string, unknown>);
        break;

      case "delete":
        query = supabase.from(table).delete();
        query = applyFilters(query, filter);
        break;

      default:
        return json({ error: "Invalid operation" }, 400);
    }

    const { data: result, error } = await query;
    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ data: result });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
