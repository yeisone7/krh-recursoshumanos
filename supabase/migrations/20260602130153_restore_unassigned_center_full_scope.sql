-- Restore the intended center scope rule:
-- users with explicit center assignments are limited to those centers;
-- users without center assignments keep full company scope.

CREATE OR REPLACE FUNCTION public.check_center_access(p_company_id uuid, p_center_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    IF public.is_super_admin() OR public.is_admin() THEN
        RETURN true;
    END IF;

    IF NOT public.has_company_center_assignments(v_user_id, p_company_id) THEN
        RETURN public.is_company_member(p_company_id);
    END IF;

    IF p_center_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.user_center_assignments uca
        JOIN public.operation_centers oc ON oc.id = uca.operation_center_id
        WHERE uca.user_id = v_user_id
          AND uca.operation_center_id = p_center_id
          AND oc.company_id = p_company_id
    );
END;
$$;

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
        FROM public.employee_work_info ewi
        JOIN public.operation_centers oc ON oc.id = ewi.operation_center_id
        WHERE ewi.employee_id = employees_v2.id
          AND ewi.is_current = true
          AND oc.company_id = employees_v2.company_id
          AND EXISTS (
            SELECT 1
            FROM public.user_center_assignments uca
            WHERE uca.user_id = auth.uid()
              AND uca.operation_center_id = ewi.operation_center_id
          )
      )
    )
  )
);
