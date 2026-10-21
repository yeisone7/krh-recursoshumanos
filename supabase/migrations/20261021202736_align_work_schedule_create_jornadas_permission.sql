-- Match the existing day-shift catalog: honor delegated Jornadas creation
-- within the selected company while retaining legacy administrator/HR access.
ALTER POLICY work_schedules_insert ON public.work_schedules TO authenticated
WITH CHECK (
  payroll_private.can(company_id, 'jornadas', 'create')
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
);
