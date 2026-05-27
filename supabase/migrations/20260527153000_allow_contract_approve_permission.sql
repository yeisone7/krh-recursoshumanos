-- Allow roles with the dedicated Contratos approve permission to approve contracts.
-- The frontend shows the approval action based on this permission.

DROP POLICY IF EXISTS "Admin and RRHH can manage contracts" ON public.contracts;

CREATE POLICY "Admin and RRHH can manage contracts"
ON public.contracts
FOR ALL
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'contratos', 'create')
      OR public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'contratos', 'delete')
      OR public.check_user_permission(auth.uid(), 'contratos', 'approve')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'contratos', 'create')
      OR public.check_user_permission(auth.uid(), 'contratos', 'update')
      OR public.check_user_permission(auth.uid(), 'contratos', 'delete')
      OR public.check_user_permission(auth.uid(), 'contratos', 'approve')
    )
  )
);
