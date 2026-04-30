CREATE POLICY "Admins and HR can view company notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_rrhh()
  AND (
    company_id IS NULL
    OR public.is_company_member(company_id)
  )
);