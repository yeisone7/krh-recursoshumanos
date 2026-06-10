-- Mirror admin access from yeisone7@gmail.com to maopantoja17@gmail.com.

DO $$
DECLARE
  _source_user_id uuid;
  _target_user_id uuid;
BEGIN
  SELECT id
  INTO _source_user_id
  FROM auth.users
  WHERE lower(email) = lower('yeisone7@gmail.com');

  SELECT id
  INTO _target_user_id
  FROM auth.users
  WHERE lower(email) = lower('maopantoja17@gmail.com');

  IF _source_user_id IS NULL THEN
    RAISE EXCEPTION 'Source user yeisone7@gmail.com was not found';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user maopantoja17@gmail.com was not found';
  END IF;

  -- Legacy static roles.
  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  SELECT _target_user_id, role
  FROM public.user_roles
  WHERE user_id = _source_user_id
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Dynamic roles and permissions.
  DELETE FROM public.user_custom_roles
  WHERE user_id = _target_user_id;

  INSERT INTO public.user_custom_roles (user_id, role_id, assigned_by)
  SELECT _target_user_id, role_id, _source_user_id
  FROM public.user_custom_roles
  WHERE user_id = _source_user_id
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Company access.
  DELETE FROM public.user_company_assignments
  WHERE user_id = _target_user_id;

  INSERT INTO public.user_company_assignments (user_id, company_id)
  SELECT _target_user_id, company_id
  FROM public.user_company_assignments
  WHERE user_id = _source_user_id
  ON CONFLICT (user_id, company_id) DO NOTHING;

  -- Center access.
  DELETE FROM public.user_center_assignments
  WHERE user_id = _target_user_id;

  INSERT INTO public.user_center_assignments (user_id, operation_center_id)
  SELECT _target_user_id, operation_center_id
  FROM public.user_center_assignments
  WHERE user_id = _source_user_id
  ON CONFLICT (user_id, operation_center_id) DO NOTHING;

  -- Active/inactive access status.
  INSERT INTO public.user_status (
    user_id,
    is_active,
    deactivated_at,
    deactivated_by,
    deactivation_reason
  )
  SELECT
    _target_user_id,
    is_active,
    deactivated_at,
    deactivated_by,
    deactivation_reason
  FROM public.user_status
  WHERE user_id = _source_user_id
  ON CONFLICT (user_id) DO UPDATE
  SET
    is_active = EXCLUDED.is_active,
    deactivated_at = EXCLUDED.deactivated_at,
    deactivated_by = EXCLUDED.deactivated_by,
    deactivation_reason = EXCLUDED.deactivation_reason,
    updated_at = now();

  -- Super-admin status is mirrored as well. If the source is not super-admin,
  -- the target should not keep a separate super-admin grant.
  DELETE FROM public.super_admins
  WHERE user_id = _target_user_id;

  INSERT INTO public.super_admins (user_id, created_by)
  SELECT _target_user_id, _source_user_id
  FROM public.super_admins
  WHERE user_id = _source_user_id
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_maopantoja_super_admin ON auth.users;

DO $$
BEGIN
  IF to_regprocedure('app_private.grant_maopantoja_super_admin()') IS NOT NULL THEN
    EXECUTE 'DROP FUNCTION app_private.grant_maopantoja_super_admin()';
  END IF;
END;
$$;

-- Keep the super-admin check based on the mirrored super_admins table only.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admins
    WHERE user_id = auth.uid()
  )
$$;
