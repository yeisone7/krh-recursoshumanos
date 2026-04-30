ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS gender_identity text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS gender_identity_other text;