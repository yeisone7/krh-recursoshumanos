import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (caller.id === userId) {
      return new Response(JSON.stringify({ error: "No puedes eliminar tu propio usuario" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: superAdminRow, error: superAdminError } = await supabaseAdmin
      .from("super_admins")
      .select("id")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (superAdminError || !superAdminRow) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetUserError || !targetUser.user) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId, true);
    if (deleteError) {
      console.error("Delete user error:", deleteError);
      const message = deleteError.message?.includes("Storage")
        ? "No se pudo eliminar el usuario porque es propietario de archivos en Storage"
        : deleteError.message || "No se pudo eliminar el usuario";

      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanupOperations = await Promise.all([
      supabaseAdmin.from("super_admins").delete().eq("user_id", userId),
      supabaseAdmin.from("user_custom_roles").delete().eq("user_id", userId),
      supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
      supabaseAdmin.from("user_center_assignments").delete().eq("user_id", userId),
      supabaseAdmin.from("user_company_assignments").delete().eq("user_id", userId),
      supabaseAdmin.from("employee_user_links").delete().eq("user_id", userId),
      supabaseAdmin.from("user_status").delete().eq("user_id", userId),
      supabaseAdmin.from("user_profiles").delete().eq("id", userId),
    ]);

    const cleanupErrors = cleanupOperations
      .map((result) => result.error)
      .filter(Boolean);

    if (cleanupErrors.length > 0) {
      console.error("Cleanup warning after deleting user:", cleanupErrors);
    }

    return new Response(JSON.stringify({ success: true, cleanupWarnings: cleanupErrors.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Unexpected delete-system-user error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
