import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DeliveryStatus = "queued" | "pending" | "sent" | "read" | "attended" | "failed" | "cancelled" | "suppressed";
type Priority = "critical" | "high" | "medium" | "low" | "info";

interface SendRequest {
  companyId: string;
  to: string;
  body?: string;
  subject?: string;
  contentSid?: string;
  contentVariables?: Record<string, unknown>;
  recipientUserId?: string | null;
  eventLogId?: string | null;
  ruleId?: string | null;
  deliveryId?: string | null;
  priority?: Priority;
}

interface ProviderConfig {
  account_sid?: string;
  auth_token_secret?: string;
  sender_id?: string;
  messaging_service_sid?: string;
  content_sid?: string;
  status_callback_url?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeWhatsAppNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  const phone = trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/[^\d]/g, "")}`;
  return `whatsapp:${phone}`;
}

function mapTwilioStatus(status: string): DeliveryStatus {
  if (["failed", "undelivered"].includes(status)) return "failed";
  if (status === "read") return "read";
  if (["sent", "delivered"].includes(status)) return "sent";
  return "queued";
}

async function verifyAccess(supabase: any, userId: string, companyId: string) {
  const { data: companyAssignment } = await supabase
    .from("user_company_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (superAdmin) return true;
  if (!companyAssignment) return false;

  const checks = await Promise.all([
    supabase.rpc("check_user_permission", { _user_id: userId, _module_code: "motor_notificaciones", _action: "create" }),
    supabase.rpc("check_user_permission", { _user_id: userId, _module_code: "motor_notificaciones", _action: "update" }),
    supabase.rpc("check_user_permission", { _user_id: userId, _module_code: "alertas", _action: "create" }),
    supabase.rpc("check_user_permission", { _user_id: userId, _module_code: "alertas", _action: "update" }),
  ]);

  return checks.some(({ data }) => data === true);
}

async function sendTwilioMessage({
  accountSid,
  authToken,
  from,
  messagingServiceSid,
  to,
  body,
  contentSid,
  contentVariables,
  statusCallback,
}: {
  accountSid: string;
  authToken: string;
  from?: string;
  messagingServiceSid?: string;
  to: string;
  body?: string;
  contentSid?: string;
  contentVariables?: Record<string, unknown>;
  statusCallback?: string;
}) {
  const params = new URLSearchParams();
  params.set("To", to);
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
  else if (from) params.set("From", from);
  if (contentSid) {
    params.set("ContentSid", contentSid);
    if (contentVariables) params.set("ContentVariables", JSON.stringify(contentVariables));
  } else if (body) {
    params.set("Body", body);
  }
  if (statusCallback) params.set("StatusCallback", statusCallback);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || "Twilio no pudo enviar el mensaje.");
  }
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    if (!authHeader) return jsonResponse({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    const userId = userData?.user?.id;
    if (userError || !userId) return jsonResponse({ error: "No autorizado" }, 401);

    const requestBody: SendRequest = await req.json();
    const { companyId, to } = requestBody;
    const body = requestBody.body?.trim();
    if (!companyId || !to) return jsonResponse({ error: "Faltan companyId y to." }, 400);

    const allowed = await verifyAccess(supabaseAdmin, userId, companyId);
    if (!allowed) return jsonResponse({ error: "No tienes permiso para enviar WhatsApp en esta empresa." }, 403);

    const { data: provider, error: providerError } = await supabaseAdmin
      .from("notification_engine_channel_providers")
      .select("*")
      .eq("company_id", companyId)
      .eq("channel", "whatsapp")
      .eq("provider_key", "twilio")
      .eq("is_enabled", true)
      .maybeSingle();

    if (providerError) throw providerError;
    if (!provider) return jsonResponse({ error: "Twilio WhatsApp no esta habilitado para esta empresa." }, 400);

    const config = (provider.config || {}) as ProviderConfig;
    const accountSid = String(config.account_sid || "").trim();
    const tokenSecretName = String(config.auth_token_secret || "TWILIO_AUTH_TOKEN").trim();
    const authToken = tokenSecretName.startsWith("TWILIO_") ? Deno.env.get(tokenSecretName) : null;
    const from = config.sender_id ? normalizeWhatsAppNumber(config.sender_id) : undefined;
    const messagingServiceSid = config.messaging_service_sid?.trim();
    const contentSid = requestBody.contentSid || config.content_sid || undefined;

    if (!accountSid) return jsonResponse({ error: "Configura el Account SID de Twilio." }, 400);
    if (!authToken) return jsonResponse({ error: `Configura el secreto ${tokenSecretName} en Supabase.` }, 400);
    if (!messagingServiceSid && !from) return jsonResponse({ error: "Configura un sender WhatsApp o Messaging Service SID." }, 400);
    if (!contentSid && !body) return jsonResponse({ error: "Escribe un mensaje o configura un Content SID aprobado." }, 400);

    const deliveryPayload = {
      to: normalizeWhatsAppNumber(to),
      from,
      messaging_service_sid: messagingServiceSid || null,
      provider_config_id: provider.id,
      content_sid: contentSid || null,
      content_variables: requestBody.contentVariables || null,
    };

    let deliveryId = requestBody.deliveryId || null;
    if (!deliveryId) {
      const { data: delivery, error: deliveryError } = await supabaseAdmin
        .from("notification_engine_deliveries")
        .insert({
          company_id: companyId,
          event_log_id: requestBody.eventLogId || null,
          rule_id: requestBody.ruleId || null,
          recipient_user_id: requestBody.recipientUserId || null,
          channel: "whatsapp",
          provider_key: "twilio",
          priority: requestBody.priority || "medium",
          status: "queued",
          subject: requestBody.subject || "WhatsApp Twilio",
          body: body || null,
          payload: deliveryPayload,
        })
        .select("id")
        .single();

      if (deliveryError) throw deliveryError;
      deliveryId = delivery.id;
    }

    const defaultCallback = `${supabaseUrl}/functions/v1/twilio-whatsapp-status?deliveryId=${deliveryId}`;
    const statusCallback = config.status_callback_url?.trim() || defaultCallback;

    try {
      const twilioMessage = await sendTwilioMessage({
        accountSid,
        authToken,
        from,
        messagingServiceSid,
        to: normalizeWhatsAppNumber(to),
        body,
        contentSid,
        contentVariables: requestBody.contentVariables,
        statusCallback,
      });

      const status = mapTwilioStatus(twilioMessage.status || "queued");
      await supabaseAdmin
        .from("notification_engine_deliveries")
        .update({
          status,
          sent_at: status === "failed" ? null : new Date().toISOString(),
          payload: {
            ...deliveryPayload,
            twilio_sid: twilioMessage.sid,
            twilio_status: twilioMessage.status,
            status_callback_url: statusCallback,
          },
          error_message: null,
        })
        .eq("id", deliveryId);

      return jsonResponse({
        success: true,
        deliveryId,
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error enviando WhatsApp.";
      await supabaseAdmin
        .from("notification_engine_deliveries")
        .update({ status: "failed", error_message: message })
        .eq("id", deliveryId);
      return jsonResponse({ error: message, deliveryId }, 502);
    }
  } catch (error) {
    console.error("twilio-whatsapp-send error:", error);
    const message = error instanceof Error ? error.message : "Error interno";
    return jsonResponse({ error: message }, 500);
  }
});

