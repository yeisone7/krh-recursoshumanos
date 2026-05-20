ALTER TABLE public.self_registration_tokens
  ADD COLUMN IF NOT EXISTS name text;

COMMENT ON COLUMN public.self_registration_tokens.name
  IS 'Optional display name used to identify self-registration links in the app.';
