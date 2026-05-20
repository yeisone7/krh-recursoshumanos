-- Allow regular company users to create and submit their own requisition drafts.
-- Admin/RRHH and dynamic permission-based access remain unchanged.

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
    public.is_super_admin()
    OR public.is_company_member(company_id)
  );

CREATE POLICY "Admin RRHH and requesters can insert requisitions"
  ON public.personnel_requisitions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
        OR (
          created_by = auth.uid()
          AND solicitante_id = auth.uid()
          AND estado_requisicion = 'borrador'
        )
      )
    )
  );

CREATE POLICY "Admin RRHH and requesters can update requisitions"
  ON public.personnel_requisitions
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
        OR (
          created_by = auth.uid()
          AND estado_requisicion = 'borrador'
        )
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
        OR (
          created_by = auth.uid()
          AND solicitante_id = auth.uid()
          AND estado_requisicion IN ('borrador', 'en_rrhh')
        )
      )
    )
  );

CREATE POLICY "Admin can delete requisitions"
  ON public.personnel_requisitions
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
