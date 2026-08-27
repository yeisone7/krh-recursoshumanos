BEGIN;

-- Vacaciones and Permisos are employee-scoped modules. Reuse the canonical
-- employee visibility rule so primary and additional operation centers are
-- both honored. As in SuperAdmin > Usuarios, no explicit center assignments
-- means full company scope. Employee self-service always keeps access to the
-- linked employee's own records.
CREATE OR REPLACE FUNCTION public.can_access_absence_employee(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees_v2 employee
    WHERE employee.id = p_employee_id
      AND (SELECT auth.uid()) IS NOT NULL
      AND (
        employee.id = public.get_my_employee_id()
        OR public.is_super_admin()
        OR (
          public.is_company_member(employee.company_id)
          AND (
            NOT public.has_company_center_assignments((SELECT auth.uid()), employee.company_id)
            OR EXISTS (
              SELECT 1
              FROM public.employee_work_info work_info
              JOIN public.employee_employment_cycles cycle
                ON cycle.id = work_info.employment_cycle_id
               AND cycle.status = 'active'
              JOIN public.user_center_assignments user_assignment
                ON user_assignment.operation_center_id = work_info.operation_center_id
              WHERE work_info.employee_id = employee.id
                AND work_info.company_id = employee.company_id
                AND work_info.is_current
                AND user_assignment.user_id = (SELECT auth.uid())
            )
            OR EXISTS (
              SELECT 1
              FROM public.employee_operation_center_assignments assignment
              JOIN public.employee_employment_cycles cycle
                ON cycle.id = assignment.employment_cycle_id
               AND cycle.status = 'active'
              JOIN public.user_center_assignments user_assignment
                ON user_assignment.operation_center_id = assignment.operation_center_id
              WHERE assignment.employee_id = employee.id
                AND assignment.company_id = employee.company_id
                AND user_assignment.user_id = (SELECT auth.uid())
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_absence_employee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_absence_employee(uuid) TO authenticated, service_role;

-- Keep privileged workflow functions from bypassing center scope. Calls made
-- by trusted database jobs have no auth.uid() and continue to work.
CREATE OR REPLACE FUNCTION private.enforce_absence_employee_center_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.employee_id ELSE NEW.employee_id END;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
    AND NOT public.can_access_absence_employee(v_employee_id) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.'
      USING ERRCODE = '42501';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_absence_employee_center_scope() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_vacation_request_center_scope ON public.vacation_requests;
CREATE TRIGGER enforce_vacation_request_center_scope
BEFORE INSERT OR UPDATE OR DELETE ON public.vacation_requests
FOR EACH ROW EXECUTE FUNCTION private.enforce_absence_employee_center_scope();

DROP TRIGGER IF EXISTS enforce_vacation_balance_center_scope ON public.vacation_balances;
CREATE TRIGGER enforce_vacation_balance_center_scope
BEFORE INSERT OR UPDATE OR DELETE ON public.vacation_balances
FOR EACH ROW EXECUTE FUNCTION private.enforce_absence_employee_center_scope();

DROP TRIGGER IF EXISTS enforce_leave_request_center_scope ON public.leave_requests;
CREATE TRIGGER enforce_leave_request_center_scope
BEFORE INSERT OR UPDATE OR DELETE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION private.enforce_absence_employee_center_scope();

DROP TRIGGER IF EXISTS enforce_leave_balance_center_scope ON public.leave_balances;
CREATE TRIGGER enforce_leave_balance_center_scope
BEFORE INSERT OR UPDATE OR DELETE ON public.leave_balances
FOR EACH ROW EXECUTE FUNCTION private.enforce_absence_employee_center_scope();

-- Approval visibility remains stage-aware, but company-wide access is now
-- narrowed to employees in the user's permitted operation centers.
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

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.user_can_read_vacation_request(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_read_vacation_request(uuid, uuid, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_can_read_leave_request(
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
    RETURN public.check_user_permission(v_user_id, 'leave_approve_manager', 'approve');
  END IF;

  IF p_approval_stage = 'pending_area_leader' THEN
    RETURN public.check_user_permission(v_user_id, 'leave_approve_area_leader', 'approve')
      OR public.check_user_permission(v_user_id, 'leave_approve_manager', 'approve');
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.user_can_read_leave_request(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_read_leave_request(uuid, uuid, uuid, text) TO authenticated, service_role;

-- Explicit grants are required on projects using the newer Data API defaults.
-- RLS below still decides which rows each authenticated user may touch.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.vacation_balances,
  public.vacation_requests,
  public.leave_balances,
  public.leave_requests
TO authenticated;

-- Remove every earlier permissive policy before installing operation-specific
-- policies. PostgreSQL combines policies with OR, so leaving one behind would
-- silently preserve company-wide visibility.
DROP POLICY IF EXISTS "Admin and RRHH can manage vacation balances" ON public.vacation_balances;
DROP POLICY IF EXISTS "Users can view company vacation balances" ON public.vacation_balances;

CREATE POLICY "Center-scoped users can view vacation balances"
ON public.vacation_balances FOR SELECT TO authenticated
USING (public.can_access_absence_employee(employee_id));

CREATE POLICY "Center-scoped users can create vacation balances"
ON public.vacation_balances FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'create')
  )
);

CREATE POLICY "Center-scoped users can update vacation balances"
ON public.vacation_balances FOR UPDATE TO authenticated
USING (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'update')
  )
)
WITH CHECK (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'update')
  )
);

CREATE POLICY "Center-scoped users can delete vacation balances"
ON public.vacation_balances FOR DELETE TO authenticated
USING (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'delete')
  )
);

