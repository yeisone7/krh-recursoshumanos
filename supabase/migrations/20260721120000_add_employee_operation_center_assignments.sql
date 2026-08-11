-- An employee may belong to multiple operation centers while employee_work_info
-- remains the source of truth for the employee's primary center.
CREATE TABLE public.employee_operation_center_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_operation_center_assignments_unique UNIQUE (employee_id, operation_center_id)
);

CREATE INDEX employee_operation_center_assignments_employee_idx
  ON public.employee_operation_center_assignments (employee_id);
CREATE INDEX employee_operation_center_assignments_company_center_idx
  ON public.employee_operation_center_assignments (company_id, operation_center_id);

CREATE OR REPLACE FUNCTION public.validate_employee_operation_center_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.employees_v2 employee
    JOIN public.operation_centers center ON center.id = NEW.operation_center_id
    WHERE employee.id = NEW.employee_id
      AND employee.company_id = NEW.company_id
      AND center.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'El empleado y el centro de operación deben pertenecer a la misma empresa';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_employee_operation_center_assignment_trigger
BEFORE INSERT OR UPDATE ON public.employee_operation_center_assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_employee_operation_center_assignment();

-- Preserve every current primary-center assignment before the application starts
-- synchronizing primary and additional centers through this table.
INSERT INTO public.employee_operation_center_assignments (
  employee_id, company_id, operation_center_id, created_by
)
SELECT work_info.employee_id, employee.company_id, work_info.operation_center_id, work_info.created_by
FROM public.employee_work_info work_info
JOIN public.employees_v2 employee ON employee.id = work_info.employee_id
JOIN public.operation_centers center ON center.id = work_info.operation_center_id
WHERE work_info.is_current = true
  AND center.company_id = employee.company_id
ON CONFLICT (employee_id, operation_center_id) DO NOTHING;

ALTER TABLE public.employee_operation_center_assignments ENABLE ROW LEVEL SECURITY;

-- Detail-table policies rely on this helper, so it must use the same
-- multi-center visibility rule as employees_v2.
CREATE OR REPLACE FUNCTION public.has_employee_v2_access(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees_v2 employee
    WHERE employee.id = _employee_id
      AND (
        public.is_super_admin()
        OR public.is_admin()
        OR (
          public.is_company_member(employee.company_id)
          AND (
            NOT public.has_company_center_assignments(auth.uid(), employee.company_id)
            OR EXISTS (
              SELECT 1
              FROM public.employee_operation_center_assignments assignment
              JOIN public.user_center_assignments user_assignment
                ON user_assignment.operation_center_id = assignment.operation_center_id
              WHERE assignment.employee_id = employee.id
                AND assignment.company_id = employee.company_id
                AND user_assignment.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

CREATE POLICY "Users can view accessible employee center assignments"
ON public.employee_operation_center_assignments
FOR SELECT TO authenticated
USING (public.has_employee_v2_access(employee_id));

CREATE POLICY "Employee managers can manage employee center assignments"
ON public.employee_operation_center_assignments
FOR ALL TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'empleados', 'create')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'empleados', 'create')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
  )
);

-- Users scoped to specific centers can see an employee assigned to any one of
-- their centers. Users with no explicit center assignment retain company scope.
DROP POLICY IF EXISTS "Users can view accessible employees v2" ON public.employees_v2;

CREATE POLICY "Users can view accessible employees v2" ON public.employees_v2
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin()
  OR (
    public.is_company_member(employees_v2.company_id)
    AND (
      NOT public.has_company_center_assignments(auth.uid(), employees_v2.company_id)
      OR EXISTS (
        SELECT 1
        FROM public.employee_operation_center_assignments assignment
        JOIN public.user_center_assignments user_assignment
          ON user_assignment.operation_center_id = assignment.operation_center_id
        WHERE assignment.employee_id = employees_v2.id
          AND assignment.company_id = employees_v2.company_id
          AND user_assignment.user_id = auth.uid()
      )
    )
  )
);
