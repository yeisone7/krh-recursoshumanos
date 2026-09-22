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
const codes = new Set(["INVALID_SEQUENCE", "TOO_FREQUENT", "STALE_OPEN_DAY", "LOCATION_REQUIRED", "LOCATION_ACCURACY_LOW", "LOCATION_STALE", "OUTSIDE_ALLOWED_AREA", "POINT_NOT_ALLOWED", "EMPLOYEE_NOT_ACTIVE", "EMPLOYMENT_CYCLE_REQUIRED", "INVALID_CORRECTION", "BREAK_PUNCHES_DISABLED", "PHOTO_REQUIRED", "INVALID_PHOTO"]);
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

type RequestBody = { operation?: string; payload?: Record<string, unknown>; photo?: File };

async function parseRequest(req: Request): Promise<RequestBody> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 2_400_000) throw new Error("INVALID_PHOTO");
    const form = await req.formData();
    const operation = form.get("operation");
    const rawPayload = form.get("payload");
    const photo = form.get("photo");
    if (typeof operation !== "string" || typeof rawPayload !== "string") throw new Error("INVALID_ACTION");
    return {
      operation,
      payload: JSON.parse(rawPayload),
      photo: photo instanceof File ? photo : undefined,
    };
  }

  const raw = await req.text();
  if (raw.length > 8192) throw new Error("INVALID_REQUEST");
  return JSON.parse(raw);
}

async function validJpeg(photo: File) {
  if (photo.type !== "image/jpeg" || photo.size < 4 || photo.size > 2_097_152) return false;
  const bytes = new Uint8Array(await photo.slice(0, 4).arrayBuffer());
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return respond({ error: "INVALID_ACTION" }, 405);
  let uploadedPath: string | null = null;
  try {
    const body = await parseRequest(req);
    if (!allowed.has(body.operation || "") || !body.payload || typeof body.payload !== "object") return respond({ error: "INVALID_ACTION" }, 400);
    if (body.photo && body.operation !== "punch") return respond({ error: "INVALID_PHOTO" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
    const ipHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

    let policy: { point_id?: string; require_clock_in_photo?: boolean; error?: string } | null = null;
    if (body.operation === "punch" || body.operation === "history") {
      const { data, error } = await client.rpc("time_clock_public_photo_policy", { _session: body.payload.session });
      if (error) return respond({ error: "INVALID_REQUEST" }, 400);
      policy = data;
      if (policy?.error) return respond({ error: policy.error }, 400);
    }

    if (body.operation === "punch") {
      const isEntry = body.payload.action === "clock_in";
      if (policy?.require_clock_in_photo && isEntry && !body.photo) return respond({ error: "PHOTO_REQUIRED" }, 400);
      if (body.photo && (!policy?.require_clock_in_photo || !isEntry || !(await validJpeg(body.photo)))) return respond({ error: "INVALID_PHOTO" }, 400);
      if (body.photo) {
        uploadedPath = `${policy!.point_id}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await client.storage
          .from("time-clock-evidence")
          .upload(uploadedPath, body.photo, { contentType: "image/jpeg", upsert: false });
        if (uploadError) return respond({ error: "PHOTO_UPLOAD_FAILED" }, 400);
      }
      const { data, error } = await client.rpc("time_clock_public_punch", {
        _body: body.payload,
        _ip_hash: ipHash,
        _photo_path: uploadedPath,
      });
      if (error || data?.error) {
        if (uploadedPath) await client.storage.from("time-clock-evidence").remove([uploadedPath]);
        return respond({ error: error ? (codes.has(error.message) ? error.message : "INVALID_REQUEST") : data.error }, 400);
      }
      if (uploadedPath && data?.duplicate) await client.storage.from("time-clock-evidence").remove([uploadedPath]);
      return respond(data);
    }

    // This RPC is restricted to service_role; it authenticates every operation
    // using the credential/session and derives employee + company on the server.
    const { data, error } = await client.rpc("time_clock_public", { _action: body.operation, _body: body.payload, _ip_hash: ipHash });
    if (error) return respond({ error: codes.has(error.message) ? error.message : "INVALID_REQUEST" }, 400);
    const result = body.operation === "history"
      ? { ...data, require_clock_in_photo: policy?.require_clock_in_photo === true }
      : data;
    if (body.operation === "context" && data?.challenge && !data?.error) {
      const { data: contextPolicy } = await client.rpc("time_clock_public_photo_policy", { _session: data.challenge });
      return respond({ ...data, require_clock_in_photo: contextPolicy?.require_clock_in_photo === true });
    }
    return respond(result, result?.error === "RATE_LIMITED" ? 429 : result?.error ? 400 : 200);
  } catch (error) {
    if (uploadedPath) {
      try {
        const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
        await client.storage.from("time-clock-evidence").remove([uploadedPath]);
      } catch { /* best-effort cleanup */ }
    }
    const code = error instanceof Error && ["INVALID_ACTION", "INVALID_REQUEST", "INVALID_PHOTO"].includes(error.message)
      ? error.message
      : "SERVICE_UNAVAILABLE";
    return respond({ error: code }, code === "INVALID_REQUEST" || code === "INVALID_PHOTO" ? 413 : 400);
  }
});
