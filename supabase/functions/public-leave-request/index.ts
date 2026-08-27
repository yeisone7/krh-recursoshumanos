import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const FILE_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

type JsonRecord = Record<string, unknown>;

function json(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function readClientIp(req: Request) {
  return req.headers.get("cf-connecting-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

async function hmacSha256Hex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeFileName(contentType: string) {
  return `soporte${FILE_EXTENSIONS[contentType] || ""}`;
}

async function hasAllowedSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (file.type === "application/pdf") {
    return bytes.length >= 5
      && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44
      && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }
  if (file.type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((value, index) => bytes[index] === value);
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Servicio no disponible." }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const removeUploadedFile = async (path: string) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await admin.storage.from("documents").remove([path]);
      if (!error) return true;
    }
    console.error("Public leave evidence cleanup failed after three attempts.");
    return false;
  };

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      if (formData.get("action") !== "submit") return json({ error: "Operación no válida." }, 400);

      const session = String(formData.get("session") || "");
      const requestValue = String(formData.get("request") || "");
      let requestData: JsonRecord;
      try {
        requestData = JSON.parse(requestValue) as JsonRecord;
      } catch {
        return json({ error: "Los datos de la solicitud no son válidos." }, 400);
      }

      const { data: preparation, error: preparationError } = await admin.rpc(
        "prepare_leave_public_submission",
        { p_session: session },
      );
      if (preparationError || !preparation?.valid) {
        return json({ error: "La verificación expiró. Vuelve a identificarte." }, 401);
      }
      if (preparation.completed) return json({ reference: preparation.reference });

      const fileValue = formData.get("file");
      const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
      if (file && (
        !ALLOWED_FILE_TYPES.has(file.type)
        || file.size > MAX_FILE_SIZE
        || !(await hasAllowedSignature(file))
      )) {
        return json({ error: "El soporte debe ser PDF, JPG o PNG y pesar máximo 10 MB." }, 400);
      }

      let uploadedPath: string | null = null;
      if (file) {
        uploadedPath = `${preparation.company_id}/leaves/public/${crypto.randomUUID()}/${safeFileName(file.type)}`;
        const { error: uploadError } = await admin.storage
          .from("documents")
          .upload(uploadedPath, file, { contentType: file.type, cacheControl: "3600", upsert: false });
        if (uploadError) return json({ error: "No fue posible guardar el soporte." }, 500);
      }

      const { data: result, error: submitError } = await admin.rpc("submit_leave_public_request", {
        p_session: session,
        p_request: requestData,
        p_document_url: uploadedPath,
        p_document_name: file?.name || null,
      });

      if (submitError) {
        if (uploadedPath) await removeUploadedFile(uploadedPath);
        const validationError = submitError.code === "22023" || submitError.code === "23P01" || submitError.code === "P0001";
        return json(
          { error: validationError ? submitError.message : "No fue posible registrar la solicitud." },
          validationError ? 400 : submitError.code === "42501" ? 401 : 500,
        );
      }

      if (uploadedPath && result?.idempotent) {
        await removeUploadedFile(uploadedPath);
      }
      return json({ reference: result.reference });
    }

    if (!contentType.includes("application/json")) return json({ error: "Contenido no válido." }, 415);
    const body = await req.json() as JsonRecord;
    const action = String(body.action || "");

    if (action === "context") {
      const { data, error } = await admin.rpc("resolve_leave_public_context", {
        p_token: String(body.token || ""),
      });
      if (error || !data?.valid) return json({ valid: false }, 404);
      return json({ valid: true, company: data.company });
    }

    if (action === "identify") {
      const hashSecret = Deno.env.get("PUBLIC_LEAVE_HASH_SECRET") || serviceRoleKey;
      const ipHash = await hmacSha256Hex(hashSecret, readClientIp(req));
      const { data, error } = await admin.rpc("identify_leave_public_employee", {
        p_token: String(body.token || ""),
        p_document_type: String(body.document_type || ""),
        p_document_number: String(body.document_number || ""),
        p_birth_date: String(body.birth_date || ""),
        p_ip_hash: ipHash,
      });
      if (error) return json({ error: "No fue posible validar la identidad." }, 400);
      if (!data?.success) {
        if (data?.code === "invalid_link") return json({ error: "El enlace no está disponible." }, 404);
        if (data?.code === "rate_limited") {
          return json({ error: "Demasiados intentos. Intenta nuevamente en 15 minutos." }, 429);
        }
        return json({ error: "No fue posible validar los datos ingresados." }, 400);
      }
      return json({
        session: data.session,
        expires_in_seconds: data.expires_in_seconds,
        employee_first_name: data.employee_first_name,
        leave_types: data.leave_types,
      });
    }

    return json({ error: "Operación no válida." }, 400);
  } catch {
    return json({ error: "No fue posible procesar la solicitud." }, 500);
  }
});
