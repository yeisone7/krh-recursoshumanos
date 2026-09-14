import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "No autenticado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse({ error: "Configuración del servidor incompleta" }, 500);
    }

    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user: caller }, error: callerError } = await authenticatedClient.auth.getUser();
    if (callerError || !caller) return jsonResponse({ error: "No autenticado" }, 401);

    const payload = await req.json().catch(() => null) as { password?: unknown } | null;
    const password = typeof payload?.password === "string" ? payload.password : "";
    if (password.length < 8) {
      return jsonResponse({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, 400);
    }

    const { data: currentResult, error: currentError } = await adminClient.auth.admin.getUserById(caller.id);
    const currentUser = currentResult?.user;
    if (currentError || !currentUser) return jsonResponse({ error: "Usuario no encontrado" }, 404);
    if (currentUser.app_metadata?.force_password_change !== true) {
      return jsonResponse({ error: "El usuario no tiene un cambio obligatorio pendiente" }, 403);
    }

    if (!caller.email) {
      return jsonResponse({ error: "El usuario no tiene un correo válido para verificar sus credenciales" }, 400);
    }

    const passwordVerifier = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: currentPasswordResult, error: currentPasswordError } = await passwordVerifier.auth.signInWithPassword({
      email: caller.email,
      password,
    });

    if (currentPasswordResult.user) {
      return jsonResponse({ error: "La nueva contraseña debe ser diferente de la contraseña temporal" }, 400);
    }

    if (currentPasswordError?.code !== "invalid_credentials") {
      console.error("No fue posible verificar que la contraseña sea diferente", currentPasswordError?.code ?? "unknown");
      return jsonResponse({ error: "No fue posible validar la nueva contraseña" }, 503);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(caller.id, {
      password,
      app_metadata: {
        ...(currentUser.app_metadata ?? {}),
        force_password_change: false,
      },
    });

    if (updateError) {
      console.error("No fue posible completar el cambio obligatorio", updateError.message);
      return jsonResponse({ error: updateError.message || "No fue posible actualizar la contraseña" }, 400);
    }

    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const { error: auditError } = await adminClient.from("audit_logs").insert({
      user_id: caller.id,
      user_email: caller.email ?? null,
      company_id: null,
      action: "PASSWORD_CHANGE_FORCED_COMPLETED",
      entity_type: "auth_user",
      entity_id: caller.id,
      entity_name: caller.email ?? caller.id,
      new_values: { force_password_change: false },
      ip_address: forwardedFor,
      user_agent: req.headers.get("user-agent"),
    });
    if (auditError) console.error("No fue posible registrar la auditoría del cambio", auditError.message);

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Error inesperado al cambiar la contraseña", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "Error interno del servidor" }, 500);
  }
});
