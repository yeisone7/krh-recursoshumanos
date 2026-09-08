-- The attendance RLS policy must be able to resolve the caller's employee link
-- without requiring direct SELECT access to employee_user_links.
CREATE OR REPLACE FUNCTION public.time_clock_is_self(_employee_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employee_user_links link
    WHERE link.employee_id = _employee_id
      AND link.user_id = (SELECT auth.uid())
      AND link.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.time_clock_self_can_access_point(_company_id uuid, _operation_center_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_user_links link
    JOIN public.employees_v2 employee ON employee.id = link.employee_id
    WHERE link.user_id = (SELECT auth.uid())
      AND link.is_active
      AND employee.company_id = _company_id
      AND (
        EXISTS (
          SELECT 1 FROM public.employee_work_info work_info
          WHERE work_info.employee_id = employee.id
            AND work_info.is_current
            AND work_info.operation_center_id = _operation_center_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.employee_operation_center_assignments assignment
          JOIN public.employee_employment_cycles cycle
            ON cycle.id = assignment.employment_cycle_id AND cycle.status = 'active'
          WHERE assignment.employee_id = employee.id
            AND assignment.operation_center_id = _operation_center_id
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.time_clock_self_can_access_point(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.time_clock_self_can_access_point(uuid, uuid) TO authenticated;

DROP POLICY "Time clock points are visible in scope" ON public.time_clock_points;
CREATE POLICY "Time clock points are visible in scope" ON public.time_clock_points
FOR SELECT TO authenticated USING (
  (public.time_clock_can(company_id, 'view') AND public.check_center_access(company_id, operation_center_id))
  OR public.time_clock_self_can_access_point(company_id, operation_center_id)
);
