import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const allowed = new Set(["context", "identify", "change_pin", "history", "punch", "correction"]);
const codes = new Set(["INVALID_SEQUENCE", "TOO_FREQUENT", "STALE_OPEN_DAY", "LOCATION_REQUIRED", "LOCATION_ACCURACY_LOW", "LOCATION_STALE", "OUTSIDE_ALLOWED_AREA", "POINT_NOT_ALLOWED", "EMPLOYEE_NOT_ACTIVE", "EMPLOYMENT_CYCLE_REQUIRED", "INVALID_CORRECTION", "BREAK_PUNCHES_DISABLED"]);
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return respond({ error: "INVALID_ACTION" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 8192) return respond({ error: "INVALID_REQUEST" }, 413);
    const body = JSON.parse(raw);
    if (!allowed.has(body.operation) || !body.payload || typeof body.payload !== "object") return respond({ error: "INVALID_ACTION" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
    const ipHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    // This RPC is restricted to service_role; it authenticates every operation
    // using the credential/session and derives employee + company on the server.
    const { data, error } = await client.rpc("time_clock_public", { _action: body.operation, _body: body.payload, _ip_hash: ipHash });
    if (error) return respond({ error: codes.has(error.message) ? error.message : "INVALID_REQUEST" }, 400);
    return respond(data, data?.error === "RATE_LIMITED" ? 429 : data?.error ? 400 : 200);
  } catch {
    return respond({ error: "SERVICE_UNAVAILABLE" }, 400);
  }
});
