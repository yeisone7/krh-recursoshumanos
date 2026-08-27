BEGIN;

-- Permisos follows the same strict approval path as Vacaciones:
-- Employee -> Immediate Manager -> Area Leader.

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS approval_stage text NOT NULL DEFAULT 'pending_manager',
  ADD COLUMN IF NOT EXISTS manager_approved boolean,
  ADD COLUMN IF NOT EXISTS manager_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_approver_name text,
  ADD COLUMN IF NOT EXISTS manager_observations text,
  ADD COLUMN IF NOT EXISTS area_leader_approved boolean,
  ADD COLUMN IF NOT EXISTS area_leader_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_leader_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS area_leader_approver_name text,
  ADD COLUMN IF NOT EXISTS area_leader_observations text;

-- Preserve the meaning of historical records. A legacy final reviewer is used for
-- both completed stages because the previous model stored only one decision.
UPDATE public.leave_requests
SET
  approval_stage = CASE
    WHEN status = 'aprobado' THEN 'approved'
    WHEN status = 'rechazado' THEN 'rejected'
    WHEN status = 'cancelado' AND reviewed_at IS NOT NULL THEN 'approved'
    WHEN status = 'cancelado' THEN 'rejected'
    ELSE 'pending_manager'
  END,
  manager_approved = CASE
    WHEN status = 'aprobado' OR (status = 'cancelado' AND reviewed_at IS NOT NULL) THEN true
    WHEN status = 'rechazado' THEN false
    ELSE NULL
  END,
  manager_approved_by = CASE
    WHEN status IN ('aprobado', 'rechazado') OR (status = 'cancelado' AND reviewed_at IS NOT NULL)
      THEN reviewed_by
    ELSE NULL
  END,
  manager_approved_at = CASE
    WHEN status IN ('aprobado', 'rechazado') OR (status = 'cancelado' AND reviewed_at IS NOT NULL)
      THEN reviewed_at
    ELSE NULL
  END,
  manager_approver_name = CASE
    WHEN status IN ('aprobado', 'rechazado') OR (status = 'cancelado' AND reviewed_at IS NOT NULL)
      THEN reviewer_name
    ELSE NULL
  END,
  manager_observations = CASE
    WHEN status IN ('aprobado', 'rechazado') OR (status = 'cancelado' AND reviewed_at IS NOT NULL)
      THEN review_notes
    ELSE NULL
  END,
  area_leader_approved = CASE
    WHEN status = 'aprobado' OR (status = 'cancelado' AND reviewed_at IS NOT NULL) THEN true
    ELSE NULL
  END,
  area_leader_approved_by = CASE
    WHEN status = 'aprobado' OR (status = 'cancelado' AND reviewed_at IS NOT NULL) THEN reviewed_by
    ELSE NULL
  END,
  area_leader_approved_at = CASE
    WHEN status = 'aprobado' OR (status = 'cancelado' AND reviewed_at IS NOT NULL) THEN reviewed_at
    ELSE NULL
  END,
  area_leader_approver_name = CASE
    WHEN status = 'aprobado' OR (status = 'cancelado' AND reviewed_at IS NOT NULL) THEN reviewer_name
    ELSE NULL
  END,
  area_leader_observations = CASE
    WHEN status = 'aprobado' OR (status = 'cancelado' AND reviewed_at IS NOT NULL) THEN review_notes
    ELSE NULL
  END;

ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_approval_stage_check,
  ADD CONSTRAINT leave_requests_approval_stage_check
    CHECK (approval_stage IN ('pending_manager', 'pending_area_leader', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_leave_requests_approval_queue
  ON public.leave_requests (company_id, approval_stage, requested_at DESC);

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'permisos'
), modules_to_add(code, name, icon, sort_order) AS (
  VALUES
    ('leave_approve_manager', 'Permisos: Aprobar como Jefe Inmediato', 'UserCheck', 801),
    ('leave_approve_area_leader', 'Permisos: Aprobar como Lider de Area', 'BadgeCheck', 802)
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT item.code, item.name, item.icon, item.sort_order, parent_module.id, true
FROM modules_to_add item
CROSS JOIN parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, 'approve'::public.permission_action, module.name
FROM public.modules module
WHERE module.code IN ('leave_approve_manager', 'leave_approve_area_leader')
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.custom_roles role
CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true
  AND module.code IN ('leave_approve_manager', 'leave_approve_area_leader')
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.leave_approver_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    NULLIF(profile.full_name, ''),
    NULLIF(profile.display_name, ''),
    NULLIF(account.email, ''),
    'Usuario sin nombre'
  )
  FROM auth.users account
  LEFT JOIN public.user_profiles profile ON profile.id = account.id
  WHERE account.id = p_user_id
$$;

REVOKE ALL ON FUNCTION private.leave_approver_name(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.protect_leave_approval_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.leave_workflow_rpc', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pendiente'
      OR NEW.approval_stage <> 'pending_manager'
      OR NEW.manager_approved IS NOT NULL
      OR NEW.manager_approved_by IS NOT NULL
      OR NEW.manager_approved_at IS NOT NULL
      OR NEW.area_leader_approved IS NOT NULL
      OR NEW.area_leader_approved_by IS NOT NULL
      OR NEW.area_leader_approved_at IS NOT NULL
      OR NEW.reviewed_at IS NOT NULL
      OR NEW.reviewed_by IS NOT NULL
      OR NEW.cancelled_at IS NOT NULL
      OR NEW.cancelled_by IS NOT NULL THEN
      RAISE EXCEPTION 'Toda solicitud de permiso debe iniciar pendiente del jefe inmediato.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.approval_stage IS DISTINCT FROM OLD.approval_stage
    OR NEW.manager_approved IS DISTINCT FROM OLD.manager_approved
    OR NEW.manager_approved_by IS DISTINCT FROM OLD.manager_approved_by
    OR NEW.manager_approved_at IS DISTINCT FROM OLD.manager_approved_at
    OR NEW.manager_approver_name IS DISTINCT FROM OLD.manager_approver_name
    OR NEW.manager_observations IS DISTINCT FROM OLD.manager_observations
    OR NEW.area_leader_approved IS DISTINCT FROM OLD.area_leader_approved
    OR NEW.area_leader_approved_by IS DISTINCT FROM OLD.area_leader_approved_by
    OR NEW.area_leader_approved_at IS DISTINCT FROM OLD.area_leader_approved_at
    OR NEW.area_leader_approver_name IS DISTINCT FROM OLD.area_leader_approver_name
    OR NEW.area_leader_observations IS DISTINCT FROM OLD.area_leader_observations
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
    OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
    OR NEW.reviewer_name IS DISTINCT FROM OLD.reviewer_name
    OR NEW.review_notes IS DISTINCT FROM OLD.review_notes
    OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
    OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
    OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason THEN
    RAISE EXCEPTION 'Las decisiones del flujo de permisos solo pueden realizarse desde las acciones autorizadas.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_leave_approval_workflow ON public.leave_requests;
CREATE TRIGGER protect_leave_approval_workflow
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_leave_approval_workflow();

CREATE OR REPLACE FUNCTION public.decide_leave_as_manager(
  p_request_id uuid,
  p_approved boolean,
  p_observations text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.leave_requests%ROWTYPE;
  v_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesion.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request
  FROM public.leave_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR (
      public.is_company_member(v_request.company_id)
      AND public.check_user_permission(v_user_id, 'leave_approve_manager', 'approve')
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para aprobar como jefe inmediato.' USING ERRCODE = '42501';
  END IF;

  IF v_request.approval_stage <> 'pending_manager' OR v_request.status <> 'pendiente' THEN
    IF v_request.manager_approved IS NOT DISTINCT FROM p_approved THEN
      RETURN v_request;
    END IF;
    RAISE EXCEPTION 'La solicitud ya no esta pendiente del jefe inmediato.' USING ERRCODE = '22023';
  END IF;

  IF NOT p_approved AND NULLIF(BTRIM(p_rejection_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Indica el motivo del rechazo.' USING ERRCODE = '22023';
  END IF;

  v_name := private.leave_approver_name(v_user_id);
  PERFORM set_config('app.leave_workflow_rpc', 'on', true);

  IF NOT p_approved THEN
    UPDATE public.leave_balances
    SET pending_days = GREATEST(0, pending_days - v_request.total_days)
    WHERE company_id = v_request.company_id
      AND employee_id = v_request.employee_id
      AND leave_type = v_request.leave_type
      AND year = EXTRACT(YEAR FROM v_request.start_date)::integer;
  END IF;

  UPDATE public.leave_requests
  SET
    manager_approved = p_approved,
    manager_approved_by = v_user_id,
    manager_approved_at = now(),
    manager_approver_name = v_name,
    manager_observations = NULLIF(BTRIM(p_observations), ''),
    approval_stage = CASE WHEN p_approved THEN 'pending_area_leader' ELSE 'rejected' END,
    status = CASE
      WHEN p_approved THEN 'pendiente'::public.leave_request_status
      ELSE 'rechazado'::public.leave_request_status
    END,
    reviewed_at = CASE WHEN p_approved THEN NULL ELSE now() END,
    reviewed_by = CASE WHEN p_approved THEN NULL ELSE v_user_id END,
    reviewer_name = CASE WHEN p_approved THEN NULL ELSE v_name END,
    review_notes = CASE WHEN p_approved THEN NULL ELSE NULLIF(BTRIM(p_observations), '') END,
    rejection_reason = CASE WHEN p_approved THEN NULL ELSE NULLIF(BTRIM(p_rejection_reason), '') END
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    v_user_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    v_request.company_id,
    CASE WHEN p_approved THEN 'manager_approve' ELSE 'manager_reject' END,
    'leave_request', v_request.id, v_name,
    jsonb_build_object('approved', p_approved, 'observations', p_observations, 'reason', p_rejection_reason)
  );

  PERFORM set_config('app.leave_workflow_rpc', 'off', true);
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_leave_as_area_leader(
  p_request_id uuid,
  p_approved boolean,
  p_observations text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.leave_requests%ROWTYPE;
  v_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesion.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request
  FROM public.leave_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR (
      public.is_company_member(v_request.company_id)
      AND public.check_user_permission(v_user_id, 'leave_approve_area_leader', 'approve')
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para aprobar como lider de area.' USING ERRCODE = '42501';
  END IF;

  IF v_request.approval_stage <> 'pending_area_leader'
    OR v_request.manager_approved IS DISTINCT FROM true
    OR v_request.status <> 'pendiente' THEN
    IF v_request.area_leader_approved IS NOT DISTINCT FROM p_approved THEN
      RETURN v_request;
    END IF;
    RAISE EXCEPTION 'La solicitud aun no ha sido aprobada por el jefe inmediato.' USING ERRCODE = '22023';
  END IF;

  IF NOT p_approved AND NULLIF(BTRIM(p_rejection_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Indica el motivo del rechazo.' USING ERRCODE = '22023';
  END IF;

  v_name := private.leave_approver_name(v_user_id);
  PERFORM set_config('app.leave_workflow_rpc', 'on', true);

  UPDATE public.leave_balances
  SET
    pending_days = GREATEST(0, pending_days - v_request.total_days),
    used_days = used_days + CASE WHEN p_approved THEN v_request.total_days ELSE 0 END
  WHERE company_id = v_request.company_id
    AND employee_id = v_request.employee_id
    AND leave_type = v_request.leave_type
    AND year = EXTRACT(YEAR FROM v_request.start_date)::integer;

  UPDATE public.leave_requests
  SET
    area_leader_approved = p_approved,
    area_leader_approved_by = v_user_id,
    area_leader_approved_at = now(),
    area_leader_approver_name = v_name,
    area_leader_observations = NULLIF(BTRIM(p_observations), ''),
    approval_stage = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    status = CASE
      WHEN p_approved THEN 'aprobado'::public.leave_request_status
      ELSE 'rechazado'::public.leave_request_status
    END,
    reviewed_at = now(),
    reviewed_by = v_user_id,
    reviewer_name = v_name,
    review_notes = NULLIF(BTRIM(p_observations), ''),
    rejection_reason = CASE WHEN p_approved THEN NULL ELSE NULLIF(BTRIM(p_rejection_reason), '') END
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    v_user_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    v_request.company_id,
    CASE WHEN p_approved THEN 'area_leader_approve' ELSE 'area_leader_reject' END,
    'leave_request', v_request.id, v_name,
    jsonb_build_object('approved', p_approved, 'observations', p_observations, 'reason', p_rejection_reason)
  );

  PERFORM set_config('app.leave_workflow_rpc', 'off', true);
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_leave_request_workflow(
  p_request_id uuid,
  p_reason text
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.leave_requests%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesion.' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Indica el motivo de la cancelacion.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.leave_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR (
      public.is_company_member(v_request.company_id)
      AND public.check_user_permission(v_user_id, 'permisos', 'update')
    )
    OR v_request.created_by = v_user_id
    OR v_request.employee_id = public.get_my_employee_id()
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para cancelar esta solicitud.' USING ERRCODE = '42501';
  END IF;

  IF v_request.status = 'cancelado' THEN
    RETURN v_request;
  END IF;

  IF v_request.status NOT IN ('pendiente', 'aprobado') THEN
    RAISE EXCEPTION 'La solicitud ya no se puede cancelar.' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.leave_workflow_rpc', 'on', true);

  UPDATE public.leave_balances
  SET
    pending_days = GREATEST(0, pending_days - CASE WHEN v_request.status = 'pendiente' THEN v_request.total_days ELSE 0 END),
    used_days = GREATEST(0, used_days - CASE WHEN v_request.status = 'aprobado' THEN v_request.total_days ELSE 0 END)
  WHERE company_id = v_request.company_id
    AND employee_id = v_request.employee_id
    AND leave_type = v_request.leave_type
    AND year = EXTRACT(YEAR FROM v_request.start_date)::integer;

  UPDATE public.leave_requests
  SET
    status = 'cancelado'::public.leave_request_status,
    approval_stage = CASE WHEN v_request.status = 'aprobado' THEN approval_stage ELSE 'rejected' END,
    cancelled_at = now(),
    cancelled_by = v_user_id,
    cancellation_reason = NULLIF(BTRIM(p_reason), '')
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    v_user_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    v_request.company_id,
    'cancel', 'leave_request', v_request.id, 'Solicitud de permiso',
    jsonb_build_object('reason', p_reason)
  );

  PERFORM set_config('app.leave_workflow_rpc', 'off', true);
  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_leave_as_manager(uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_leave_as_area_leader(uuid, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_leave_request_workflow(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.decide_leave_as_manager(uuid, boolean, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_leave_as_area_leader(uuid, boolean, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_leave_request_workflow(uuid, text) TO authenticated, service_role;

COMMENT ON COLUMN public.leave_requests.approval_stage IS
  'Strict workflow: pending_manager -> pending_area_leader -> approved/rejected.';

COMMIT;
