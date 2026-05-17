import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncapacityAlert {
  id: string;
  employee_name: string;
  employee_document: string;
  diagnosis: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  total_days: number;
  origin: string;
  recovery_status: string;
  days_without_management: number;
  total_amount: number;
  alert_type: 'expiring' | 'recovery_pending';
  company_name: string;
  company_email: string | null;
}

const originLabels: Record<string, string> = {
  comun: 'Enfermedad Común',
  laboral: 'Accidente Laboral',
};

const recoveryStatusLabels: Record<string, string> = {
  pendiente: 'Pendiente de Radicar',
  radicado: 'Radicado',
  en_tramite: 'En Trámite',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  pagado: 'Pagado',
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

async function getIncapacityAlerts(supabase: any): Promise<IncapacityAlert[]> {
  const today = new Date();
  
  // Fetch active and recent incapacities
  const { data, error } = await supabase
    .from('employee_incapacities')
    .select(`
      id,
      start_date,
      end_date,
      total_days,
      origin,
      diagnosis,
      recovery_status,
      total_amount,
      created_at,
      company_id,
      employee:employees_v2!inner(first_name, last_name, document_number),
      company:companies!inner(name, email)
    `)
    .in('recovery_status', ['pendiente', 'radicado', 'en_tramite']);

  if (error) {
    console.error('Error fetching incapacities:', error);
    throw error;
  }

  const alerts: IncapacityAlert[] = [];

  for (const inc of data || []) {
    const endDate = new Date(inc.end_date);
    const createdDate = new Date(inc.created_at);
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    const baseAlert = {
      id: inc.id,
      employee_name: `${inc.employee.first_name} ${inc.employee.last_name}`,
      employee_document: inc.employee.document_number,
      diagnosis: inc.diagnosis,
      start_date: inc.start_date,
      end_date: inc.end_date,
      total_days: inc.total_days,
      origin: inc.origin,
      recovery_status: inc.recovery_status,
      total_amount: inc.total_amount || 0,
      company_name: inc.company.name,
      company_email: inc.company.email,
    };

    // Alert for incapacity about to expire (within 3 days)
    if (daysRemaining >= 0 && daysRemaining <= 3) {
      alerts.push({
        ...baseAlert,
        days_remaining: daysRemaining,
        days_without_management: 0,
        alert_type: 'expiring',
      });
    }

    // Alert for recovery pending more than 15 days without management
    if (inc.recovery_status === 'pendiente' && daysSinceCreation >= 15) {
      alerts.push({
        ...baseAlert,
        days_remaining: daysRemaining,
        days_without_management: daysSinceCreation,
        alert_type: 'recovery_pending',
      });
    }
  }

  return alerts;
}

function generateExpiringEmailHtml(alerts: IncapacityAlert[]): string {
  const rows = alerts.map(a => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${a.employee_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${a.employee_document}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; max-width: 200px;">${a.diagnosis}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(a.end_date).toLocaleDateString('es-CO')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background-color: ${a.days_remaining <= 1 ? '#fee2e2' : '#fef3c7'}; color: ${a.days_remaining <= 1 ? '#b91c1c' : '#92400e'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
          ${a.days_remaining === 0 ? 'Hoy' : `${a.days_remaining} día(s)`}
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${a.total_days} días</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Incapacidades por Vencer</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Incapacidades por Vencer</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Las siguientes incapacidades vencen en los próximos 3 días</p>
      </div>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Empleado</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Documento</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Diagnóstico</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Vencimiento</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Días Restantes</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Duración</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div style="margin-top: 24px; padding: 16px; background-color: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Acción recomendada:</strong> Verifique si el empleado necesita prórroga o examen de reintegro.
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
          Este es un correo automático del sistema EmpatiQ. No responda a este mensaje.
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateRecoveryPendingEmailHtml(alerts: IncapacityAlert[]): string {
  const rows = alerts.map(a => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${a.employee_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${a.employee_document}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${originLabels[a.origin] || a.origin}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background-color: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
          ${a.days_without_management} días
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${recoveryStatusLabels[a.recovery_status]}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        $${a.total_amount.toLocaleString('es-CO')}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Recobros Sin Gestionar</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Recobros Pendientes de Gestión</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Los siguientes recobros llevan más de 15 días sin gestionar</p>
      </div>
      
      <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Empleado</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Documento</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Origen</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Días Sin Gestión</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Estado</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f97316;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Acción requerida:</strong> Radique estos recobros ante la EPS/ARL correspondiente para evitar pérdida de recursos.
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
          Este es un correo automático del sistema EmpatiQ. No responda a este mensaje.
        </p>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting incapacity alerts check...');

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const alerts = await getIncapacityAlerts(supabase);
    
    console.log(`Found ${alerts.length} incapacity alerts`);

    if (alerts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No incapacity alerts found',
          count: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Group alerts by company and type
    const byCompany = alerts.reduce((acc, alert) => {
      const key = alert.company_name;
      if (!acc[key]) {
        acc[key] = { 
          email: alert.company_email, 
          expiring: [] as IncapacityAlert[], 
          recovery_pending: [] as IncapacityAlert[] 
        };
      }
      if (alert.alert_type === 'expiring') {
        acc[key].expiring.push(alert);
      } else {
        acc[key].recovery_pending.push(alert);
      }
      return acc;
    }, {} as Record<string, { email: string | null; expiring: IncapacityAlert[]; recovery_pending: IncapacityAlert[] }>);

    const emailResults: { company: string; type: string; success: boolean; error?: string }[] = [];

    for (const [companyName, data] of Object.entries(byCompany)) {
      if (!data.email) {
        console.log(`Skipping ${companyName}: no email configured`);
        emailResults.push({ company: companyName, type: 'all', success: false, error: 'No email configured' });
        continue;
      }

      // Send expiring alerts
      if (data.expiring.length > 0) {
        const html = generateExpiringEmailHtml(data.expiring);
        const subject = `🏥 ${data.expiring.length} incapacidad(es) por vencer - ${companyName}`;
        const result = await sendEmail(data.email, subject, html);
        emailResults.push({ company: companyName, type: 'expiring', ...result });
      }

      // Send recovery pending alerts
      if (data.recovery_pending.length > 0) {
        const html = generateRecoveryPendingEmailHtml(data.recovery_pending);
        const subject = `⚠️ ${data.recovery_pending.length} recobro(s) sin gestionar - ${companyName}`;
        const result = await sendEmail(data.email, subject, html);
        emailResults.push({ company: companyName, type: 'recovery_pending', ...result });
      }
    }

    // Log notification event
    await supabase.from('audit_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action: 'incapacity_alert_notification',
      entity_type: 'notification',
      new_values: {
        total_alerts: alerts.length,
        expiring_count: alerts.filter(a => a.alert_type === 'expiring').length,
        recovery_pending_count: alerts.filter(a => a.alert_type === 'recovery_pending').length,
        email_results: emailResults,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${alerts.length} incapacity alerts`,
        count: alerts.length,
        emailResults,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in notify-incapacity-alerts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
