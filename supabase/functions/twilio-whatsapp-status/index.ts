import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mapTwilioStatus(status: string) {
  if (["failed", "undelivered"].includes(status)) return "failed";
  if (status === "read") return "read";
  if (["sent", "delivered"].includes(status)) return "sent";
  return "queued";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const url = new URL(req.url);
    const deliveryId = url.searchParams.get("deliveryId");
    const form = await req.formData();
    const messageSid = String(form.get("MessageSid") || form.get("SmsSid") || "");
    const messageStatus = String(form.get("MessageStatus") || form.get("SmsStatus") || "");
    const errorCode = String(form.get("ErrorCode") || "");
    const errorMessage = String(form.get("ErrorMessage") || "");

    if (!deliveryId && !messageSid) {
      return new Response(JSON.stringify({ error: "Falta deliveryId o MessageSid." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patch = {
      status: mapTwilioStatus(messageStatus),
      error_message: errorCode || errorMessage ? [errorCode, errorMessage].filter(Boolean).join(" - ") : null,
      payload: {
        twilio_sid: messageSid,
        twilio_status: messageStatus,
        twilio_error_code: errorCode || null,
        callback_at: new Date().toISOString(),
      },
    };

    if (deliveryId) {
      const { data: current } = await supabase
        .from("notification_engine_deliveries")
        .select("payload")
        .eq("id", deliveryId)
        .maybeSingle();
      await supabase
        .from("notification_engine_deliveries")
        .update({ ...patch, payload: { ...(current?.payload || {}), ...patch.payload } })
        .eq("id", deliveryId);
    } else {
      const { data: matches } = await supabase
        .from("notification_engine_deliveries")
        .select("id,payload")
        .eq("channel", "whatsapp")
        .contains("payload", { twilio_sid: messageSid })
        .limit(1);

      const match = matches?.[0];
      if (match) {
        await supabase
          .from("notification_engine_deliveries")
          .update({ ...patch, payload: { ...(match.payload || {}), ...patch.payload } })
          .eq("id", match.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("twilio-whatsapp-status error:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

