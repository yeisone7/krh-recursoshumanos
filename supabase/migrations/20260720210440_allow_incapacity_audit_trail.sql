-- Let users who can access the Incapacidades module inspect the audit trail
-- only for incapacity records that belong to one of their companies.

BEGIN;

DROP POLICY IF EXISTS "Incapacity permissions can view incapacity audit trail" ON public.audit_logs;
CREATE POLICY "Incapacity permissions can view incapacity audit trail"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  entity_type = 'incapacity'
  AND entity_id IS NOT NULL
  AND company_id IS NOT NULL
  AND public.is_company_member(company_id)
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'view')
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'create')
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'delete')
  )
);

COMMIT;
