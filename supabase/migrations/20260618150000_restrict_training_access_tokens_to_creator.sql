-- Restrict training access links so only their creator can see/manage them.
-- Admins and super admins retain full visibility and management by company.

DROP POLICY IF EXISTS "Training permissions can view" ON public.training_access_tokens;
DROP POLICY IF EXISTS "Training permissions can insert" ON public.training_access_tokens;
DROP POLICY IF EXISTS "Training permissions can update" ON public.training_access_tokens;
DROP POLICY IF EXISTS "Training permissions can delete" ON public.training_access_tokens;

CREATE POLICY "Training permissions can view"
ON public.training_access_tokens
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_role(auth.uid(), 'admin')
  )
  OR (
    public.is_company_member(company_id)
    AND created_by = auth.uid()
    AND (
      public.check_user_permission(auth.uid(), 'capacitaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_enlaces', 'view')
    )
  )
);

CREATE POLICY "Training permissions can insert"
ON public.training_access_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_role(auth.uid(), 'admin')
  )
  OR (
    public.is_company_member(company_id)
    AND created_by = auth.uid()
    AND (
      public.check_user_permission(auth.uid(), 'capacitaciones', 'create')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_enlaces', 'create')
    )
  )
);

CREATE POLICY "Training permissions can update"
ON public.training_access_tokens
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_role(auth.uid(), 'admin')
  )
  OR (
    public.is_company_member(company_id)
    AND created_by = auth.uid()
    AND (
      public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_enlaces', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_role(auth.uid(), 'admin')
  )
  OR (
    public.is_company_member(company_id)
    AND created_by = auth.uid()
    AND (
      public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_enlaces', 'update')
    )
  )
);

CREATE POLICY "Training permissions can delete"
ON public.training_access_tokens
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_role(auth.uid(), 'admin')
  )
  OR (
    public.is_company_member(company_id)
    AND created_by = auth.uid()
    AND (
      public.check_user_permission(auth.uid(), 'capacitaciones', 'delete')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_enlaces', 'delete')
    )
  )
);
