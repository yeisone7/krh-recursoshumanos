BEGIN;

-- EXAMENES: catalog, profesiograma and delivery flow.
-- These tables are part of the medical exams module but were still using
-- legacy admin/RRHH or broad company-member policies.

DROP POLICY IF EXISTS "Users can view exam catalog for their company" ON public.exam_catalog;
DROP POLICY IF EXISTS "Admin/RRHH can manage exam catalog" ON public.exam_catalog;
DROP POLICY IF EXISTS "Role permissions can view exam catalog" ON public.exam_catalog;
DROP POLICY IF EXISTS "Role permissions can insert exam catalog" ON public.exam_catalog;
DROP POLICY IF EXISTS "Role permissions can update exam catalog" ON public.exam_catalog;
DROP POLICY IF EXISTS "Role permissions can delete exam catalog" ON public.exam_catalog;

CREATE POLICY "Role permissions can view exam catalog"
  ON public.exam_catalog
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert exam catalog"
  ON public.exam_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'create')
      )
    )
  );

CREATE POLICY "Role permissions can update exam catalog"
  ON public.exam_catalog
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete exam catalog"
  ON public.exam_catalog
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'delete')
      )
    )
  );

DROP POLICY IF EXISTS "Users can view exam profesiograma for their company" ON public.exam_profesiograma;
DROP POLICY IF EXISTS "Admin/RRHH can manage exam profesiograma" ON public.exam_profesiograma;
DROP POLICY IF EXISTS "Role permissions can view exam profesiograma" ON public.exam_profesiograma;
DROP POLICY IF EXISTS "Role permissions can insert exam profesiograma" ON public.exam_profesiograma;
DROP POLICY IF EXISTS "Role permissions can update exam profesiograma" ON public.exam_profesiograma;
DROP POLICY IF EXISTS "Role permissions can delete exam profesiograma" ON public.exam_profesiograma;

CREATE POLICY "Role permissions can view exam profesiograma"
  ON public.exam_profesiograma
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert exam profesiograma"
  ON public.exam_profesiograma
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'create')
      )
    )
  );

CREATE POLICY "Role permissions can update exam profesiograma"
  ON public.exam_profesiograma
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete exam profesiograma"
  ON public.exam_profesiograma
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'delete')
      )
    )
  );

DROP POLICY IF EXISTS "Users can view exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Admin/RRHH can manage exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Users can manage exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can view exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can insert exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can update exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can delete exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can view exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can insert exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can update exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can delete exam profesiograma items" ON public.exam_profesiograma_items;

CREATE POLICY "Role permissions can view exam profesiograma items"
  ON public.exam_profesiograma_items
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert exam profesiograma items"
  ON public.exam_profesiograma_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'create')
      )
    )
  );

CREATE POLICY "Role permissions can update exam profesiograma items"
  ON public.exam_profesiograma_items
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete exam profesiograma items"
  ON public.exam_profesiograma_items
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'delete')
      )
    )
  );

DROP POLICY IF EXISTS "Users can view exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Admin/RRHH can manage exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Users can manage exam delivery transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can view exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can insert exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can update exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can delete exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Role permissions can view exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Role permissions can insert exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Role permissions can update exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Role permissions can delete exam transactions" ON public.exam_delivery_transactions;

CREATE POLICY "Role permissions can view exam transactions"
  ON public.exam_delivery_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert exam transactions"
  ON public.exam_delivery_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'create')
      )
    )
  );

CREATE POLICY "Role permissions can update exam transactions"
  ON public.exam_delivery_transactions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete exam transactions"
  ON public.exam_delivery_transactions
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'delete')
      )
    )
  );

DROP POLICY IF EXISTS "Users can view exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Admin/RRHH can manage exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Users can manage exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can view exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can insert exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can update exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can delete exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Role permissions can view exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Role permissions can insert exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Role permissions can update exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Role permissions can delete exam delivery items" ON public.exam_delivery_items;

CREATE POLICY "Role permissions can view exam delivery items"
  ON public.exam_delivery_items
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert exam delivery items"
  ON public.exam_delivery_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'create')
      )
    )
  );

CREATE POLICY "Role permissions can update exam delivery items"
  ON public.exam_delivery_items
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete exam delivery items"
  ON public.exam_delivery_items
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission(auth.uid(), 'examenes', 'delete')
      )
    )
  );

COMMIT;
