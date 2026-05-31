ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS mobile text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, display_name, mobile)
  VALUES (
    new.id,
    COALESCE(
      (new.raw_user_meta_data->>'full_name')::text,
      ((new.raw_user_meta_data->>'first_name')::text || ' ' || (new.raw_user_meta_data->>'last_name')::text),
      ''
    ),
    COALESCE(
      (new.raw_user_meta_data->>'first_name')::text,
      split_part(new.email, '@', 1)
    ),
    COALESCE(
      (new.raw_user_meta_data->>'mobile')::text,
      (new.raw_user_meta_data->>'phone')::text
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    mobile = COALESCE(EXCLUDED.mobile, public.user_profiles.mobile),
    updated_at = now();

  RETURN new;
END;
$$;
