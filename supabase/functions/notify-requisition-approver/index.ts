import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotifyRequest {
  requisitionId: string;
  currentStep: string;
  requisitionTitle: string;
}

// Map current status to the next approver role
const statusToNextRole: Record<string, { role: string; stepLabel: string }> = {
  'en_operaciones': { role: 'operaciones', stepLabel: 'Operaciones' },
  'en_rrhh': { role: 'rrhh', stepLabel: 'Recursos Humanos' },
  'en_juridico': { role: 'admin', stepLabel: 'Jurídico' },
  'en_gerencia': { role: 'admin', stepLabel: 'Gerencia' },
  'en_seleccion': { role: 'rrhh', stepLabel: 'Selección' },
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { requisitionId, currentStep, requisitionTitle }: NotifyRequest = await req.json();
    
    if (!requisitionId || !currentStep) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: requisitionId and currentStep' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requisition details
    const { data: requisition, error: reqError } = await supabase
      .from('personnel_requisitions')
      .select('company_id, cargo_solicitado, solicitante_nombre')
      .eq('id', requisitionId)
      .single();

    if (reqError || !requisition) {
      console.error('Error fetching requisition:', reqError);
      return new Response(
        JSON.stringify({ error: 'Requisition not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nextApprover = statusToNextRole[currentStep];
    
    if (!nextApprover) {
      // No more approvers (requisition is approved or rejected)
      return new Response(
        JSON.stringify({ message: 'No next approver to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find users with the appropriate role in this company
    const { data: usersWithRole, error: usersError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', nextApprover.role);

    if (usersError) {
      console.error('Error fetching users with role:', usersError);
      throw usersError;
    }

    if (!usersWithRole || usersWithRole.length === 0) {
      console.log(`No users found with role ${nextApprover.role}`);
      return new Response(
        JSON.stringify({ message: 'No users to notify for this role' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter users that belong to this company
    const userIds = usersWithRole.map(u => u.user_id);
    const { data: companyUsers, error: companyUsersError } = await supabase
      .from('user_company_assignments')
      .select('user_id')
      .eq('company_id', requisition.company_id)
      .in('user_id', userIds);

    if (companyUsersError) {
      console.error('Error fetching company users:', companyUsersError);
      throw companyUsersError;
    }

    if (!companyUsers || companyUsers.length === 0) {
      console.log('No users in this company with the required role');
      return new Response(
        JSON.stringify({ message: 'No users in company to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notifications for each user
    const notifications = companyUsers.map(user => ({
      user_id: user.user_id,
      company_id: requisition.company_id,
      title: `Requisición pendiente de aprobación`,
      message: `La requisición "${requisition.cargo_solicitado}" de ${requisition.solicitante_nombre} requiere tu aprobación en la etapa de ${nextApprover.stepLabel}.`,
      type: 'requisition_approval',
      entity_type: 'requisition',
      entity_id: requisitionId,
      action_url: `/requisiciones?id=${requisitionId}`,
      priority: 'high',
      is_read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      throw insertError;
    }

    console.log(`Notified ${companyUsers.length} users for requisition ${requisitionId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifiedUsers: companyUsers.length,
        step: nextApprover.stepLabel 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in notify-requisition-approver:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
