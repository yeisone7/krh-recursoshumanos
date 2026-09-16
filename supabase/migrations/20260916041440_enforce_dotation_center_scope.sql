-- Enforce the operation-center assignments configured in Administración >
-- Asignar Centros across every center-owned surface in Dotación.

-- Deliveries are center-owned through the employee's current work record.
DROP POLICY IF EXISTS "Users can view accessible dotation" ON public.dotation_deliveries;
DROP POLICY IF EXISTS "Admin and RRHH can manage dotation" ON public.dotation_deliveries;

CREATE POLICY "Users can view center-scoped dotation deliveries"
  ON public.dotation_deliveries
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_deliveries.employee_id
          AND work_info.company_id = dotation_deliveries.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  );

CREATE POLICY "Users can insert center-scoped dotation deliveries"
  ON public.dotation_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'create')
      )
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_deliveries.employee_id
          AND work_info.company_id = dotation_deliveries.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  );

CREATE POLICY "Users can update center-scoped dotation deliveries"
  ON public.dotation_deliveries
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'update')
      )
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_deliveries.employee_id
          AND work_info.company_id = dotation_deliveries.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'update')
      )
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_deliveries.employee_id
          AND work_info.company_id = dotation_deliveries.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  );

CREATE POLICY "Users can delete center-scoped dotation deliveries"
  ON public.dotation_deliveries
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'delete')
      )
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_deliveries.employee_id
          AND work_info.company_id = dotation_deliveries.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  );

-- Delivery transactions use the same employee/center ownership rule.
DROP POLICY IF EXISTS "Users can view accessible delivery transactions" ON public.dotation_delivery_transactions;
DROP POLICY IF EXISTS "Admin and RRHH can manage delivery transactions" ON public.dotation_delivery_transactions;

CREATE POLICY "Users can view center-scoped delivery transactions"
  ON public.dotation_delivery_transactions
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_delivery_transactions.employee_id
          AND work_info.company_id = dotation_delivery_transactions.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  );

CREATE POLICY "Users can insert center-scoped delivery transactions"
  ON public.dotation_delivery_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'create')
      )
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_delivery_transactions.employee_id
          AND work_info.company_id = dotation_delivery_transactions.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  );

CREATE POLICY "Users can update center-scoped delivery transactions"
  ON public.dotation_delivery_transactions
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'update')
      )
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_delivery_transactions.employee_id
          AND work_info.company_id = dotation_delivery_transactions.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'update')
      )
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_delivery_transactions.employee_id
          AND work_info.company_id = dotation_delivery_transactions.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  );

CREATE POLICY "Users can delete center-scoped delivery transactions"
  ON public.dotation_delivery_transactions
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'delete')
      )
      AND EXISTS (
        SELECT 1
        FROM public.employee_work_info work_info
        WHERE work_info.employee_id = dotation_delivery_transactions.employee_id
          AND work_info.company_id = dotation_delivery_transactions.company_id
          AND work_info.is_current
          AND public.check_center_access(work_info.company_id, work_info.operation_center_id)
      )
    )
  );

-- Profesiogramas have a direct operation-center owner.
DROP POLICY IF EXISTS "Company members can view profesiogramas" ON public.dotation_profesiograma;
DROP POLICY IF EXISTS "Admin/RRHH can insert profesiogramas" ON public.dotation_profesiograma;
DROP POLICY IF EXISTS "Admin/RRHH can update profesiogramas" ON public.dotation_profesiograma;
DROP POLICY IF EXISTS "Admin/RRHH can delete profesiogramas" ON public.dotation_profesiograma;

CREATE POLICY "Users can view center-scoped profesiogramas"
  ON public.dotation_profesiograma
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
    )
  );

CREATE POLICY "Users can insert center-scoped profesiogramas"
  ON public.dotation_profesiograma
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'create')
      )
    )
  );

CREATE POLICY "Users can update center-scoped profesiogramas"
  ON public.dotation_profesiograma
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'update')
      )
    )
  );

CREATE POLICY "Users can delete center-scoped profesiogramas"
  ON public.dotation_profesiograma
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND public.check_center_access(company_id, operation_center_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'delete')
      )
    )
  );

-- Items inherit center ownership from their parent profesiograma.
DROP POLICY IF EXISTS "Role permissions can view dotation profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can insert dotation profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can update dotation profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Role permissions can delete dotation profesiograma items" ON public.dotation_profesiograma_items;