DROP POLICY IF EXISTS "Vacation requests follow approval visibility" ON public.vacation_requests;
DROP POLICY IF EXISTS "Authorized users can create vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Authorized users can update vacation lifecycle" ON public.vacation_requests;
DROP POLICY IF EXISTS "Authorized users can delete vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Admin and RRHH can manage vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Employees can create own vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Employees can view own vacation requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Users can view company vacation requests" ON public.vacation_requests;

CREATE POLICY "Center-scoped vacation request visibility"
ON public.vacation_requests FOR SELECT TO authenticated
USING (public.user_can_read_vacation_request(company_id, employee_id, created_by, approval_stage));

CREATE POLICY "Center-scoped users can create vacation requests"
ON public.vacation_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = public.get_my_employee_id()
  OR (
    public.can_access_absence_employee(employee_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'create')
    )
  )
);

CREATE POLICY "Center-scoped users can update vacation requests"
ON public.vacation_requests FOR UPDATE TO authenticated
USING (
  public.user_can_read_vacation_request(company_id, employee_id, created_by, approval_stage)
  AND public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'update')
  )
)
WITH CHECK (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'update')
  )
);

CREATE POLICY "Center-scoped users can delete vacation requests"
ON public.vacation_requests FOR DELETE TO authenticated
USING (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'delete')
  )
);

DROP POLICY IF EXISTS "Admin and RRHH can manage leave balances" ON public.leave_balances;
DROP POLICY IF EXISTS "Users can view company leave balances" ON public.leave_balances;

CREATE POLICY "Center-scoped users can view leave balances"
ON public.leave_balances FOR SELECT TO authenticated
USING (public.can_access_absence_employee(employee_id));

CREATE POLICY "Center-scoped users can create leave balances"
ON public.leave_balances FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'create')
  )
);

CREATE POLICY "Center-scoped users can update leave balances"
ON public.leave_balances FOR UPDATE TO authenticated
USING (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'update')
  )
)
WITH CHECK (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'update')
  )
);

CREATE POLICY "Center-scoped users can delete leave balances"
ON public.leave_balances FOR DELETE TO authenticated
USING (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'delete')
  )
);

DROP POLICY IF EXISTS "Admin and RRHH can manage leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can view company leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can create own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Center-scoped leave request visibility" ON public.leave_requests;
DROP POLICY IF EXISTS "Center-scoped users can create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Center-scoped users can update leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Center-scoped users can delete leave requests" ON public.leave_requests;

CREATE POLICY "Center-scoped leave request visibility"
ON public.leave_requests FOR SELECT TO authenticated
USING (public.user_can_read_leave_request(company_id, employee_id, created_by, approval_stage));

CREATE POLICY "Center-scoped users can create leave requests"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = public.get_my_employee_id()
  OR (
    public.can_access_absence_employee(employee_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'create')
    )
  )
);

CREATE POLICY "Center-scoped users can update leave requests"
ON public.leave_requests FOR UPDATE TO authenticated
USING (
  public.user_can_read_leave_request(company_id, employee_id, created_by, approval_stage)
  AND public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'update')
  )
)
WITH CHECK (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'update')
  )
);

CREATE POLICY "Center-scoped users can delete leave requests"
ON public.leave_requests FOR DELETE TO authenticated
USING (
  public.can_access_absence_employee(employee_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR public.check_user_permission((SELECT auth.uid()), 'permisos', 'delete')
  )
);

