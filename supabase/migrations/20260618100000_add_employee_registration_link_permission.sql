-- Split employee self-registration link/token generation into an independent permission.

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'empleados'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT 'emp_registration_links', 'Empleados: Generar links/tokens', 'Link2', 210, parent_module.id, true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, 'create'::public.permission_action, 'Empleados: Generar links/tokens - Crear'
FROM public.modules m
WHERE m.code = 'emp_registration_links'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

-- Preserve current access for roles that could already create employees. The
-- permission remains separately removable from the matrix after this migration.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, link_perm.id
FROM public.role_permissions rp
JOIN public.permissions employee_perm ON employee_perm.id = rp.permission_id
JOIN public.modules employee_module ON employee_module.id = employee_perm.module_id
JOIN public.modules link_module ON link_module.code = 'emp_registration_links'
JOIN public.permissions link_perm
  ON link_perm.module_id = link_module.id
 AND link_perm.action = 'create'::public.permission_action
WHERE employee_module.code = 'empleados'
  AND employee_perm.action = 'create'::public.permission_action
ON CONFLICT (role_id, permission_id) DO NOTHING;

DROP POLICY IF EXISTS "Company members can insert tokens" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Company members can update tokens" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Company members can delete registration tokens" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Employee and selection permissions can view registration tokens" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Employee and selection permissions can insert registration tokens" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Employee and selection permissions can update registration tokens" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Employee and selection permissions can delete registration tokens" ON public.self_registration_tokens;

CREATE POLICY "Employee and selection permissions can view registration tokens"
  ON public.self_registration_tokens
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR (
          target_type = 'employee'
          AND public.check_user_permission(auth.uid(), 'emp_registration_links', 'create')
        )
        OR (
          target_type = 'candidate'
          AND (
            public.check_user_permission(auth.uid(), 'seleccion', 'view')
            OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
            OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
          )
        )
      )
    )
  );

CREATE POLICY "Employee and selection permissions can insert registration tokens"
  ON public.self_registration_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR (
          target_type = 'employee'
          AND public.check_user_permission(auth.uid(), 'emp_registration_links', 'create')
        )
        OR (
          target_type = 'candidate'
          AND (
            public.check_user_permission(auth.uid(), 'seleccion', 'create')
            OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
          )
        )
      )
    )
  );

CREATE POLICY "Employee and selection permissions can update registration tokens"
  ON public.self_registration_tokens
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR (
          target_type = 'employee'
          AND public.check_user_permission(auth.uid(), 'emp_registration_links', 'create')
        )
        OR (
          target_type = 'candidate'
          AND (
            public.check_user_permission(auth.uid(), 'seleccion', 'create')
            OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
          )
        )
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR (
          target_type = 'employee'
          AND public.check_user_permission(auth.uid(), 'emp_registration_links', 'create')
        )
        OR (
          target_type = 'candidate'
          AND (
            public.check_user_permission(auth.uid(), 'seleccion', 'create')
            OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
          )
        )
      )
    )
  );

CREATE POLICY "Employee and selection permissions can delete registration tokens"
  ON public.self_registration_tokens
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR (
          target_type = 'employee'
          AND public.check_user_permission(auth.uid(), 'emp_registration_links', 'create')
        )
        OR (
          target_type = 'candidate'
          AND (
            public.check_user_permission(auth.uid(), 'seleccion', 'create')
            OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
          )
        )
      )
    )
  );
