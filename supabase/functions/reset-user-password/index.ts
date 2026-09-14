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

const randomIndex = (max: number) => {
  const values = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return values[0] % max;
};

const pick = (characters: string) => characters[randomIndex(characters.length)];

const generateTemporaryPassword = () => {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = `${lower}${upper}${digits}${symbols}`;
  const password = [pick(lower), pick(upper), pick(digits), pick(symbols)];

  while (password.length < 16) password.push(pick(all));

  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }

  return password.join("");
};

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

    const payload = await req.json().catch(() => null) as { userId?: unknown } | null;
    const userId = typeof payload?.userId === "string" ? payload.userId.trim() : "";
    if (!userId) return jsonResponse({ error: "userId es requerido" }, 400);
    if (caller.id === userId) {
      return jsonResponse({ error: "No puedes restablecer tu propia contraseña desde esta opción" }, 400);
    }

    const { data: superAdmin, error: superAdminError } = await adminClient
      .from("super_admins")
      .select("id")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (superAdminError || !superAdmin) return jsonResponse({ error: "No autorizado" }, 403);

    const { data: targetResult, error: targetError } = await adminClient.auth.admin.getUserById(userId);
    const target = targetResult?.user;
    if (targetError || !target) return jsonResponse({ error: "Usuario no encontrado" }, 404);

    const temporaryPassword = generateTemporaryPassword();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
      app_metadata: {
        ...(target.app_metadata ?? {}),
        force_password_change: true,
      },
    });

    if (updateError) {
      console.error("No fue posible actualizar las credenciales temporales", updateError.message);
      return jsonResponse({ error: "No fue posible restablecer la contraseña" }, 400);
    }

    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const { error: auditError } = await adminClient.from("audit_logs").insert({
      user_id: caller.id,
      user_email: caller.email ?? null,
      company_id: null,
      action: "PASSWORD_RESET_FORCED",
      entity_type: "auth_user",
      entity_id: target.id,
      entity_name: target.email ?? target.id,
      new_values: { force_password_change: true },
      ip_address: forwardedFor,
      user_agent: req.headers.get("user-agent"),
    });
    if (auditError) console.error("No fue posible registrar la auditoría del restablecimiento", auditError.message);

    return jsonResponse({ success: true, temporaryPassword });
  } catch (error) {
    console.error("Error inesperado al restablecer la contraseña", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "Error interno del servidor" }, 500);
  }
});
