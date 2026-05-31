-- Twilio WhatsApp provider configuration for the notification engine.
-- Secrets stay in Supabase Edge Function environment variables; the JSON config
-- only stores sender metadata and the secret variable name.

INSERT INTO public.notification_engine_channel_providers (
  company_id,
  channel,
  provider_key,
  display_name,
  is_enabled,
  config,
  throttle_per_minute,
  retry_policy
)
SELECT
  c.id,
  'whatsapp'::public.notification_engine_channel,
  'twilio',
  'Twilio WhatsApp',
  false,
  jsonb_build_object(
    'provider', 'twilio',
    'mode', 'sandbox',
    'account_sid', '',
    'auth_token_secret', 'TWILIO_AUTH_TOKEN',
    'sender_id', 'whatsapp:+14155238886',
    'sender_label', 'Sandbox de Twilio',
    'content_sid', '',
    'status_callback_url', ''
  ),
  20,
  '{"max_attempts": 3, "backoff_minutes": 10}'::jsonb
FROM public.companies c
ON CONFLICT (company_id, channel, provider_key) DO NOTHING;