CREATE POLICY "Users can view center-scoped profesiograma items"
  ON public.dotation_profesiograma_items
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.dotation_profesiograma profesiograma
      WHERE profesiograma.id = dotation_profesiograma_items.profesiograma_id
        AND profesiograma.company_id = dotation_profesiograma_items.company_id
        AND public.is_company_member(profesiograma.company_id)
        AND public.check_center_access(profesiograma.company_id, profesiograma.operation_center_id)
    )
  );

CREATE POLICY "Users can insert center-scoped profesiograma items"
  ON public.dotation_profesiograma_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.dotation_profesiograma profesiograma
      WHERE profesiograma.id = dotation_profesiograma_items.profesiograma_id
        AND profesiograma.company_id = dotation_profesiograma_items.company_id
        AND public.is_company_member(profesiograma.company_id)
        AND public.check_center_access(profesiograma.company_id, profesiograma.operation_center_id)
        AND (
          public.is_admin_or_rrhh()
          OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'create')
        )
    )
  );

CREATE POLICY "Users can update center-scoped profesiograma items"
  ON public.dotation_profesiograma_items
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.dotation_profesiograma profesiograma
      WHERE profesiograma.id = dotation_profesiograma_items.profesiograma_id
        AND profesiograma.company_id = dotation_profesiograma_items.company_id
        AND public.is_company_member(profesiograma.company_id)
        AND public.check_center_access(profesiograma.company_id, profesiograma.operation_center_id)
        AND (
          public.is_admin_or_rrhh()
          OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'update')
        )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.dotation_profesiograma profesiograma
      WHERE profesiograma.id = dotation_profesiograma_items.profesiograma_id
        AND profesiograma.company_id = dotation_profesiograma_items.company_id
        AND public.is_company_member(profesiograma.company_id)
        AND public.check_center_access(profesiograma.company_id, profesiograma.operation_center_id)
        AND (
          public.is_admin_or_rrhh()
          OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'update')
        )
    )
  );

CREATE POLICY "Users can delete center-scoped profesiograma items"
  ON public.dotation_profesiograma_items
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.dotation_profesiograma profesiograma
      WHERE profesiograma.id = dotation_profesiograma_items.profesiograma_id
        AND profesiograma.company_id = dotation_profesiograma_items.company_id
        AND public.is_company_member(profesiograma.company_id)
        AND public.check_center_access(profesiograma.company_id, profesiograma.operation_center_id)
        AND (
          public.is_admin_or_rrhh()
          OR public.check_user_permission((SELECT auth.uid()), 'dotacion', 'delete')
        )
    )
  );

-- The former SECURITY DEFINER function bypassed all RLS. SECURITY INVOKER
-- makes both the parent and item policies apply to the caller.
CREATE OR REPLACE FUNCTION public.get_profesiogramas_with_items(_company_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(json_agg(prof_row ORDER BY prof_row.created_at DESC), '[]'::json)
  FROM (
    SELECT
      profesiograma.id,
      profesiograma.company_id,
      profesiograma.operation_center_id,
      profesiograma.position_id,
      profesiograma.created_at,
      profesiograma.updated_at,
      json_build_object('id', center.id, 'name', center.name) AS operation_centers,
      json_build_object('id', position.id, 'name', position.name) AS positions,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', item.id,
            'profesiograma_id', item.profesiograma_id,
            'dotation_item_type_id', item.dotation_item_type_id,
            'quantity', item.quantity,
            'notes', item.notes,
            'is_required', item.is_required,
            'dotation_item_types', json_build_object(
              'id', item_type.id,
              'name', item_type.name,
              'code', item_type.code,
              'category', item_type.category,
              'requires_size', item_type.requires_size,
              'sizes_available', item_type.sizes_available,
              'default_validity_months', item_type.default_validity_months
            )
          ))
          FROM public.dotation_profesiograma_items item
          JOIN public.dotation_item_types item_type ON item_type.id = item.dotation_item_type_id
          WHERE item.profesiograma_id = profesiograma.id
        ),
        '[]'::json
      ) AS items
    FROM public.dotation_profesiograma profesiograma
    LEFT JOIN public.operation_centers center ON center.id = profesiograma.operation_center_id
    LEFT JOIN public.positions position ON position.id = profesiograma.position_id
    WHERE profesiograma.company_id = _company_id
  ) prof_row
$$;

REVOKE ALL ON FUNCTION public.get_profesiogramas_with_items(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profesiogramas_with_items(uuid) TO authenticated;
