import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    
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

    // Create in-app notifications for each user
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

    console.log(`Created ${companyUsers.length} in-app notifications for requisition ${requisitionId}`);

    // Send email notifications if Resend is configured
    let emailsSent = 0;
    if (resend) {
      // Get user emails
      const { data: userProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name')
        .in('user_id', companyUsers.map(u => u.user_id));

      if (!profilesError && userProfiles && userProfiles.length > 0) {
        const validEmails = userProfiles.filter(p => p.email);
        
        for (const profile of validEmails) {
          try {
            await resend.emails.send({
              from: 'KRH <notificaciones@lovable.app>',
              to: [profile.email!],
              subject: `🔔 Requisición pendiente de aprobación - ${requisition.cargo_solicitado}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 24px; text-align: center; }
                    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                    .content { padding: 32px 24px; }
                    .badge { display: inline-block; background: #f0fdf4; color: #059669; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
                    .info-card { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
                    .info-label { color: #6b7280; font-size: 14px; }
                    .info-value { color: #111827; font-weight: 500; font-size: 14px; }
                    .cta-button { display: inline-block; background: #059669; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
                    .cta-button:hover { background: #047857; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>📋 Requisición Pendiente</h1>
                    </div>
                    <div class="content">
                      <span class="badge">Etapa: ${nextApprover.stepLabel}</span>
                      <p>Hola${profile.display_name ? ` ${profile.display_name}` : ''},</p>
                      <p>Tienes una nueva requisición de personal pendiente de tu aprobación.</p>
                      
                      <div class="info-card">
                        <div class="info-row">
                          <span class="info-label">Cargo Solicitado:</span>
                          <span class="info-value">${requisition.cargo_solicitado}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Solicitante:</span>
                          <span class="info-value">${requisition.solicitante_nombre}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Tu Etapa:</span>
                          <span class="info-value">${nextApprover.stepLabel}</span>
                        </div>
                      </div>

                      <p>Por favor revisa la requisición y registra tu decisión lo antes posible para continuar con el proceso de contratación.</p>
                      
                      <center>
                        <a href="https://krh.lovable.app/requisiciones?id=${requisitionId}" class="cta-button">
                          Revisar Requisición →
                        </a>
                      </center>
                    </div>
                    <div class="footer">
                      <p>Este es un mensaje automático del sistema KRH de gestión de recursos humanos.</p>
                      <p>© ${new Date().getFullYear()} KRH - Gestión de Recursos Humanos</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            });
            emailsSent++;
            console.log(`Email sent to ${profile.email}`);
          } catch (emailError) {
            console.error(`Error sending email to ${profile.email}:`, emailError);
            // Continue with other emails even if one fails
          }
        }
      }
    } else {
      console.log('Resend API key not configured, skipping email notifications');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifiedUsers: companyUsers.length,
        emailsSent,
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
