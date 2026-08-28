BEGIN;

-- The immediate manager reports the operational handoff, the area leader makes
-- the final approval decision, and Human Talent records a subsequent visa.
ALTER TABLE public.vacation_requests
  ADD COLUMN IF NOT EXISTS talent_leader_visa_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS talent_leader_visa_at timestamptz,
  ADD COLUMN IF NOT EXISTS talent_leader_visa_name text,
  ADD COLUMN IF NOT EXISTS talent_leader_visa_observations text;

ALTER TABLE public.vacation_requests
  DROP CONSTRAINT IF EXISTS vacation_requests_approval_stage_check,
  ADD CONSTRAINT vacation_requests_approval_stage_check
    CHECK (approval_stage IN (
      'pending_manager',
      'pending_area_leader',
      'pending_talent_leader_visa',
      'approved',
      'rejected'
    ));

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'vacaciones'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT
  'vac_visa_talent_leader',
  'Vacaciones: Visar como Líder Talento Humano',
  'ShieldCheck',
  703,
  parent_module.id,
  true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, 'approve'::public.permission_action, module.name
FROM public.modules module
WHERE module.code = 'vac_visa_talent_leader'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.user_can_read_vacation_request(
  p_company_id uuid,
  p_employee_id uuid,
  p_created_by uuid,
  p_approval_stage text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_employee_id = public.get_my_employee_id() THEN
    RETURN true;
  END IF;

  IF NOT public.can_access_absence_employee(p_employee_id) THEN
    RETURN false;
  END IF;

  IF public.is_super_admin() OR public.is_admin_or_rrhh() THEN
    RETURN true;
  END IF;

  IF NOT public.is_company_member(p_company_id) THEN
    RETURN false;
  END IF;

  IF p_approval_stage = 'pending_manager' THEN
    RETURN public.check_user_permission(v_user_id, 'vac_approve_manager', 'approve');
  END IF;

  IF p_approval_stage = 'pending_area_leader' THEN
    RETURN public.check_user_permission(v_user_id, 'vac_approve_area_leader', 'approve')
      OR public.check_user_permission(v_user_id, 'vac_approve_manager', 'approve');
  END IF;

  IF p_approval_stage = 'pending_talent_leader_visa' THEN
    RETURN public.check_user_permission(v_user_id, 'vac_visa_talent_leader', 'approve')
      OR public.check_user_permission(v_user_id, 'vac_approve_area_leader', 'approve')
      OR public.check_user_permission(v_user_id, 'vac_approve_manager', 'approve');
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.user_can_read_vacation_request(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_read_vacation_request(uuid, uuid, uuid, text) TO authenticated, service_role;

-- Keep the existing, balance-aware area leader implementation. The public
-- center-scoped wrapper changes only the workflow stage after final approval.
CREATE OR REPLACE FUNCTION public.decide_vacation_as_area_leader(
  p_request_id uuid,
  p_approved boolean,
  p_payroll_recorded_days numeric,
  p_observations text DEFAULT NULL
)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid;
  v_request public.vacation_requests%ROWTYPE;
BEGIN
  SELECT request.employee_id INTO v_employee_id
  FROM public.vacation_requests request
  WHERE request.id = p_request_id;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (v_employee_id IS NULL OR NOT public.can_access_absence_employee(v_employee_id)) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  v_request := private.center_scope_impl_decide_vacation_as_area_leader(
    p_request_id, p_approved, p_payroll_recorded_days, p_observations
  );

  IF p_approved
    AND v_request.area_leader_approved IS TRUE
    AND v_request.talent_leader_visa_at IS NULL THEN
    PERFORM set_config('app.vacation_workflow_rpc', 'on', true);
    UPDATE public.vacation_requests
    SET approval_stage = 'pending_talent_leader_visa'
    WHERE id = p_request_id
    RETURNING * INTO v_request;
  END IF;

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.visa_vacation_as_talent_leader(
  p_request_id uuid,
  p_observations text DEFAULT NULL
)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_request public.vacation_requests%ROWTYPE;
  v_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request
  FROM public.vacation_requests request
  WHERE request.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_absence_employee(v_request.employee_id) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR (
      public.is_company_member(v_request.company_id)
      AND public.check_user_permission(v_user_id, 'vac_visa_talent_leader', 'approve')
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para visar como líder de Talento Humano.' USING ERRCODE = '42501';
  END IF;

  IF v_request.talent_leader_visa_at IS NOT NULL THEN
    RETURN v_request;
  END IF;

  -- Also accepts legacy approved rows without a visa so they can be completed
  -- without rewriting historical vacation data during this migration.
  IF v_request.approval_stage NOT IN ('pending_talent_leader_visa', 'approved')
    OR v_request.area_leader_approved IS DISTINCT FROM true
    OR v_request.status NOT IN (
      'aprobado'::public.vacation_status,
      'en_curso'::public.vacation_status,
      'completado'::public.vacation_status,
      'interrumpido'::public.vacation_status
    ) THEN
    RAISE EXCEPTION 'La solicitud debe estar aprobada por el líder de área antes del visado.' USING ERRCODE = '22023';
  END IF;

  v_name := public.vacation_approver_name(v_user_id);
  PERFORM set_config('app.vacation_workflow_rpc', 'on', true);

  UPDATE public.vacation_requests
  SET
    talent_leader_visa_by = v_user_id,
    talent_leader_visa_at = now(),
    talent_leader_visa_name = v_name,
    talent_leader_visa_observations = NULLIF(BTRIM(p_observations), ''),
    approval_stage = 'approved'
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type,
    entity_id, entity_name, new_values
  ) VALUES (
    v_user_id,
    (SELECT account.email FROM auth.users account WHERE account.id = v_user_id),
    v_request.company_id,
    'talent_leader_visa',
    'vacation_request',
    v_request.id,
    v_name,
    jsonb_build_object(
      'approval_stage', v_request.approval_stage,
      'observations', p_observations
    )
  );

  RETURN v_request;
END;
$$;

-- Protect the new visa fields from direct table updates just like the existing
-- manager and area-leader decision fields.
CREATE OR REPLACE FUNCTION public.enforce_vacation_approval_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.vacation_workflow_rpc', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.approval_stage <> 'pending_manager'
      OR NEW.manager_approved IS NOT NULL
      OR NEW.area_leader_approved IS NOT NULL
      OR NEW.talent_leader_visa_at IS NOT NULL
      OR NEW.approved_by IS NOT NULL
      OR NEW.approved_at IS NOT NULL THEN
      RAISE EXCEPTION 'La solicitud debe iniciar con el reporte del jefe inmediato.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.approval_stage IS DISTINCT FROM OLD.approval_stage
    OR NEW.manager_approved IS DISTINCT FROM OLD.manager_approved
    OR NEW.manager_approved_by IS DISTINCT FROM OLD.manager_approved_by
    OR NEW.manager_approved_at IS DISTINCT FROM OLD.manager_approved_at
    OR NEW.manager_approver_name IS DISTINCT FROM OLD.manager_approver_name
    OR NEW.area_leader_approved IS DISTINCT FROM OLD.area_leader_approved
    OR NEW.area_leader_approved_by IS DISTINCT FROM OLD.area_leader_approved_by
    OR NEW.area_leader_approved_at IS DISTINCT FROM OLD.area_leader_approved_at
    OR NEW.area_leader_approver_name IS DISTINCT FROM OLD.area_leader_approver_name
    OR NEW.talent_leader_visa_by IS DISTINCT FROM OLD.talent_leader_visa_by
    OR NEW.talent_leader_visa_at IS DISTINCT FROM OLD.talent_leader_visa_at
    OR NEW.talent_leader_visa_name IS DISTINCT FROM OLD.talent_leader_visa_name
    OR NEW.talent_leader_visa_observations IS DISTINCT FROM OLD.talent_leader_visa_observations
    OR (OLD.approval_stage IN ('pending_manager', 'pending_area_leader')
      AND NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Las decisiones de vacaciones solo pueden registrarse mediante el flujo de aprobación.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.visa_vacation_as_talent_leader(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.visa_vacation_as_talent_leader(uuid, text) TO authenticated, service_role;

COMMIT;
