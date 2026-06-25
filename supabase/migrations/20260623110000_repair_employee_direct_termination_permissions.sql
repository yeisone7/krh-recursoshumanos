-- Repair offboarding permissions for non-admin users that initiate employee
-- termination directly from the Employees module.

BEGIN;

DROP POLICY IF EXISTS "Admin and RRHH can manage terminations" ON public.employee_terminations;
DROP POLICY IF EXISTS "Users can view company terminations" ON public.employee_terminations;
DROP POLICY IF EXISTS "Admin and RRHH can manage termination documents" ON public.termination_documents;
DROP POLICY IF EXISTS "Users can view termination documents" ON public.termination_documents;
DROP POLICY IF EXISTS "Contract managers can update employee termination status" ON public.employees_v2;
DROP POLICY IF EXISTS "Contract managers can update termination work info" ON public.employee_work_info;
DROP POLICY IF EXISTS "Employee managers can mark contracts terminated" ON public.contracts;

CREATE POLICY "Admin and RRHH can manage terminations"
ON public.employee_terminations
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'contratos', 'update')
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
      OR public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
  )
);

CREATE POLICY "Users can view company terminations"
ON public.employee_terminations
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin()
  OR public.is_company_member(company_id)
);

CREATE POLICY "Admin and RRHH can manage termination documents"
ON public.termination_documents
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
    AND EXISTS (
      SELECT 1
      FROM public.employee_terminations et
      WHERE et.id = termination_documents.termination_id
        AND et.company_id = termination_documents.company_id
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
    AND EXISTS (
      SELECT 1
      FROM public.employee_terminations et
      WHERE et.id = termination_documents.termination_id
        AND et.company_id = termination_documents.company_id
    )
  )
);

CREATE POLICY "Users can view termination documents"
ON public.termination_documents
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin()
  OR public.is_company_member(company_id)
);

CREATE POLICY "Contract managers can update employee termination status"
ON public.employees_v2
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
    AND status IN ('en_retiro', 'retired')
    AND (status <> 'retired' OR is_active = false)
  )
);

CREATE POLICY "Contract managers can update termination work info"
ON public.employee_work_info
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
    AND termination_date IS NOT NULL
  )
);

CREATE POLICY "Employee managers can mark contracts terminated"
ON public.contracts
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'empleados', 'update')
    )
    AND is_terminated = true
    AND termination_date IS NOT NULL
  )
);

COMMIT;
