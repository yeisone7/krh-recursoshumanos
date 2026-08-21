-- Allow custom contract roles to complete the full offboarding flow.
-- The UI treats employee retirement as a contract operation, so RLS must allow
-- users with contratos.update to write the termination records and the limited
-- employee status/work-info changes made by that flow.

BEGIN;

ALTER TYPE public.termination_type ADD VALUE IF NOT EXISTS 'traslado';

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
  OR public.is_company_member(company_id)
  OR public.is_admin()
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
  OR public.is_company_member(company_id)
  OR public.is_admin()
);

-- employees_v2.status is introduced later by
-- 20260619101500_add_employee_status_to_employees_v2.sql. The matching
-- termination policy is created immediately afterwards by
-- 20260619102000_allow_contract_managers_employee_termination_status_v2.sql.

CREATE POLICY "Contract managers can update termination work info"
ON public.employee_work_info
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'contratos', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'contratos', 'update')
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
    AND public.check_user_permission(auth.uid(), 'empleados', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'empleados', 'update')
    AND is_terminated = true
    AND termination_date IS NOT NULL
  )
);

COMMIT;
