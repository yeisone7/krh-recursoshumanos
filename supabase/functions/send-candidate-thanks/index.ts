import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId } = await req.json();
    if (!candidateId) {
      return new Response(
        JSON.stringify({ error: "candidateId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get candidate with vacancy and company info
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("*, vacancies(company_id, position_title, companies(name))")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      return new Response(
        JSON.stringify({ error: "Candidate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!candidate.email) {
      return new Response(
        JSON.stringify({ error: "El candidato no tiene email registrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (candidate.thanks_sent_at) {
      return new Response(
        JSON.stringify({ error: "Ya se envió un agradecimiento a este candidato" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyName = (candidate.vacancies as any)?.companies?.name || "La empresa";
    const positionTitle = (candidate.vacancies as any)?.position_title || "la posición";

    // Build the public URL for the image
    const appUrl = supabaseUrl.replace('.supabase.co', '').replace('https://', '');
    const imageUrl = `https://krh-petrocasinos.lovable.app/images/IMAGEN_AGRADECIMIENTO.png`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;">
          <img src="${imageUrl}" alt="Agradecimiento" style="width:100%;height:auto;display:block;" />
          <div style="padding:24px;text-align:center;">
            <p style="color:#666;font-size:14px;line-height:1.6;">
              Estimado(a) ${candidate.first_name} ${candidate.last_name},
            </p>
            <p style="color:#666;font-size:14px;line-height:1.6;">
              Agradecemos sinceramente su interés y participación en nuestro proceso de selección 
              para el cargo de <strong>${positionTitle}</strong>.
            </p>
            <p style="color:#666;font-size:14px;line-height:1.6;">
              Le deseamos mucho éxito en sus futuros proyectos profesionales.
            </p>
            <p style="color:#999;font-size:12px;margin-top:24px;">
              Atentamente,<br/><strong>${companyName}</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${companyName} <onboarding@resend.dev>`,
        to: [candidate.email],
        subject: `Agradecimiento - Proceso de Selección ${companyName}`,
        html: htmlContent,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(
        JSON.stringify({ error: "Error al enviar email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as sent
    await supabase
      .from("candidates")
      .update({ thanks_sent_at: new Date().toISOString() })
      .eq("id", candidateId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Error:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
