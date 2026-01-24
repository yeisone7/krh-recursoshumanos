import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OnboardingRequest {
  companyName: string;
  companyNit: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Client with user token for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: OnboardingRequest = await req.json();
    
    if (!body.companyName || !body.companyNit) {
      return new Response(
        JSON.stringify({ error: "Company name and NIT are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has a company assigned
    const { data: existingAssignment } = await supabaseAdmin
      .from("user_company_assignments")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingAssignment) {
      return new Response(
        JSON.stringify({ error: "User already has a company assigned" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if company with same NIT already exists
    const { data: existingCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("nit", body.companyNit)
      .single();

    if (existingCompany) {
      return new Response(
        JSON.stringify({ error: "A company with this NIT already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: body.companyName,
        nit: body.companyNit,
        address: body.companyAddress || null,
        phone: body.companyPhone || null,
        email: body.companyEmail || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      return new Response(
        JSON.stringify({ error: "Failed to create company" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign admin role to user
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "admin",
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      // Rollback company creation
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign admin role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign user to company
    const { error: assignmentError } = await supabaseAdmin
      .from("user_company_assignments")
      .insert({
        user_id: user.id,
        company_id: company.id,
      });

    if (assignmentError) {
      console.error("Error assigning company:", assignmentError);
      // Rollback
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign company" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        company: {
          id: company.id,
          name: company.name,
          nit: company.nit,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Onboarding error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
