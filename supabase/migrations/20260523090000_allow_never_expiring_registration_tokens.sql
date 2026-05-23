-- Allow employee/candidate registration links to be truly non-expiring.
ALTER TABLE public.self_registration_tokens
  ALTER COLUMN expires_at DROP NOT NULL;

COMMENT ON COLUMN public.self_registration_tokens.expires_at
  IS 'Expiration timestamp for registration links. NULL means the link has no expiration date.';
