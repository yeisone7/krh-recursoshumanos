-- 1. Create a STABLE helper function to check if user has center assignments in the company
CREATE OR REPLACE FUNCTION public.has_company_center_assignments(p_user_id uuid, p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_center_assignments uca
    JOIN public.operation_centers oc ON oc.id = uca.operation_center_id
    WHERE uca.user_id = p_user_id 
      AND oc.company_id = p_company_id
  );
$$;

-- 2. Make check_center_access STABLE and use the optimized helper
CREATE OR REPLACE FUNCTION public.check_center_access(p_company_id uuid, p_center_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    -- 1. Super Admin siempre tiene acceso total
    IF public.is_super_admin() THEN
        RETURN true;
    END IF;

    -- 2. Si NO tiene asignaciones específicas, tiene acceso a todos los centros de la empresa (si es miembro)
    IF NOT public.has_company_center_assignments(v_user_id, p_company_id) THEN
        RETURN public.is_company_member(p_company_id);
    END IF;

    -- 3. Si TIENE asignaciones, debe estar explícitamente asignado al centro solicitado
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_center_assignments 
        WHERE user_id = v_user_id 
        AND operation_center_id = p_center_id
    );
END;
$$;

-- 3. Re-create the SELECT policy on employees_v2 to be extremely performant
DROP POLICY IF EXISTS "Users can view accessible employees v2" ON public.employees_v2;

CREATE POLICY "Users can view accessible employees v2" ON public.employees_v2
FOR SELECT
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      NOT public.has_company_center_assignments(auth.uid(), company_id)
      OR EXISTS (
        SELECT 1
        FROM public.employee_work_info ewi
        WHERE ewi.employee_id = id
          AND ewi.is_current = true
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
