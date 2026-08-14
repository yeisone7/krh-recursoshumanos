BEGIN;

-- Vacation requests now follow a strict Employee -> Immediate Manager -> Area Leader flow.

ALTER TABLE public.vacation_requests
  ADD COLUMN IF NOT EXISTS request_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS enjoyment_days numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compensated_days numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_requested_days numeric(8,2)
    GENERATED ALWAYS AS (enjoyment_days + compensated_days) STORED,
  ADD COLUMN IF NOT EXISTS approval_stage text NOT NULL DEFAULT 'pending_manager',
  ADD COLUMN IF NOT EXISTS replacement_requires_hiring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS replacement_employee_id uuid REFERENCES public.employees_v2(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pending_activities text,
  ADD COLUMN IF NOT EXISTS return_to_work_date date,
  ADD COLUMN IF NOT EXISTS manager_approved boolean,
  ADD COLUMN IF NOT EXISTS manager_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_approver_name text,
  ADD COLUMN IF NOT EXISTS manager_observations text,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS accrued_days_at_request numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payroll_recorded_days numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_days_to_enjoy numeric(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_leader_approved boolean,
  ADD COLUMN IF NOT EXISTS area_leader_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_leader_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS area_leader_approver_name text,
  ADD COLUMN IF NOT EXISTS area_leader_observations text;

UPDATE public.vacation_requests
SET
  request_date = created_at::date,
  enjoyment_days = CASE WHEN request_type = 'compensacion' THEN 0 ELSE business_days END,
  compensated_days = CASE WHEN request_type = 'compensacion' THEN business_days ELSE 0 END,
  approval_stage = CASE
    WHEN status IN ('aprobado', 'en_curso', 'completado', 'interrumpido') THEN 'approved'
    WHEN status = 'cancelado' THEN 'rejected'
    ELSE 'pending_manager'
  END,
  manager_approved = CASE WHEN status IN ('aprobado', 'en_curso', 'completado', 'interrumpido') THEN true ELSE manager_approved END,
  manager_approved_by = CASE WHEN status IN ('aprobado', 'en_curso', 'completado', 'interrumpido') THEN approved_by ELSE manager_approved_by END,
  manager_approved_at = CASE WHEN status IN ('aprobado', 'en_curso', 'completado', 'interrumpido') THEN approved_at ELSE manager_approved_at END,
  area_leader_approved = CASE WHEN status IN ('aprobado', 'en_curso', 'completado', 'interrumpido') THEN true ELSE area_leader_approved END,
  area_leader_approved_by = CASE WHEN status IN ('aprobado', 'en_curso', 'completado', 'interrumpido') THEN approved_by ELSE area_leader_approved_by END,
  area_leader_approved_at = CASE WHEN status IN ('aprobado', 'en_curso', 'completado', 'interrumpido') THEN approved_at ELSE area_leader_approved_at END
WHERE enjoyment_days = 0
  AND compensated_days = 0;

ALTER TABLE public.vacation_requests
  DROP CONSTRAINT IF EXISTS vacation_requests_approval_stage_check,
  ADD CONSTRAINT vacation_requests_approval_stage_check
    CHECK (approval_stage IN ('pending_manager', 'pending_area_leader', 'approved', 'rejected')),
  DROP CONSTRAINT IF EXISTS vacation_requests_requested_days_check,
  ADD CONSTRAINT vacation_requests_requested_days_check
    CHECK (enjoyment_days >= 0 AND compensated_days >= 0 AND enjoyment_days + compensated_days > 0),
  DROP CONSTRAINT IF EXISTS vacation_requests_return_date_check,
  ADD CONSTRAINT vacation_requests_return_date_check
    CHECK (return_to_work_date IS NULL OR return_to_work_date > end_date);

CREATE INDEX IF NOT EXISTS idx_vacation_requests_approval_queue
  ON public.vacation_requests (company_id, approval_stage, created_at DESC);

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'vacaciones'
), modules_to_add(code, name, icon, sort_order) AS (
  VALUES
    ('vac_approve_manager', 'Vacaciones: Aprobar como Jefe Inmediato', 'UserCheck', 701),
    ('vac_approve_area_leader', 'Vacaciones: Aprobar como Lider de Area', 'BadgeCheck', 702)
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
WHERE module.code IN ('vac_approve_manager', 'vac_approve_area_leader')
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.custom_roles role
CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true
  AND module.code IN ('vac_approve_manager', 'vac_approve_area_leader')
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.vacation_approver_name(p_user_id uuid)
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

REVOKE ALL ON FUNCTION public.vacation_approver_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vacation_approver_name(uuid) TO authenticated, service_role;

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
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin() OR public.is_admin_or_rrhh() THEN
    RETURN true;
  END IF;

  IF NOT public.is_company_member(p_company_id) THEN
    RETURN false;
  END IF;

  IF p_employee_id = public.get_my_employee_id() OR p_created_by = v_user_id THEN
    RETURN true;
  END IF;

  IF p_approval_stage = 'pending_manager' THEN
    RETURN public.check_user_permission(v_user_id, 'vac_approve_manager', 'approve');
  END IF;

  IF p_approval_stage = 'pending_area_leader' THEN
    RETURN public.check_user_permission(v_user_id, 'vac_approve_area_leader', 'approve')
      OR public.check_user_permission(v_user_id, 'vac_approve_manager', 'approve');
  END IF;

  -- Preserve the historical company-wide visibility once the approval queue is closed.
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.user_can_read_vacation_request(uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_read_vacation_request(uuid, uuid, uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admin and RRHH can manage vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Employees can create own vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Employees can view own vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Users can view company vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Vacation requests follow approval visibility" ON public.vacation_requests;
DROP POLICY IF EXISTS "Authorized users can create vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Authorized users can update vacation lifecycle" ON public.vacation_requests;
DROP POLICY IF EXISTS "Authorized users can delete vacation requests" ON public.vacation_requests;

CREATE POLICY "Vacation requests follow approval visibility"
  ON public.vacation_requests FOR SELECT TO authenticated
  USING (public.user_can_read_vacation_request(company_id, employee_id, created_by, approval_stage));

CREATE POLICY "Authorized users can create vacation requests"
  ON public.vacation_requests FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.get_my_employee_id()
    OR public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'create')
      )
    )
  );

