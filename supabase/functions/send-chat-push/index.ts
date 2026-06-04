import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ skipped: true, reason: "VAPID secrets are not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const authHeader = req.headers.get("Authorization") || "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messageId } = await req.json();
    if (!messageId) {
      return new Response(JSON.stringify({ error: "messageId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: message, error: messageError } = await adminClient
      .from("chat_messages")
      .select("id, conversation_id, company_id, sender_id, content, message_type")
      .eq("id", messageId)
      .maybeSingle();

    if (messageError || !message) throw messageError || new Error("Message not found");
    if (message.sender_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: senderProfile } = await adminClient
      .from("user_profiles")
      .select("full_name, display_name")
      .eq("id", message.sender_id)
      .maybeSingle();

    const senderName = senderProfile?.full_name || senderProfile?.display_name || "Nuevo mensaje";
    const body =
      message.message_type === "text"
        ? message.content || "Mensaje"
        : message.message_type === "image"
          ? "Imagen"
          : message.message_type === "video"
            ? "Video"
            : message.message_type === "audio"
              ? "Nota de voz"
              : "Archivo";

    const { data: participants, error: participantsError } = await adminClient
      .from("chat_participants")
      .select("user_id, muted_until")
      .eq("conversation_id", message.conversation_id)
      .neq("user_id", message.sender_id)
      .eq("is_active", true);

    if (participantsError) throw participantsError;

    const recipientIds = (participants || [])
      .filter((participant) => !participant.muted_until || new Date(participant.muted_until).getTime() < Date.now())
      .map((participant) => participant.user_id);

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions, error: subscriptionsError } = await adminClient
      .from("chat_push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", recipientIds)
      .eq("is_active", true);

    if (subscriptionsError) throw subscriptionsError;

    const payload = JSON.stringify({
      title: senderName,
      body,
      tag: message.id,
      data: { url: `/chat?conversation=${message.conversation_id}` },
    });

    const results = await Promise.allSettled(
      ((subscriptions || []) as PushSubscriptionRow[]).map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        )
      )
    );

    const invalidSubscriptionIds = results
      .map((result, index) => ({ result, subscription: (subscriptions || [])[index] as PushSubscriptionRow }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ subscription }) => subscription.id);

    if (invalidSubscriptionIds.length > 0) {
      await adminClient.from("chat_push_subscriptions").update({ is_active: false }).in("id", invalidSubscriptionIds);
    }

    return new Response(JSON.stringify({ sent: results.filter((result) => result.status === "fulfilled").length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
