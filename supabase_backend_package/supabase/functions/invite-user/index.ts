import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  roles: string[];
  companyId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify current user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (rolesError || !roles || roles.length === 0) {
      console.error("Not admin:", rolesError);
      return new Response(
        JSON.stringify({ error: "Only admins can invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: InviteRequest = await req.json();
    const { email, roles: newRoles, companyId } = body;

    if (!email || !newRoles || !companyId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, roles, companyId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Inviting user ${email} with roles ${newRoles.join(", ")} to company ${companyId}`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let invitedUserId: string;

    if (existingUser) {
      console.log("User already exists, adding to company");
      invitedUserId = existingUser.id;

      // Check if already assigned to this company
      const { data: existingAssignment } = await supabaseAdmin
        .from("user_company_assignments")
        .select("id")
        .eq("user_id", invitedUserId)
        .eq("company_id", companyId)
        .single();

      if (existingAssignment) {
        return new Response(
          JSON.stringify({ error: "User is already assigned to this company" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user with invite
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${req.headers.get("origin") || "https://lovable.dev"}/auth`,
      });

      if (inviteError) {
        console.error("Invite error:", inviteError);
        return new Response(
          JSON.stringify({ error: `Failed to invite user: ${inviteError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      invitedUserId = inviteData.user.id;
      console.log("User invited successfully:", invitedUserId);
    }

    // Assign roles
    for (const role of newRoles) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: invitedUserId, role }, { onConflict: "user_id,role" });

      if (roleError) {
        console.error("Role assignment error:", roleError);
      }
    }

    // Assign company
    const { error: companyError } = await supabaseAdmin
      .from("user_company_assignments")
      .insert({ user_id: invitedUserId, company_id: companyId });

    if (companyError) {
      console.error("Company assignment error:", companyError);
      return new Response(
        JSON.stringify({ error: "Failed to assign user to company" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User invitation complete");

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: invitedUserId,
        message: existingUser ? "User added to company" : "Invitation sent"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
