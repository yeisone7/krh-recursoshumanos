import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { Buffer } from "node:buffer";
// @ts-types="npm:@types/pngjs@6.0.5"
import { PNG } from "npm:pngjs@7.0.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const bucket = "daily-report-signatures";
const publicActions = new Set([
  "context",
  "identify",
  "rows",
  "export",
  "history",
  "signed",
  "disagreed",
  "forget_signature",
  "logout",
]);
const adminActions = new Set([
  "options",
  "list",
  "create",
  "rows",
  "export",
  "history",
  "export_history",
  "audit",
  "link",
  "rotate",
  "revoke",
  "reassign",
  "settings",
  "approved",
  "returned",
]);
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });

// Reject blank, tiny, malformed or oversized images before they reach storage.
function signatureBytes(value: unknown): Uint8Array {
  if (
    typeof value !== "string" ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value) ||
    value.length > 700000
  )
    throw new Error("Firma PNG no válida.");
  const bytes = Uint8Array.from(atob(value.slice(22)), (c) => c.charCodeAt(0));
  if (bytes.length > 524288 || bytes.length < 40)
    throw new Error("Tamaño de firma no válido.");
  const view = new DataView(bytes.buffer);
  const width = view.getUint32(16),
    height = view.getUint32(20);
  if (width < 20 || height < 10 || width > 1600 || height > 800)
    throw new Error("Dimensiones de firma no válidas.");
  const png = PNG.sync.read(Buffer.from(bytes), { checkCRC: true });
  let ink = 0,
    left = width,
    right = 0,
    top = height,
    bottom = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (
        png.data[i + 3] > 100 &&
        Math.min(png.data[i], png.data[i + 1], png.data[i + 2]) < 180
      ) {
        ink++;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  if (ink < 35 || right - left < 15 || bottom - top < 5)
    throw new Error("Dibuje su firma completa antes de confirmar.");
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST")
    return reply({ error: "Método no permitido." }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 1100000)
      return reply({ error: "Solicitud demasiado grande." }, 413);
    const input = JSON.parse(raw);
    const { action, mode, ...body } = input;
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const internal = mode === "admin";
    let client = service;
    if (internal) {
      const authorization = req.headers.get("authorization") || "";
      const jwt = authorization.replace(/^Bearer\s+/i, "");
      const { data, error } = await service.auth.getUser(jwt);
      if (error || !data.user)
        return reply(
          { error: "Inicie sesión nuevamente.", code: "session" },
          401,
        );
      client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      });
    }
    const rpc = internal ? "daily_report_admin" : "daily_report_public";
    if (action === "upload_signature") {
      const bytes = signatureBytes(body.image);
      let company: string;
      if (internal) {
        const { data, error } = await client.rpc(rpc, {
          p_action: "rows",
          p_body: { publication_id: body.publication_id, offset: 0 },
        });
        if (error) return reply({ error: error.message }, 403);
        company = data.publication.company_id;
      } else {
        const { data, error } = await service.rpc(rpc, {
          p_action: "upload_context",
          p_body: { session: body.session },
        });
        if (error) return reply({ error: error.message, code: "session" }, 401);
        company = data.company_id;
      }
      const id = crypto.randomUUID();
      const path = `${company}/${id}.png`;
      const { error: uploadError } = await service.storage
        .from(bucket)
        .upload(path, bytes, { contentType: "image/png", upsert: false });
      if (uploadError)
        return reply(
          { error: "No se pudo guardar la firma. Intente nuevamente." },
          503,
        );
      const { data, error } = await client.rpc(rpc, {
        p_action: "register_signature",
        p_body: {
          publication_id: body.publication_id,
          session: body.session,
          signature_id: id,
          save: body.save === true,
        },
      });
      if (error) {
        await service.storage.from(bucket).remove([path]);
        return reply({ error: error.message }, 400);
      }
      return reply(data);
    }
    if (!(internal ? adminActions : publicActions).has(action))
      return reply({ error: "Operación no válida." }, 400);
    if (!internal && action === "identify") {
      const ip =
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(serviceKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      body.ip_hash = Array.from(
        new Uint8Array(
          await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip)),
        ),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
    }
    const { data, error } = await client.rpc(rpc, {
      p_action: action,
      p_body: body,
    });
    if (error)
      return reply(
        {
          error: error.message,
          code: error.code === "42501" ? "session" : error.code,
        },
        error.code === "42501" ? 403 : 400,
      );
    if (data?.error)
      return reply(data, data.code === "rate_limited" ? 429 : 400);
    // Only paths returned by the authorized RPC are signed; never accept a client path.
    const cache = new Map<string, Promise<string>>();
    async function hydrate(value: unknown): Promise<unknown> {
      if (Array.isArray(value)) return await Promise.all(value.map(hydrate));
      if (!value || typeof value !== "object") return value;
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        if (key.endsWith("signature_path") && typeof val === "string") {
          let signed = cache.get(val);
          if (!signed) {
            signed = (async () => {
              const { data: asset, error: assetError } = await service.storage
                .from(bucket)
                .createSignedUrl(val, 120);
              if (assetError)
                throw new Error(
                  "No fue posible recuperar una firma. Actualice e intente nuevamente.",
                );
              return asset.signedUrl;
            })();
            cache.set(val, signed);
          }
          result[key.replace("_path", "_url")] = await signed;
        } else result[key] = await hydrate(val);
      }
      return result;
    }
    return reply(await hydrate(data));
  } catch (error) {
    return reply(
      {
        error:
          error instanceof SyntaxError
            ? "Solicitud no válida."
            : error instanceof Error
              ? error.message
              : "No fue posible procesar la solicitud.",
      },
      400,
    );
  }
});
