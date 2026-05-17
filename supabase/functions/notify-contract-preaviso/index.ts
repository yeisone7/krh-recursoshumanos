import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContractPreaviso {
  contract_id: string;
  employee_name: string;
  contract_type: string;
  current_end_date: string;
  days_remaining: number;
  extension_count: number;
  company_name: string;
  company_id: string;
}

interface AdminUser {
  email: string;
  company_id: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EmpatiQ Sistema <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      return { success: false, error: errorData.message || 'Failed to send email' };
    }

    const data = await response.json();
    console.log('Email sent successfully:', data);
    return { success: true };
  } catch (error: any) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

function calculateDaysRemaining(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const contractTypeLabels: Record<string, string> = {
  fijo: 'Término Fijo',
  obra_labor: 'Obra o Labor',
  aprendizaje: 'Aprendizaje',
};

async function getContractsInPreaviso(supabase: any): Promise<ContractPreaviso[]> {
  // Get contracts that are NOT indefinite and NOT terminated
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_type,
      end_date,
      employee_id,
      is_terminated,
      contract_extensions(id, end_date, extension_number)
    `)
    .eq('is_terminated', false)
    .neq('contract_type', 'indefinido');

  if (error) {
    console.error('Error fetching contracts:', error);
    throw error;
  }

  const results: ContractPreaviso[] = [];

  for (const contract of contracts || []) {
    // Calculate current end date considering extensions
    let currentEndDate = contract.end_date;
    const extensionCount = contract.contract_extensions?.length || 0;
    
    if (extensionCount > 0) {
      const latestExtension = contract.contract_extensions.reduce(
        (latest: any, current: any) =>
          current.extension_number > latest.extension_number ? current : latest
      );
      currentEndDate = latestExtension.end_date;
    }

    if (!currentEndDate) continue;

    const daysRemaining = calculateDaysRemaining(currentEndDate);

    // Only include contracts in preaviso period (35-31 days)
    if (daysRemaining > 30 && daysRemaining <= 35) {
      // Get employee info
      const { data: employee } = await supabase
        .from('employees_v2')
        .select('first_name, last_name, company_id, companies(name)')
        .eq('id', contract.employee_id)
        .single();

      if (employee) {
        results.push({
          contract_id: contract.id,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          contract_type: contract.contract_type,
          current_end_date: currentEndDate,
          days_remaining: daysRemaining,
          extension_count: extensionCount,
          company_name: employee.companies?.name || 'Sin empresa',
          company_id: employee.company_id,
        });
      }
    }
  }

  return results;
}

async function getAdminUsers(supabase: any, companyIds: string[]): Promise<Map<string, string[]>> {
  // Get admin and rrhh users for notifications
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('role', ['admin', 'rrhh']);

  if (!userRoles || userRoles.length === 0) return new Map();

  const userIds = userRoles.map((ur: any) => ur.user_id);

  // Get user company assignments
  const { data: assignments } = await supabase
    .from('user_company_assignments')
    .select('user_id, company_id')
    .in('user_id', userIds)
    .in('company_id', companyIds);

  // Get user emails from auth (via profiles or user metadata)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, notification_email')
    .in('id', userIds);

  const emailMap = new Map<string, string>();
  for (const profile of profiles || []) {
    if (profile.notification_email) {
      emailMap.set(profile.id, profile.notification_email);
    }
  }

  // Group by company
  const companyAdmins = new Map<string, string[]>();
  for (const assignment of assignments || []) {
    const email = emailMap.get(assignment.user_id);
    if (email) {
      if (!companyAdmins.has(assignment.company_id)) {
        companyAdmins.set(assignment.company_id, []);
      }
      companyAdmins.get(assignment.company_id)!.push(email);
    }
  }

  return companyAdmins;
}

function generateEmailHtml(contracts: ContractPreaviso[]): string {
  const rows = contracts.map(c => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${c.employee_name}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        ${contractTypeLabels[c.contract_type] || c.contract_type}
        ${c.extension_count > 0 ? `<br><span style="font-size: 12px; color: #6b7280;">(Prórroga #${c.extension_count})</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
          ${c.days_remaining} días
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        ${new Date(c.current_end_date).toLocaleDateString('es-CO')}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
          ${c.days_remaining - 30} día(s) para decidir
        </span>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Preaviso de Contratos - Acción Requerida</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚖️ Período de Preaviso Activo</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Los siguientes contratos están dentro del período de 35 días - Ley Colombiana Art. 46 CST</p>
      </div>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px;">
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
          <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">⚠️ IMPORTANTE - Ley Laboral Colombiana</h3>
          <p style="margin: 0; color: #78350f; font-size: 13px;">
            Según el <strong>Artículo 46 del Código Sustantivo del Trabajo</strong>, si no se da preaviso de no renovación con <strong>30 días de anticipación</strong>, 
            el contrato se prorroga automáticamente por el mismo término inicial. Use este período para decidir si la prórroga será:
          </p>
          <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #78350f; font-size: 13px;">
            <li><strong>Pactada:</strong> Acordar por escrito nuevas condiciones o términos de la prórroga</li>
            <li><strong>Automática:</strong> Si no hay acción, se renueva automáticamente por el mismo período</li>
          </ul>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Empleado</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Tipo Contrato</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Días Restantes</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Vencimiento</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Plazo Decisión</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Acción requerida:</strong> Ingrese al módulo de Contratos en EmpatiQ para registrar prórrogas pactadas o confirmar renovación automática 
            antes de que expire el plazo de 30 días.
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
          Este es un correo automático del sistema EmpatiQ de gestión de Recursos Humanos.<br>
          No responda a este mensaje.
        </p>
      </div>
    </body>
    </html>
  `;
}

async function createNotifications(supabase: any, contracts: ContractPreaviso[]): Promise<void> {
  // Get admin/rrhh users for each company
  const companyIds = [...new Set(contracts.map(c => c.company_id))];
  
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'rrhh']);

  if (!userRoles || userRoles.length === 0) return;

  const userIds = userRoles.map((ur: any) => ur.user_id);

  // Get user company assignments
  const { data: assignments } = await supabase
    .from('user_company_assignments')
    .select('user_id, company_id')
    .in('user_id', userIds)
    .in('company_id', companyIds);

  if (!assignments) return;

  // Create in-app notifications
  const notifications = [];
  for (const contract of contracts) {
    const usersForCompany = assignments
      .filter((a: any) => a.company_id === contract.company_id)
      .map((a: any) => a.user_id);

    for (const userId of usersForCompany) {
      notifications.push({
        user_id: userId,
        company_id: contract.company_id,
        title: '⚖️ Preaviso de Contrato Activo',
        message: `${contract.employee_name}: Contrato vence en ${contract.days_remaining} días. Decide tipo de prórroga antes de ${contract.days_remaining - 30} día(s).`,
        type: 'warning',
        category: 'contracts',
        entity_type: 'contract',
        entity_id: contract.contract_id,
        action_url: `/contratos?detail=${contract.contract_id}`,
        is_read: false,
      });
    }
  }

  if (notifications.length > 0) {
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) {
      console.error('Error creating notifications:', error);
    } else {
      console.log(`Created ${notifications.length} in-app notifications`);
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting contract preaviso notification check...');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch contracts in preaviso period (35-31 days)
    const contractsInPreaviso = await getContractsInPreaviso(supabase);
    
    console.log(`Found ${contractsInPreaviso.length} contracts in preaviso period`);

    if (contractsInPreaviso.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No contracts in preaviso period',
          count: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create in-app notifications
    await createNotifications(supabase, contractsInPreaviso);

    // Send email notifications if RESEND is configured
    const emailResults: { company: string; success: boolean; error?: string }[] = [];

    if (RESEND_API_KEY) {
      // Group by company
      const byCompany = contractsInPreaviso.reduce((acc, c) => {
        if (!acc[c.company_id]) {
          acc[c.company_id] = { name: c.company_name, contracts: [] };
        }
        acc[c.company_id].contracts.push(c);
        return acc;
      }, {} as Record<string, { name: string; contracts: ContractPreaviso[] }>);

      // Get admin emails
      const companyIds = Object.keys(byCompany);
      const adminEmails = await getAdminUsers(supabase, companyIds);

      // Send emails
      for (const [companyId, data] of Object.entries(byCompany)) {
        const emails = adminEmails.get(companyId) || [];
        
        if (emails.length === 0) {
          console.log(`Skipping ${data.name}: no admin emails configured`);
          emailResults.push({ company: data.name, success: false, error: 'No admin emails configured' });
          continue;
        }

        const html = generateEmailHtml(data.contracts);
        const subject = `⚖️ ${data.contracts.length} contrato(s) en período de preaviso - ${data.name}`;
        
        for (const email of emails) {
          const result = await sendEmail(email, subject, html);
          emailResults.push({ company: data.name, ...result });
        }
      }
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action: 'contract_preaviso_notification',
      entity_type: 'notification',
      new_values: {
        total_contracts: contractsInPreaviso.length,
        email_results: emailResults,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${contractsInPreaviso.length} contracts in preaviso period`,
        count: contractsInPreaviso.length,
        contracts: contractsInPreaviso.map(c => ({
          employee: c.employee_name,
          daysRemaining: c.days_remaining,
          decisionDeadline: c.days_remaining - 30,
        })),
        emailResults,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in notify-contract-preaviso function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
