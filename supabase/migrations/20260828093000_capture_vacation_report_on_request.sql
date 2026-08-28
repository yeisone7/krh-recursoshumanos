BEGIN;

ALTER TABLE public.vacation_requests
  ADD COLUMN IF NOT EXISTS report_submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_submitter_name text;

-- The operational handoff is part of the request itself. Keep the existing
-- balance-aware implementation and enrich the row atomically after creation.
CREATE OR REPLACE FUNCTION public.create_vacation_request_workflow(p_request jsonb)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_request public.vacation_requests%ROWTYPE;
  v_replacement_id uuid := NULLIF(p_request->>'replacement_employee_id', '')::uuid;
  v_requires_hiring boolean := COALESCE((p_request->>'replacement_requires_hiring')::boolean, false);
  v_pending_activities text := NULLIF(BTRIM(p_request->>'pending_activities'), '');
  v_return_date date := NULLIF(p_request->>'return_to_work_date', '')::date;
  v_replacement_company_id uuid;
  v_replacement_is_active boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.' USING ERRCODE = '42501';
  END IF;

  v_request := private.center_scope_impl_create_vacation_request_workflow(p_request);

  IF v_return_date IS NULL OR v_return_date < v_request.end_date THEN
    RAISE EXCEPTION 'La fecha de reingreso debe ser posterior o igual a la fecha final de vacaciones.' USING ERRCODE = '22023';
  END IF;

  IF NOT v_requires_hiring THEN
    IF v_replacement_id IS NULL THEN
      RAISE EXCEPTION 'Debes seleccionar el empleado que realizará el reemplazo.' USING ERRCODE = '22023';
    END IF;
    IF v_replacement_id = v_request.employee_id THEN
      RAISE EXCEPTION 'El empleado no puede ser su propio reemplazo.' USING ERRCODE = '22023';
    END IF;
    IF v_pending_activities IS NULL THEN
      RAISE EXCEPTION 'Debes detallar las actividades pendientes para el reemplazo.' USING ERRCODE = '22023';
    END IF;

    SELECT employee.company_id, employee.is_active AND employee.status = 'active'
    INTO v_replacement_company_id, v_replacement_is_active
    FROM public.employees_v2 employee
    WHERE employee.id = v_replacement_id;

    IF v_replacement_company_id IS DISTINCT FROM v_request.company_id OR v_replacement_is_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'El reemplazo seleccionado no pertenece a la empresa o no se encuentra activo.' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_replacement_id := NULL;
    v_pending_activities := NULL;
  END IF;

  PERFORM set_config('app.vacation_workflow_rpc', 'on', true);

  UPDATE public.vacation_requests
  SET
    replacement_requires_hiring = v_requires_hiring,
    replacement_employee_id = v_replacement_id,
    pending_activities = v_pending_activities,
    return_to_work_date = v_return_date,
    manager_observations = NULLIF(BTRIM(p_request->>'report_observations'), ''),
    report_submitted_by = v_user_id,
    report_submitter_name = public.vacation_approver_name(v_user_id)
  WHERE id = v_request.id
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

-- Approval only decides the request. Report fields submitted with the request
-- are authoritative and cannot be replaced through the manager decision RPC.
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
SET search_path = ''
AS $$
DECLARE
  v_request public.vacation_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.vacation_requests request
  WHERE request.id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL
    AND NOT public.can_access_absence_employee(v_request.employee_id) THEN
    RAISE EXCEPTION 'No tienes acceso al centro de operación de este empleado.' USING ERRCODE = '42501';
  END IF;

  RETURN private.center_scope_impl_decide_vacation_as_manager(
    p_request_id,
    p_approved,
    v_request.replacement_requires_hiring,
    v_request.replacement_employee_id,
    v_request.pending_activities,
    v_request.return_to_work_date,
    v_request.manager_observations
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_vacation_request_workflow(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_vacation_request_workflow(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) TO authenticated, service_role;

COMMIT;
