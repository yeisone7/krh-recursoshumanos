-- Repeated writes of the suspended state must not overwrite a newer Auth ban.
CREATE OR REPLACE FUNCTION access_private.sync_user_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT NEW.is_active THEN
    IF TG_OP = 'INSERT' OR OLD.is_active THEN
      INSERT INTO access_private.user_suspension_bans (user_id, previous_banned_until)
      SELECT id, banned_until FROM auth.users WHERE id = NEW.user_id
      ON CONFLICT (user_id) DO NOTHING;
      UPDATE auth.users SET banned_until = '9999-12-31 00:00:00+00'::timestamptz
      WHERE id = NEW.user_id;
    END IF;
    DELETE FROM auth.sessions WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND NOT OLD.is_active THEN
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
