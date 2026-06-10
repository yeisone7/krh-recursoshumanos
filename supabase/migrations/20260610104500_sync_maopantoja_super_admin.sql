-- Keep maopantoja17@gmail.com synchronized as a super-admin even if the auth
-- user is created after this migration runs.

INSERT INTO public.super_admins (user_id)
SELECT id
FROM auth.users
WHERE lower(email) = lower('maopantoja17@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
REVOKE ALL ON SCHEMA app_private FROM anon;
REVOKE ALL ON SCHEMA app_private FROM authenticated;

CREATE OR REPLACE FUNCTION app_private.grant_maopantoja_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF lower(NEW.email) = lower('maopantoja17@gmail.com') THEN
    INSERT INTO public.super_admins (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.grant_maopantoja_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.grant_maopantoja_super_admin() FROM anon;
REVOKE ALL ON FUNCTION app_private.grant_maopantoja_super_admin() FROM authenticated;

DROP TRIGGER IF EXISTS trg_grant_maopantoja_super_admin ON auth.users;

CREATE TRIGGER trg_grant_maopantoja_super_admin
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION app_private.grant_maopantoja_super_admin();
