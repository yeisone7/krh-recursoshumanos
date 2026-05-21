BEGIN;

-- Align auxiliary tables with the dynamic role permissions used by their modules.
-- Main module tables were already covered; these child/audit tables are written
-- during create/update flows and can block non-admin roles if left with legacy RLS.

-- DOTACION: inventory movement audit
DROP POLICY IF EXISTS "Users can view inventory movements" ON public.dotation_inventory_movements;
DROP POLICY IF EXISTS "Admin/RRHH can insert inventory movements" ON public.dotation_inventory_movements;
DROP POLICY IF EXISTS "Role permissions can view inventory movements" ON public.dotation_inventory_movements;
DROP POLICY IF EXISTS "Role permissions can insert inventory movements" ON public.dotation_inventory_movements;

CREATE POLICY "Role permissions can view inventory movements"
  ON public.dotation_inventory_movements
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert inventory movements"
  ON public.dotation_inventory_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  );

-- DOTACION: profesiograma items
DROP POLICY IF EXISTS "Users can view profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Users can manage profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Admin/RRHH can insert profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Admin/RRHH can update profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Admin/RRHH can delete profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can view profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can insert profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can update profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can delete profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can view dotation profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can insert dotation profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can update dotation profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can delete dotation profesiograma items" ON public.dotation_profesiograma_items;

CREATE POLICY "Role permissions can view dotation profesiograma items"
  ON public.dotation_profesiograma_items
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert dotation profesiograma items"
  ON public.dotation_profesiograma_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
      )
    )
  );

CREATE POLICY "Role permissions can update dotation profesiograma items"
  ON public.dotation_profesiograma_items
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete dotation profesiograma items"
  ON public.dotation_profesiograma_items
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  );

-- DISCIPLINARIOS: timeline, evidence, defenses and defense tokens
DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Users can view disciplinary evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Users can manage evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can view evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can insert evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can update evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can delete evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Role permissions can view disciplinary evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Role permissions can insert disciplinary evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Role permissions can update disciplinary evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Role permissions can delete disciplinary evidence" ON public.disciplinary_evidence;

CREATE POLICY "Role permissions can view disciplinary evidence"
  ON public.disciplinary_evidence
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert disciplinary evidence"
  ON public.disciplinary_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'create')
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can update disciplinary evidence"
  ON public.disciplinary_evidence
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete disciplinary evidence"
  ON public.disciplinary_evidence
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'delete')
      )
    )
  );

DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Users can view disciplinary timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Users can manage timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can view timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can insert timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can update timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can delete timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Role permissions can view disciplinary timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Role permissions can insert disciplinary timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Role permissions can update disciplinary timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Role permissions can delete disciplinary timeline" ON public.disciplinary_timeline;

CREATE POLICY "Role permissions can view disciplinary timeline"
  ON public.disciplinary_timeline
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert disciplinary timeline"
  ON public.disciplinary_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'create')
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can update disciplinary timeline"
  ON public.disciplinary_timeline
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete disciplinary timeline"
  ON public.disciplinary_timeline
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'delete')
      )
    )
  );

DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Users can view disciplinary defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Users can manage defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can view defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can insert defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can update defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can delete defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Role permissions can view disciplinary defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Role permissions can insert disciplinary defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Role permissions can update disciplinary defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Role permissions can delete disciplinary defenses" ON public.disciplinary_defenses;

CREATE POLICY "Role permissions can view disciplinary defenses"
  ON public.disciplinary_defenses
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Role permissions can insert disciplinary defenses"
  ON public.disciplinary_defenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'create')
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can update disciplinary defenses"
  ON public.disciplinary_defenses
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can delete disciplinary defenses"
  ON public.disciplinary_defenses
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'delete')
      )
    )
  );

DROP POLICY IF EXISTS "Company members can insert tokens" ON public.disciplinary_defense_tokens;
DROP POLICY IF EXISTS "Company members can update tokens" ON public.disciplinary_defense_tokens;
DROP POLICY IF EXISTS "Role permissions can insert disciplinary defense tokens" ON public.disciplinary_defense_tokens;
DROP POLICY IF EXISTS "Role permissions can update disciplinary defense tokens" ON public.disciplinary_defense_tokens;

CREATE POLICY "Role permissions can insert disciplinary defense tokens"
  ON public.disciplinary_defense_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'create')
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  );

CREATE POLICY "Role permissions can update disciplinary defense tokens"
  ON public.disciplinary_defense_tokens
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
      )
    )
  );

COMMIT;
