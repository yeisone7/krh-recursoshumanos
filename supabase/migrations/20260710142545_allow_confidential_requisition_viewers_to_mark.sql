-- Allow users with the dedicated confidential requisitions permission to mark
-- their own/new requisitions as confidential without granting full edit access.

CREATE OR REPLACE FUNCTION public.enforce_requisition_confidentiality_permission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_confidentiality_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_confidentiality_changed := COALESCE(NEW.is_confidential, false) IS TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    v_confidentiality_changed := NEW.is_confidential IS DISTINCT FROM OLD.is_confidential;
  END IF;

  IF v_confidentiality_changed THEN
    IF v_user_id IS NULL OR NOT (
      public.is_super_admin()
      OR public.is_admin()
      OR public.check_user_permission(v_user_id, 'requisiciones', 'create')
      OR public.check_user_permission(v_user_id, 'requisiciones', 'update')
      OR public.check_user_permission(v_user_id, 'req_confidential_requisitions', 'view')
    ) THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar la confidencialidad de esta requisicion.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Admin RRHH and requesters can insert requisitions" ON public.personnel_requisitions;

CREATE POLICY "Admin RRHH and requesters can insert requisitions"
  ON public.personnel_requisitions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.check_center_access(company_id, operation_center_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
      OR (
        created_by = auth.uid()
        AND solicitante_id = auth.uid()
        AND estado_requisicion = 'borrador'
      )
    )
    AND (
      COALESCE(is_confidential, false) IS FALSE
      OR public.is_super_admin()
      OR public.is_admin()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_confidential_requisitions', 'view')
    )
  );
