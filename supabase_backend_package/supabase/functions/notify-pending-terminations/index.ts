import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingTermination {
  id: string;
  employee_name: string;
  employee_position: string;
  termination_type: string;
  effective_date: string;
  created_at: string;
  days_pending: number;
  pending_documents: number;
  total_documents: number;
  company_name: string;
  company_email: string | null;
}

const terminationTypeLabels: Record<string, string> = {
  mutuo_acuerdo: 'Mutuo Acuerdo',
  preaviso: 'Preaviso / No renovación',
  periodo_prueba: 'Periodo de Prueba',
  obra_labor: 'Finalización Obra o Labor',
  sin_justa_causa: 'Sin Justa Causa',
  renuncia: 'Renuncia Voluntaria',
};

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'KRH Sistema <onboarding@resend.dev>', // Use your verified domain in production
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

async function getCompanyConfigs(supabase: any): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('system_config')
    .select('company_id, config_value')
    .eq('config_key', 'alert_termination_pending_days');

  if (error) {
    console.error('Error fetching company configs:', error);
    return new Map();
  }

  const configMap = new Map<string, number>();
  for (const item of data || []) {
    const minDays = item.config_value?.min_days || 7;
    configMap.set(item.company_id, minDays);
  }
  return configMap;
}

async function getPendingTerminations(supabase: any, defaultMinDays: number = 7): Promise<PendingTermination[]> {
  // Get company-specific configs
  const companyConfigs = await getCompanyConfigs(supabase);

  const { data, error } = await supabase
    .from('employee_terminations')
    .select(`
      id,
      termination_type,
      effective_date,
      created_at,
      company_id,
      employees!inner(first_name, last_name, position),
      companies!inner(name, email),
      termination_documents(is_generated)
    `)
    .eq('is_completed', false);

  if (error) {
    console.error('Error fetching pending terminations:', error);
    throw error;
  }

  const results: PendingTermination[] = [];
  
  for (const item of data || []) {
    const daysPending = Math.floor((Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    // Use company-specific config or default
    const minDays = companyConfigs.get(item.company_id) ?? defaultMinDays;
    
    // Only include if pending for at least minDays
    if (daysPending >= minDays) {
      const documents = item.termination_documents || [];
      const totalDocs = documents.length;
      const completedDocs = documents.filter((d: any) => d.is_generated).length;

      results.push({
        id: item.id,
        employee_name: `${item.employees.first_name} ${item.employees.last_name}`,
        employee_position: item.employees.position,
        termination_type: item.termination_type,
        effective_date: item.effective_date,
        created_at: item.created_at,
        days_pending: daysPending,
        pending_documents: totalDocs - completedDocs,
        total_documents: totalDocs,
        company_name: item.companies.name,
        company_email: item.companies.email,
      });
    }
  }

  return results;
}

function generateEmailHtml(terminations: PendingTermination[]): string {
  const rows = terminations.map(t => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${t.employee_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${t.employee_position}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${terminationTypeLabels[t.termination_type] || t.termination_type}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
          ${t.days_pending} días
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${t.total_documents - t.pending_documents}/${t.total_documents}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(t.effective_date).toLocaleDateString('es-CO')}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Procesos de Retiro Pendientes</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Procesos de Retiro Pendientes</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Los siguientes procesos llevan más de 7 días sin completar</p>
      </div>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Empleado</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Cargo</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Tipo</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Días Pendiente</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Documentos</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Fecha Efectiva</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f97316;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Acción requerida:</strong> Por favor, complete los documentos pendientes para finalizar estos procesos de desvinculación.
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
          Este es un correo automático del sistema KRH. No responda a este mensaje.
        </p>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting pending terminations notification check...');

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get minimum days from request body or default to 7
    let minDays = 7;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.minDays && typeof body.minDays === 'number') {
          minDays = body.minDays;
        }
      } catch {
        // Use default if no body
      }
    }

    // Fetch pending terminations
    const pendingTerminations = await getPendingTerminations(supabase, minDays);
    
    console.log(`Found ${pendingTerminations.length} pending terminations older than ${minDays} days`);

    if (pendingTerminations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending terminations found',
          count: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Group by company
    const byCompany = pendingTerminations.reduce((acc, t) => {
      const key = t.company_name;
      if (!acc[key]) {
        acc[key] = { email: t.company_email, terminations: [] };
      }
      acc[key].terminations.push(t);
      return acc;
    }, {} as Record<string, { email: string | null; terminations: PendingTermination[] }>);

    const emailResults: { company: string; success: boolean; error?: string }[] = [];

    // Send email to each company that has an email configured
    for (const [companyName, data] of Object.entries(byCompany)) {
      if (!data.email) {
        console.log(`Skipping ${companyName}: no email configured`);
        emailResults.push({ company: companyName, success: false, error: 'No email configured' });
        continue;
      }

      const html = generateEmailHtml(data.terminations);
      const subject = `⚠️ ${data.terminations.length} proceso(s) de retiro pendiente(s) - ${companyName}`;
      
      const result = await sendEmail(data.email, subject, html);
      emailResults.push({ company: companyName, ...result });
    }

    // Log notification event
    await supabase.from('audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      action: 'pending_termination_notification',
      entity_type: 'notification',
      new_values: {
        total_pending: pendingTerminations.length,
        min_days: minDays,
        email_results: emailResults,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingTerminations.length} pending terminations`,
        count: pendingTerminations.length,
        emailResults,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in notify-pending-terminations function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
