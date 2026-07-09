-- Add row-level confidentiality to personnel requisitions.

ALTER TABLE public.personnel_requisitions
  ADD COLUMN IF NOT EXISTS is_confidential boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.personnel_requisitions.is_confidential
IS 'Restricts requisition visibility to the requester/creator, admins, confidential viewers, and active-step approvers.';

CREATE INDEX IF NOT EXISTS idx_personnel_requisitions_confidential_access
  ON public.personnel_requisitions (company_id, operation_center_id, is_confidential, estado_requisicion);

CREATE INDEX IF NOT EXISTS idx_personnel_requisitions_created_by
  ON public.personnel_requisitions (created_by);

CREATE INDEX IF NOT EXISTS idx_personnel_requisitions_solicitante
  ON public.personnel_requisitions (solicitante_id);

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'requisiciones'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT 'req_confidential_requisitions', 'Requisiciones: Confidenciales', 'Lock', 191, parent_module.id, true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, 'view'::public.permission_action, 'Requisiciones confidenciales - Ver'
FROM public.modules m
WHERE m.code = 'req_confidential_requisitions'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.user_can_read_requisition(
  p_company_id uuid,
  p_operation_center_id uuid,
  p_is_confidential boolean,
  p_created_by uuid,
  p_solicitante_id uuid,
  p_estado_requisicion text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.check_center_access(p_company_id, p_operation_center_id) THEN
    RETURN false;
  END IF;

  IF COALESCE(p_is_confidential, false) IS FALSE THEN
    RETURN true;
  END IF;

  IF public.is_super_admin() OR public.is_admin() THEN
    RETURN true;
  END IF;

  IF p_created_by = v_user_id OR p_solicitante_id = v_user_id THEN
    RETURN true;
  END IF;

  IF public.check_user_permission(v_user_id, 'req_confidential_requisitions', 'view') THEN
    RETURN true;
  END IF;

  RETURN CASE p_estado_requisicion
    WHEN 'en_coordinadores' THEN public.check_user_permission(v_user_id, 'req_approve_coordinadores', 'approve')
    WHEN 'en_rrhh' THEN public.check_user_permission(v_user_id, 'req_approve_rh', 'approve')
    WHEN 'en_juridico' THEN public.check_user_permission(v_user_id, 'req_approve_juridica', 'approve')
    WHEN 'en_operaciones' THEN public.check_user_permission(v_user_id, 'req_approve_ger_op', 'approve')
    WHEN 'en_gerencia' THEN public.check_user_permission(v_user_id, 'req_approve_ger_adm', 'approve')
    WHEN 'en_seleccion' THEN public.check_user_permission(v_user_id, 'req_approve_seleccion', 'approve')
    ELSE false
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_read_requisition(p_requisition_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.personnel_requisitions pr
    WHERE pr.id = p_requisition_id
      AND public.user_can_read_requisition(
        pr.company_id,
        pr.operation_center_id,
        pr.is_confidential,
        pr.created_by,
        pr.solicitante_id,
        pr.estado_requisicion::text
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_read_requisition(uuid, uuid, boolean, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_read_requisition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_read_requisition(uuid, uuid, boolean, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_read_requisition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_read_requisition(uuid, uuid, boolean, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_can_read_requisition(uuid) TO service_role;

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
    ) THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar la confidencialidad de esta requisicion.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_requisition_confidentiality_permission ON public.personnel_requisitions;

CREATE TRIGGER enforce_requisition_confidentiality_permission
  BEFORE INSERT OR UPDATE ON public.personnel_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_requisition_confidentiality_permission();

DROP POLICY IF EXISTS "Users can view requisitions from their company" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin and RRHH can insert requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin RRHH and requesters can insert requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin and RRHH can update requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin RRHH and requesters can update requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin can delete requisitions" ON public.personnel_requisitions;

CREATE POLICY "Users can view requisitions from their company"
  ON public.personnel_requisitions
  FOR SELECT TO authenticated
  USING (
    public.user_can_read_requisition(
      company_id,
      operation_center_id,
      is_confidential,
      created_by,
      solicitante_id,
      estado_requisicion::text
    )
  );

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
    )
  );

CREATE POLICY "Admin RRHH and requesters can update requisitions"
  ON public.personnel_requisitions
  FOR UPDATE TO authenticated
  USING (
    public.check_center_access(company_id, operation_center_id)
    AND (
      COALESCE(is_confidential, false) IS FALSE
      OR public.user_can_read_requisition(
        company_id,
        operation_center_id,
        is_confidential,
        created_by,
        solicitante_id,
        estado_requisicion::text
      )
    )
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_approve_coordinadores', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_rh', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_juridica', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_ger_op', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_ger_adm', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.check_center_access(company_id, operation_center_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_approve_coordinadores', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_rh', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_juridica', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_ger_op', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_ger_adm', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
      OR (
        created_by = auth.uid()
        AND estado_requisicion::text IN ('borrador', 'en_coordinadores', 'en_rrhh')
      )
    )
  );

CREATE POLICY "Admin can delete requisitions"
  ON public.personnel_requisitions
  FOR DELETE TO authenticated
  USING (
    public.check_center_access(company_id, operation_center_id)
    AND (
      COALESCE(is_confidential, false) IS FALSE
      OR public.user_can_read_requisition(
        company_id,
        operation_center_id,
        is_confidential,
        created_by,
        solicitante_id,
        estado_requisicion::text
      )
    )
    AND (
      public.is_super_admin()
      OR public.is_admin()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'delete')
    )
  );

DROP POLICY IF EXISTS "Company members can view vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can insert vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can update vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can delete vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can view vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can insert vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can delete vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can view vacancy codes from their requisitions" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Admin and RRHH can manage vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can manage vacancy codes" ON public.requisition_vacancy_codes;

CREATE POLICY "Users can view accessible vacancy codes"
  ON public.requisition_vacancy_codes
  FOR SELECT TO authenticated
  USING (
    public.user_can_read_requisition(requisition_id)
  );

CREATE POLICY "Authorized users can insert vacancy codes"
  ON public.requisition_vacancy_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_read_requisition(requisition_id)
    AND EXISTS (
      SELECT 1
      FROM public.personnel_requisitions pr
      WHERE pr.id = requisition_id
        AND pr.company_id = requisition_vacancy_codes.company_id
    )
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
    )
  );

CREATE POLICY "Authorized users can update vacancy codes"
  ON public.requisition_vacancy_codes
  FOR UPDATE TO authenticated
  USING (
    public.user_can_read_requisition(requisition_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
    )
  )
  WITH CHECK (
    public.user_can_read_requisition(requisition_id)
    AND EXISTS (
      SELECT 1
      FROM public.personnel_requisitions pr
      WHERE pr.id = requisition_id
        AND pr.company_id = requisition_vacancy_codes.company_id
    )
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
    )
  );

CREATE POLICY "Authorized users can delete vacancy codes"
  ON public.requisition_vacancy_codes
  FOR DELETE TO authenticated
  USING (
    public.user_can_read_requisition(requisition_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
    )
  );
