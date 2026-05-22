CREATE OR REPLACE FUNCTION public.get_admin_user_emails(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT (
    public.is_super_admin()
    OR public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Not authorized to read user emails';
  END IF;

  RETURN QUERY
  SELECT u.id AS user_id, u.email::text AS email
  FROM auth.users u
  WHERE u.id = ANY(p_user_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_user_emails(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_user_emails(uuid[]) TO authenticated;