CREATE POLICY "Authorized users can update vacation lifecycle"
  ON public.vacation_requests FOR UPDATE TO authenticated
  USING (
    public.user_can_read_vacation_request(company_id, employee_id, created_by, approval_stage)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'vacaciones', 'update')
    )
  )
  WITH CHECK (public.is_company_member(company_id) OR public.is_super_admin());

CREATE POLICY "Authorized users can delete vacation requests"
  ON public.vacation_requests FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'delete')
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vacation_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_vacation_approval_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.vacation_workflow_rpc', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.approval_stage <> 'pending_manager'
      OR NEW.manager_approved IS NOT NULL
      OR NEW.area_leader_approved IS NOT NULL
      OR NEW.approved_by IS NOT NULL
      OR NEW.approved_at IS NOT NULL THEN
      RAISE EXCEPTION 'La solicitud debe iniciar en aprobacion del jefe inmediato.' USING ERRCODE = '42501';
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
    OR (OLD.approval_stage IN ('pending_manager', 'pending_area_leader') AND NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Las decisiones de vacaciones solo pueden registrarse mediante el flujo de aprobacion.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_vacation_approval_integrity ON public.vacation_requests;
CREATE TRIGGER enforce_vacation_approval_integrity
  BEFORE INSERT OR UPDATE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vacation_approval_integrity();

CREATE OR REPLACE FUNCTION public.create_vacation_request_workflow(p_request jsonb)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_employee public.employees_v2%ROWTYPE;
  v_request public.vacation_requests%ROWTYPE;
  v_start_date date := (p_request->>'start_date')::date;
  v_end_date date := (p_request->>'end_date')::date;
  v_enjoyment numeric(8,2) := COALESCE((p_request->>'enjoyment_days')::numeric, 0);
  v_compensated numeric(8,2) := COALESCE((p_request->>'compensated_days')::numeric, 0);
  v_accrued numeric(8,2);
  v_contract_start date;
  v_balance_id uuid;
  v_cycle_id uuid;
  v_request_type public.vacation_request_type;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesion.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_employee
  FROM public.employees_v2
  WHERE id = (p_request->>'employee_id')::uuid
  FOR SHARE;

  IF NOT FOUND OR NOT v_employee.is_active OR v_employee.status <> 'active' THEN
    RAISE EXCEPTION 'El empleado no existe o no se encuentra activo.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    v_employee.id = public.get_my_employee_id()
    OR public.is_super_admin()
    OR (
      public.is_company_member(v_employee.company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(v_user_id, 'vacaciones', 'create')
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para crear esta solicitud.' USING ERRCODE = '42501';
  END IF;

  IF v_start_date IS NULL OR v_end_date IS NULL OR v_end_date < v_start_date THEN
    RAISE EXCEPTION 'Las fechas de disfrute no son validas.' USING ERRCODE = '22023';
  END IF;

  IF v_enjoyment < 0 OR v_compensated < 0 OR v_enjoyment + v_compensated <= 0 THEN
    RAISE EXCEPTION 'El total de dias solicitados debe ser mayor que cero.' USING ERRCODE = '22023';
  END IF;

  SELECT cycle.id, cycle.start_date
  INTO v_cycle_id, v_contract_start
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = v_employee.id
    AND cycle.company_id = v_employee.company_id
    AND cycle.status = 'active'
  ORDER BY cycle.start_date DESC
  LIMIT 1;

  SELECT contract.start_date
  INTO v_contract_start
  FROM public.contracts contract
  WHERE contract.employee_id = v_employee.id
    AND contract.company_id = v_employee.company_id
    AND COALESCE(contract.is_terminated, false) = false
    AND (v_cycle_id IS NULL OR contract.employment_cycle_id = v_cycle_id)
  ORDER BY contract.start_date DESC
  LIMIT 1;

  IF v_contract_start IS NULL THEN
    SELECT work_info.hire_date INTO v_contract_start
    FROM public.employee_work_info work_info
    WHERE work_info.employee_id = v_employee.id
      AND work_info.company_id = v_employee.company_id
      AND work_info.is_current = true
      AND (v_cycle_id IS NULL OR work_info.employment_cycle_id = v_cycle_id)
    ORDER BY work_info.valid_from DESC
    LIMIT 1;
  END IF;

  SELECT
    COALESCE(SUM(GREATEST(COALESCE(balance.days_pending,
      balance.days_accrued - balance.days_taken - balance.days_compensated), 0)), 0),
    (ARRAY_AGG(balance.id ORDER BY balance.period_start)
      FILTER (WHERE COALESCE(balance.days_pending,
        balance.days_accrued - balance.days_taken - balance.days_compensated) > 0))[1]
  INTO v_accrued, v_balance_id
  FROM public.vacation_balances balance
  WHERE balance.employee_id = v_employee.id
    AND balance.company_id = v_employee.company_id
    AND (v_cycle_id IS NULL OR balance.employment_cycle_id = v_cycle_id OR balance.employment_cycle_id IS NULL);

  IF v_enjoyment + v_compensated > v_accrued THEN
    RAISE EXCEPTION 'Los dias solicitados (%) exceden el saldo disponible (%).', v_enjoyment + v_compensated, v_accrued
      USING ERRCODE = '22023';
  END IF;

  v_request_type := CASE WHEN v_enjoyment = 0 AND v_compensated > 0
    THEN 'compensacion'::public.vacation_request_type
    ELSE 'disfrute'::public.vacation_request_type END;

  PERFORM set_config('app.vacation_workflow_rpc', 'on', true);

  INSERT INTO public.vacation_requests (
    employee_id, company_id, balance_id, request_type, status,
    request_date, start_date, end_date, business_days, calendar_days,
    enjoyment_days, compensated_days, approval_stage, contract_start_date,
    accrued_days_at_request, pending_days_to_enjoy, notes, created_by
  ) VALUES (
    v_employee.id, v_employee.company_id, v_balance_id, v_request_type, 'borrador',
    CURRENT_DATE, v_start_date, v_end_date, v_enjoyment, (v_end_date - v_start_date) + 1,
    v_enjoyment, v_compensated, 'pending_manager', v_contract_start,
    v_accrued, GREATEST(v_accrued - v_enjoyment - v_compensated, 0),
    NULLIF(BTRIM(p_request->>'notes'), ''), v_user_id
  ) RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    v_user_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    v_employee.company_id,
    'create', 'vacation_request', v_request.id,
    CONCAT(v_employee.first_name, ' ', v_employee.last_name),
    jsonb_build_object(
      'approval_stage', v_request.approval_stage,
      'enjoyment_days', v_enjoyment,
      'compensated_days', v_compensated,
      'start_date', v_start_date,
      'end_date', v_end_date
    )
  );

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_vacation_as_manager(
  p_request_id uuid,
  p_approved boolean,
  p_replacement_requires_hiring boolean,
  p_replacement_employee_id uuid,
  p_pending_activities text,
  p_return_to_work_date date,
  p_observations text DEFAULT NULL
)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.vacation_requests%ROWTYPE;
  v_replacement public.employees_v2%ROWTYPE;
  v_name text;
BEGIN
  SELECT * INTO v_request FROM public.vacation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002'; END IF;

  IF NOT (
    public.is_super_admin() OR public.is_admin_or_rrhh()
    OR (public.is_company_member(v_request.company_id)
      AND public.check_user_permission(v_user_id, 'vac_approve_manager', 'approve'))
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para aprobar como jefe inmediato.' USING ERRCODE = '42501';
  END IF;

  IF v_request.approval_stage <> 'pending_manager' THEN
    IF v_request.manager_approved IS NOT DISTINCT FROM p_approved THEN RETURN v_request; END IF;
    RAISE EXCEPTION 'La solicitud ya no esta pendiente del jefe inmediato.' USING ERRCODE = '22023';
  END IF;

  IF p_approved AND (p_return_to_work_date IS NULL OR p_return_to_work_date <= v_request.end_date) THEN
    RAISE EXCEPTION 'La fecha de reingreso debe ser posterior al final de las vacaciones.' USING ERRCODE = '22023';
  END IF;

  IF p_approved AND NOT COALESCE(p_replacement_requires_hiring, false) THEN
    IF p_replacement_employee_id IS NULL THEN
      RAISE EXCEPTION 'Selecciona el empleado que realizara el reemplazo.' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_replacement FROM public.employees_v2 WHERE id = p_replacement_employee_id;
    IF NOT FOUND OR v_replacement.company_id <> v_request.company_id
      OR NOT v_replacement.is_active OR v_replacement.status <> 'active'
      OR v_replacement.id = v_request.employee_id THEN
      RAISE EXCEPTION 'El reemplazo seleccionado no es valido.' USING ERRCODE = '22023';
    END IF;
    IF NULLIF(BTRIM(p_pending_activities), '') IS NULL THEN
      RAISE EXCEPTION 'Registra las actividades pendientes para el reemplazo.' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_name := public.vacation_approver_name(v_user_id);
  PERFORM set_config('app.vacation_workflow_rpc', 'on', true);

  UPDATE public.vacation_requests SET
    replacement_requires_hiring = COALESCE(p_replacement_requires_hiring, false),
    replacement_employee_id = CASE WHEN COALESCE(p_replacement_requires_hiring, false) THEN NULL ELSE p_replacement_employee_id END,
    pending_activities = CASE WHEN COALESCE(p_replacement_requires_hiring, false) THEN NULL ELSE NULLIF(BTRIM(p_pending_activities), '') END,
    return_to_work_date = p_return_to_work_date,
    manager_approved = p_approved,
    manager_approved_by = v_user_id,
    manager_approved_at = now(),
    manager_approver_name = v_name,
    manager_observations = NULLIF(BTRIM(p_observations), ''),
    approval_stage = CASE WHEN p_approved THEN 'pending_area_leader' ELSE 'rejected' END,
    status = CASE WHEN p_approved THEN 'borrador'::public.vacation_status ELSE 'cancelado'::public.vacation_status END
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values)
  VALUES (
    v_user_id, (SELECT email FROM auth.users WHERE id = v_user_id), v_request.company_id,
    CASE WHEN p_approved THEN 'manager_approve' ELSE 'manager_reject' END,
    'vacation_request', v_request.id, v_name,
    jsonb_build_object(
      'approved', p_approved,
      'replacement_requires_hiring', p_replacement_requires_hiring,
      'replacement_employee_id', p_replacement_employee_id,
      'return_to_work_date', p_return_to_work_date,
      'observations', p_observations
    )
  );

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_vacation_as_area_leader(
  p_request_id uuid,
  p_approved boolean,
  p_payroll_recorded_days numeric,
  p_observations text DEFAULT NULL
)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.vacation_requests%ROWTYPE;
  v_name text;
  v_remaining numeric(8,2);
  v_available numeric(8,2);
  v_allocate numeric(8,2);
  v_balance record;
BEGIN
  SELECT * INTO v_request FROM public.vacation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002'; END IF;

  IF NOT (
    public.is_super_admin() OR public.is_admin_or_rrhh()
    OR (public.is_company_member(v_request.company_id)
      AND public.check_user_permission(v_user_id, 'vac_approve_area_leader', 'approve'))
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para aprobar como lider de area.' USING ERRCODE = '42501';
  END IF;

  IF v_request.approval_stage <> 'pending_area_leader' OR v_request.manager_approved IS DISTINCT FROM true THEN
    IF v_request.area_leader_approved IS NOT DISTINCT FROM p_approved THEN RETURN v_request; END IF;
    RAISE EXCEPTION 'La solicitud aun no ha sido aprobada por el jefe inmediato.' USING ERRCODE = '22023';
  END IF;

  IF p_payroll_recorded_days IS NULL OR p_payroll_recorded_days < 0 THEN
    RAISE EXCEPTION 'Los dias grabados en nomina deben ser cero o mayores.' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.vacation_balances balance
  WHERE balance.employee_id = v_request.employee_id AND balance.company_id = v_request.company_id
  FOR UPDATE;

  SELECT COALESCE(SUM(GREATEST(COALESCE(balance.days_pending,
    balance.days_accrued - balance.days_taken - balance.days_compensated), 0)), 0)
  INTO v_available
  FROM public.vacation_balances balance
  WHERE balance.employee_id = v_request.employee_id AND balance.company_id = v_request.company_id;

  IF p_approved AND v_request.total_requested_days > v_available THEN
    RAISE EXCEPTION 'El saldo actual (%) ya no cubre los dias solicitados (%).', v_available, v_request.total_requested_days
      USING ERRCODE = '22023';
  END IF;

  IF p_approved THEN
    v_remaining := v_request.enjoyment_days;
    FOR v_balance IN
      SELECT balance.id,
        GREATEST(COALESCE(balance.days_pending,
          balance.days_accrued - balance.days_taken - balance.days_compensated), 0) AS available
      FROM public.vacation_balances balance
      WHERE balance.employee_id = v_request.employee_id AND balance.company_id = v_request.company_id
      ORDER BY balance.period_start
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_allocate := LEAST(v_remaining, v_balance.available);
      IF v_allocate > 0 THEN
        UPDATE public.vacation_balances SET
          days_taken = days_taken + v_allocate
        WHERE id = v_balance.id;
        v_remaining := v_remaining - v_allocate;
      END IF;
    END LOOP;

    v_remaining := v_request.compensated_days;
    FOR v_balance IN
      SELECT balance.id,
        GREATEST(COALESCE(balance.days_pending,
          balance.days_accrued - balance.days_taken - balance.days_compensated), 0) AS available
      FROM public.vacation_balances balance
      WHERE balance.employee_id = v_request.employee_id AND balance.company_id = v_request.company_id
      ORDER BY balance.period_start
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_allocate := LEAST(v_remaining, v_balance.available);
      IF v_allocate > 0 THEN
        UPDATE public.vacation_balances SET
          days_compensated = days_compensated + v_allocate
        WHERE id = v_balance.id;
        v_remaining := v_remaining - v_allocate;
      END IF;
    END LOOP;
  END IF;

  v_name := public.vacation_approver_name(v_user_id);
  PERFORM set_config('app.vacation_workflow_rpc', 'on', true);

  UPDATE public.vacation_requests SET
    payroll_recorded_days = p_payroll_recorded_days,
    pending_days_to_enjoy = GREATEST(accrued_days_at_request - total_requested_days, 0),
    area_leader_approved = p_approved,
    area_leader_approved_by = v_user_id,
    area_leader_approved_at = now(),
    area_leader_approver_name = v_name,
    area_leader_observations = NULLIF(BTRIM(p_observations), ''),
    approval_stage = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    status = CASE WHEN p_approved THEN 'aprobado'::public.vacation_status ELSE 'cancelado'::public.vacation_status END,
    approved_by = CASE WHEN p_approved THEN v_user_id ELSE NULL END,
    approved_at = CASE WHEN p_approved THEN now() ELSE NULL END
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values)
  VALUES (
    v_user_id, (SELECT email FROM auth.users WHERE id = v_user_id), v_request.company_id,
    CASE WHEN p_approved THEN 'area_leader_approve' ELSE 'area_leader_reject' END,
    'vacation_request', v_request.id, v_name,
    jsonb_build_object(
      'approved', p_approved,
      'payroll_recorded_days', p_payroll_recorded_days,
      'pending_days_to_enjoy', v_request.pending_days_to_enjoy,
      'observations', p_observations
    )
  );

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.create_vacation_request_workflow(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vacation_request_workflow(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vacation_request_workflow(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) TO service_role;

COMMENT ON COLUMN public.vacation_requests.approval_stage IS
  'Strict workflow: pending_manager -> pending_area_leader -> approved/rejected.';

COMMIT;
