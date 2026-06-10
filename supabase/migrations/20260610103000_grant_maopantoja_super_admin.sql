-- Grant super-admin access to maopantoja17@gmail.com.

DO $$
DECLARE
  _target_user_id uuid;
BEGIN
  SELECT id
  INTO _target_user_id
  FROM auth.users
  WHERE lower(email) = lower('maopantoja17@gmail.com');

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email maopantoja17@gmail.com was not found';
  END IF;

  INSERT INTO public.super_admins (user_id)
  VALUES (_target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
