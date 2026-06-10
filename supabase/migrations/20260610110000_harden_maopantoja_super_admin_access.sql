-- Ensure maopantoja17@gmail.com is recognized as a super-admin at runtime.

INSERT INTO public.super_admins (user_id)
SELECT id
FROM auth.users
WHERE lower(email) = lower('maopantoja17@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admins
    WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = lower('maopantoja17@gmail.com')
  )
$$;