DROP POLICY IF EXISTS "Members can view vacation balance movements" ON public.vacation_balance_movements;
CREATE POLICY "Center-scoped users can view vacation balance movements"
ON public.vacation_balance_movements FOR SELECT TO authenticated
USING (
  employee_id = public.get_my_employee_id()
  OR (
    public.can_access_absence_employee(employee_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission((SELECT auth.uid()), 'vacation_balances', 'view')
      OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Members can view vacation allocations" ON public.vacation_request_allocations;
CREATE POLICY "Center-scoped users can view vacation allocations"
ON public.vacation_request_allocations FOR SELECT TO authenticated
USING (
  employee_id = public.get_my_employee_id()
  OR (
    public.can_access_absence_employee(employee_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission((SELECT auth.uid()), 'vacation_balances', 'view')
      OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'view')
    )
  )
);

-- Move the existing SECURITY DEFINER implementations out of the exposed
-- schema. Public wrappers perform the center check before delegating.
ALTER FUNCTION public.sync_employee_vacation_balances(uuid, date)
  RENAME TO center_scope_impl_sync_employee_vacation_balances;
ALTER FUNCTION public.center_scope_impl_sync_employee_vacation_balances(uuid, date)
  SET SCHEMA private;

CREATE FUNCTION public.sync_employee_vacation_balances(
  p_employee_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
    AND NOT public.can_access_absence_employee(p_employee_id) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_sync_employee_vacation_balances(p_employee_id, p_as_of_date);
END;
$$;

ALTER FUNCTION public.sync_company_vacation_balances(uuid, date)
  RENAME TO center_scope_impl_sync_company_vacation_balances;
ALTER FUNCTION public.center_scope_impl_sync_company_vacation_balances(uuid, date)
  SET SCHEMA private;

CREATE FUNCTION public.sync_company_vacation_balances(
  p_company_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_employee record;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN private.center_scope_impl_sync_company_vacation_balances(p_company_id, p_as_of_date);
  END IF;

  IF NOT (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR (
      public.is_company_member(p_company_id)
      AND (
        public.check_user_permission(v_user_id, 'vacation_balances', 'view')
        OR public.check_user_permission(v_user_id, 'vacaciones', 'view')
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para recalcular saldos.' USING ERRCODE = '42501';
  END IF;

  FOR v_employee IN
    SELECT employee.id
    FROM public.employees_v2 employee
    WHERE employee.company_id = p_company_id
      AND employee.is_active
      AND employee.status = 'active'
      AND public.can_access_absence_employee(employee.id)
    ORDER BY employee.id
  LOOP
    PERFORM private.sync_employee_vacation_balances(v_employee.id, p_as_of_date);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'company_id', p_company_id,
    'employees_synced', v_count,
    'as_of_date', p_as_of_date
  );
END;
$$;

ALTER FUNCTION public.adjust_vacation_balance(uuid, numeric, text, date, uuid)
  RENAME TO center_scope_impl_adjust_vacation_balance;
ALTER FUNCTION public.center_scope_impl_adjust_vacation_balance(uuid, numeric, text, date, uuid)
  SET SCHEMA private;

CREATE FUNCTION public.adjust_vacation_balance(
  p_employee_id uuid,
  p_days numeric,
  p_reason text,
  p_effective_date date DEFAULT CURRENT_DATE,
  p_idempotency_key uuid DEFAULT gen_random_uuid()
)
RETURNS public.vacation_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
    AND NOT public.can_access_absence_employee(p_employee_id) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_adjust_vacation_balance(
    p_employee_id, p_days, p_reason, p_effective_date, p_idempotency_key
  );
END;
$$;

ALTER FUNCTION public.create_vacation_request_workflow(jsonb)
  RENAME TO center_scope_impl_create_vacation_request_workflow;
ALTER FUNCTION public.center_scope_impl_create_vacation_request_workflow(jsonb)
  SET SCHEMA private;

CREATE FUNCTION public.create_vacation_request_workflow(p_request jsonb)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid := (p_request->>'employee_id')::uuid;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
    AND NOT public.can_access_absence_employee(v_employee_id) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_create_vacation_request_workflow(p_request);
END;
$$;

ALTER FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text)
  RENAME TO center_scope_impl_decide_vacation_as_manager;
ALTER FUNCTION public.center_scope_impl_decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text)
  SET SCHEMA private;

CREATE FUNCTION public.decide_vacation_as_manager(
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
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT request.employee_id INTO v_employee_id
  FROM public.vacation_requests request
  WHERE request.id = p_request_id;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (v_employee_id IS NULL OR NOT public.can_access_absence_employee(v_employee_id)) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_decide_vacation_as_manager(
    p_request_id, p_approved, p_replacement_requires_hiring,
    p_replacement_employee_id, p_pending_activities, p_return_to_work_date, p_observations
  );
END;
$$;

ALTER FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text)
  RENAME TO center_scope_impl_decide_vacation_as_area_leader;
ALTER FUNCTION public.center_scope_impl_decide_vacation_as_area_leader(uuid, boolean, numeric, text)
  SET SCHEMA private;

CREATE FUNCTION public.decide_vacation_as_area_leader(
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
BEGIN
  SELECT request.employee_id INTO v_employee_id
  FROM public.vacation_requests request
  WHERE request.id = p_request_id;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (v_employee_id IS NULL OR NOT public.can_access_absence_employee(v_employee_id)) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_decide_vacation_as_area_leader(
    p_request_id, p_approved, p_payroll_recorded_days, p_observations
  );
END;
$$;

ALTER FUNCTION public.decide_leave_as_manager(uuid, boolean, text, text)
  RENAME TO center_scope_impl_decide_leave_as_manager;
ALTER FUNCTION public.center_scope_impl_decide_leave_as_manager(uuid, boolean, text, text)
  SET SCHEMA private;

CREATE FUNCTION public.decide_leave_as_manager(
  p_request_id uuid,
  p_approved boolean,
  p_observations text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT request.employee_id INTO v_employee_id
  FROM public.leave_requests request
  WHERE request.id = p_request_id;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (v_employee_id IS NULL OR NOT public.can_access_absence_employee(v_employee_id)) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_decide_leave_as_manager(
    p_request_id, p_approved, p_observations, p_rejection_reason
  );
END;
$$;

ALTER FUNCTION public.decide_leave_as_area_leader(uuid, boolean, text, text)
  RENAME TO center_scope_impl_decide_leave_as_area_leader;
ALTER FUNCTION public.center_scope_impl_decide_leave_as_area_leader(uuid, boolean, text, text)
  SET SCHEMA private;

CREATE FUNCTION public.decide_leave_as_area_leader(
  p_request_id uuid,
  p_approved boolean,
  p_observations text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT request.employee_id INTO v_employee_id
  FROM public.leave_requests request
  WHERE request.id = p_request_id;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (v_employee_id IS NULL OR NOT public.can_access_absence_employee(v_employee_id)) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_decide_leave_as_area_leader(
    p_request_id, p_approved, p_observations, p_rejection_reason
  );
END;
$$;

ALTER FUNCTION public.cancel_leave_request_workflow(uuid, text)
  RENAME TO center_scope_impl_cancel_leave_request_workflow;
ALTER FUNCTION public.center_scope_impl_cancel_leave_request_workflow(uuid, text)
  SET SCHEMA private;

CREATE FUNCTION public.cancel_leave_request_workflow(
  p_request_id uuid,
  p_reason text
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT request.employee_id INTO v_employee_id
  FROM public.leave_requests request
  WHERE request.id = p_request_id;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (v_employee_id IS NULL OR NOT public.can_access_absence_employee(v_employee_id)) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_cancel_leave_request_workflow(p_request_id, p_reason);
END;
$$;

REVOKE ALL ON FUNCTION private.center_scope_impl_sync_employee_vacation_balances(uuid, date) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.center_scope_impl_sync_company_vacation_balances(uuid, date) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.center_scope_impl_adjust_vacation_balance(uuid, numeric, text, date, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.center_scope_impl_create_vacation_request_workflow(jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.center_scope_impl_decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.center_scope_impl_decide_vacation_as_area_leader(uuid, boolean, numeric, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.center_scope_impl_decide_leave_as_manager(uuid, boolean, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.center_scope_impl_decide_leave_as_area_leader(uuid, boolean, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.center_scope_impl_cancel_leave_request_workflow(uuid, text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_employee_vacation_balances(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_company_vacation_balances(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adjust_vacation_balance(uuid, numeric, text, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_vacation_request_workflow(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_leave_as_manager(uuid, boolean, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_leave_as_area_leader(uuid, boolean, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_leave_request_workflow(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sync_employee_vacation_balances(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_company_vacation_balances(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_vacation_balance(uuid, numeric, text, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_vacation_request_workflow(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_leave_as_manager(uuid, boolean, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_leave_as_area_leader(uuid, boolean, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_leave_request_workflow(uuid, text) TO authenticated, service_role;

COMMIT;
