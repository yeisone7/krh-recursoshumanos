-- Enforce operation-center scope for requisitions and keep employee center access robust.

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

    IF p_center_id IS NULL THEN
        RETURN false;
    END IF;

    IF NOT public.has_company_center_assignments(v_user_id, p_company_id) THEN
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

DROP POLICY IF EXISTS "Users can view requisitions from their company" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin and RRHH can insert requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin RRHH and requesters can insert requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin and RRHH can update requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin RRHH and requesters can update requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin can delete requisitions" ON public.personnel_requisitions;

CREATE POLICY "Users can view requisitions from their company"
  ON public.personnel_requisitions
  FOR SELECT TO authenticated
  USING (
    public.check_center_access(company_id, operation_center_id)
  );

CREATE POLICY "Admin RRHH and requesters can insert requisitions"
  ON public.personnel_requisitions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.check_center_access(company_id, operation_center_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
      OR (
        created_by = auth.uid()
        AND solicitante_id = auth.uid()
        AND estado_requisicion = 'borrador'
      )
    )
  );

CREATE POLICY "Admin RRHH and requesters can update requisitions"
  ON public.personnel_requisitions
  FOR UPDATE TO authenticated
  USING (
    public.check_center_access(company_id, operation_center_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_approve_coordinadores', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_rh', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_juridica', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_ger_op', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_ger_adm', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.check_center_access(company_id, operation_center_id)
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      OR public.check_user_permission(auth.uid(), 'req_approve_coordinadores', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_rh', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_juridica', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_ger_op', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_ger_adm', 'approve')
      OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
      OR (
        created_by = auth.uid()
        AND estado_requisicion::text IN ('borrador', 'en_coordinadores', 'en_rrhh')
      )
    )
  );

CREATE POLICY "Admin can delete requisitions"
  ON public.personnel_requisitions
  FOR DELETE TO authenticated
  USING (
    public.check_center_access(company_id, operation_center_id)
    AND (
      public.is_super_admin()
      OR public.is_admin()
      OR public.check_user_permission(auth.uid(), 'requisiciones', 'delete')
    )
  );

DROP POLICY IF EXISTS "Users can view accessible employees v2" ON public.employees_v2;

CREATE POLICY "Users can view accessible employees v2" ON public.employees_v2
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin()
  OR (
    public.is_company_member(employees_v2.company_id)
    AND EXISTS (
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
);
