-- Keep the admin status and Auth ban in the same transaction. This also
-- covers status changes made outside the UI and revokes refresh sessions.
CREATE SCHEMA IF NOT EXISTS access_private;
REVOKE ALL ON SCHEMA access_private FROM PUBLIC, anon, authenticated;

CREATE TABLE access_private.user_suspension_bans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_banned_until timestamptz
);
REVOKE ALL ON access_private.user_suspension_bans FROM PUBLIC, anon, authenticated;

CREATE FUNCTION access_private.sync_user_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT NEW.is_active THEN
    INSERT INTO access_private.user_suspension_bans (user_id, previous_banned_until)
    SELECT id, banned_until FROM auth.users WHERE id = NEW.user_id
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE auth.users SET banned_until = '9999-12-31 00:00:00+00'::timestamptz
    WHERE id = NEW.user_id;
    DELETE FROM auth.sessions WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND NOT OLD.is_active THEN
    -- Do not remove a ban managed independently through the Auth admin API.
    UPDATE auth.users u SET banned_until = b.previous_banned_until
    FROM access_private.user_suspension_bans b
    WHERE u.id = NEW.user_id AND b.user_id = u.id
      AND u.banned_until = '9999-12-31 00:00:00+00'::timestamptz;
    DELETE FROM access_private.user_suspension_bans WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION access_private.sync_user_suspension() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER sync_user_suspension
AFTER INSERT OR UPDATE OF is_active ON public.user_status
FOR EACH ROW EXECUTE FUNCTION access_private.sync_user_suspension();

-- Auth bans do not revoke an already issued JWT. Reject suspended JWTs
-- before every REST query/RPC, including SECURITY DEFINER RPCs.
CREATE FUNCTION public.check_user_access()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
     AND NOT public.is_user_active(auth.uid()) THEN
    RAISE SQLSTATE 'PT403' USING MESSAGE = 'Tu cuenta está suspendida. Contacta al administrador.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.check_user_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_access() TO anon, authenticated, service_role;

-- Never silently replace an existing project-specific pre-request check.
DO $$
DECLARE existing text;
BEGIN
  SELECT split_part(setting, '=', 2) INTO existing
  FROM pg_roles r CROSS JOIN LATERAL unnest(r.rolconfig) setting
  WHERE r.rolname = 'authenticator' AND setting LIKE 'pgrst.db_pre_request=%';
  IF existing IS NOT NULL AND existing <> '' AND existing <> 'public.check_user_access' THEN
    RAISE EXCEPTION 'Existing db_pre_request (%) must be composed with check_user_access before applying this migration', existing;
  END IF;
END;
$$;
ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.check_user_access';

-- Repair users already suspended before this migration was installed.
INSERT INTO access_private.user_suspension_bans (user_id, previous_banned_until)
SELECT u.id, u.banned_until FROM auth.users u
JOIN public.user_status s ON s.user_id = u.id WHERE NOT s.is_active;
UPDATE auth.users u SET banned_until = '9999-12-31 00:00:00+00'::timestamptz
FROM public.user_status s WHERE s.user_id = u.id AND NOT s.is_active;
DELETE FROM auth.sessions x USING public.user_status s
WHERE s.user_id = x.user_id AND NOT s.is_active;

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
