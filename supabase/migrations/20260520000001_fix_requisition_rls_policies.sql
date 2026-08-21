-- Drop old restrictive policies
DROP POLICY IF EXISTS "Admin and RRHH can insert requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin and RRHH can update requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin can delete requisitions" ON public.personnel_requisitions;

-- Create updated policies supporting super-admin and dynamic custom permissions
CREATE POLICY "Admin and RRHH can insert requisitions" ON public.personnel_requisitions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id) 
      AND (
        public.is_admin_or_rrhh() 
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
      )
    )
  );

CREATE POLICY "Admin and RRHH can update requisitions" ON public.personnel_requisitions
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id) 
      AND (
        public.is_admin_or_rrhh() 
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
      )
    )
  );

CREATE POLICY "Admin can delete requisitions" ON public.personnel_requisitions
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id) 
      AND (
        public.is_admin() 
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'delete')
      )
    )
  );
