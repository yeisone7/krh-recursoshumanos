-- Allow non-admin users with selection update permission to complete the hiring flow.
-- The frontend converts a selected candidate into employee-related records from the
-- selection module, so RLS must allow these initial INSERT operations.

DROP POLICY IF EXISTS "Selection update can hire employees" ON public.employees_v2;
CREATE POLICY "Selection update can hire employees"
ON public.employees_v2
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.is_psicologo()
      OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Selection update can create hired employee contact" ON public.employee_contact;
CREATE POLICY "Selection update can create hired employee contact"
ON public.employee_contact
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.is_psicologo()
      OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Selection update can create hired employee family" ON public.employee_family_members;
CREATE POLICY "Selection update can create hired employee family"
ON public.employee_family_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.is_psicologo()
      OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Selection update can create hired employee work info" ON public.employee_work_info;
CREATE POLICY "Selection update can create hired employee work info"
ON public.employee_work_info
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.is_psicologo()
      OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Selection update can create hired employee contract" ON public.contracts;
CREATE POLICY "Selection update can create hired employee contract"
ON public.contracts
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.is_psicologo()
      OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Selection update can create hired employee entry exam" ON public.medical_exams;
CREATE POLICY "Selection update can create hired employee entry exam"
ON public.medical_exams
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.is_psicologo()
      OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Selection update can create hired employee onboarding tasks" ON public.employee_onboarding_tasks;
CREATE POLICY "Selection update can create hired employee onboarding tasks"
ON public.employee_onboarding_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.is_psicologo()
      OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
    )
  )
);
