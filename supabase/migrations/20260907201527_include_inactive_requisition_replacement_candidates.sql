CREATE OR REPLACE FUNCTION private.get_requisition_replacement_candidates(
  p_company_id uuid,
  p_operation_center_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  is_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR (
      public.is_company_member(p_company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission((SELECT auth.uid()), 'requisiciones', 'view')
        OR public.check_user_permission((SELECT auth.uid()), 'requisiciones', 'create')
        OR public.check_user_permission((SELECT auth.uid()), 'requisiciones', 'update')
      )
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient requisition permissions' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH effective_employees AS (
    SELECT
      employee.*,
      effective_cycle.id AS effective_cycle_id
    FROM public.employees_v2 employee
    LEFT JOIN LATERAL (
      SELECT cycle.id
      FROM public.employee_employment_cycles cycle
      WHERE cycle.employee_id = employee.id
        AND cycle.company_id = employee.company_id
      ORDER BY
        (cycle.status = 'active') DESC,
        cycle.start_date DESC,
        cycle.cycle_number DESC,
        cycle.id DESC
      LIMIT 1
    ) effective_cycle ON true
    WHERE employee.company_id = p_company_id
  )
  SELECT
    employee.id,
    employee.first_name::text,
    employee.last_name::text,
    employee.is_active
  FROM effective_employees employee
  WHERE (
      p_operation_center_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = employee.id
          AND work_info.company_id = employee.company_id
          AND work_info.operation_center_id = p_operation_center_id
          AND work_info.employment_cycle_id IS NOT DISTINCT FROM employee.effective_cycle_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.employee_operation_center_assignments assignment
        WHERE assignment.employee_id = employee.id
          AND assignment.company_id = employee.company_id
          AND assignment.operation_center_id = p_operation_center_id
          AND assignment.employment_cycle_id IS NOT DISTINCT FROM employee.effective_cycle_id
      )
    )
    AND (
      public.is_super_admin()
      OR public.is_admin()
      OR NOT public.has_company_center_assignments((SELECT auth.uid()), p_company_id)
      OR EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        JOIN public.user_center_assignments user_assignment
          ON user_assignment.operation_center_id = work_info.operation_center_id
         AND user_assignment.user_id = (SELECT auth.uid())
        WHERE work_info.employee_id = employee.id
          AND work_info.company_id = employee.company_id
          AND work_info.employment_cycle_id IS NOT DISTINCT FROM employee.effective_cycle_id
          AND (
            p_operation_center_id IS NULL
            OR work_info.operation_center_id = p_operation_center_id
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.employee_operation_center_assignments assignment
        JOIN public.user_center_assignments user_assignment
          ON user_assignment.operation_center_id = assignment.operation_center_id
         AND user_assignment.user_id = (SELECT auth.uid())
        WHERE assignment.employee_id = employee.id
          AND assignment.company_id = employee.company_id
          AND assignment.employment_cycle_id IS NOT DISTINCT FROM employee.effective_cycle_id
          AND (
            p_operation_center_id IS NULL
            OR assignment.operation_center_id = p_operation_center_id
          )
      )
    )
  ORDER BY employee.last_name, employee.first_name, employee.id;
END;
$$;

REVOKE ALL ON FUNCTION private.get_requisition_replacement_candidates(uuid, uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_requisition_replacement_candidates(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_requisition_replacement_candidates(
  p_company_id uuid,
  p_operation_center_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM private.get_requisition_replacement_candidates(p_company_id, p_operation_center_id);
$$;

REVOKE ALL ON FUNCTION public.get_requisition_replacement_candidates(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_requisition_replacement_candidates(uuid, uuid) TO authenticated;
