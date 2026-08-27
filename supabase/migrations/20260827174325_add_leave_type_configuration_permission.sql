-- Separate leave-type administration from ordinary leave-request permissions.
WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'permisos'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT 'leave_type_configuration', 'Permisos: Configurar tipos de permisos', 'Settings', 804, parent_module.id, true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, 'update'::public.permission_action, 'Configurar tipos y reglas de permisos'
FROM public.modules module
WHERE module.code = 'leave_type_configuration'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

-- Existing system Administrator roles retain full access. SuperAdmin and
-- legacy administrators also retain their existing authorization bypass.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.custom_roles role
CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system
  AND module.code = 'leave_type_configuration'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Table grants let PostgREST reach the RLS layer; the policies below remain
-- the authority that decides which authenticated users may mutate rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_type_config TO authenticated, service_role;

DROP POLICY IF EXISTS "Authorized users can create leave type config" ON public.leave_type_config;
DROP POLICY IF EXISTS "Authorized users can update leave type config" ON public.leave_type_config;
DROP POLICY IF EXISTS "Authorized users can delete leave type config" ON public.leave_type_config;

CREATE POLICY "Authorized users can create leave type config"
ON public.leave_type_config FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin()
      OR public.check_user_permission((SELECT auth.uid()), 'leave_type_configuration', 'update')
    )
  )
);

CREATE POLICY "Authorized users can update leave type config"
ON public.leave_type_config FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin()
      OR public.check_user_permission((SELECT auth.uid()), 'leave_type_configuration', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin()
      OR public.check_user_permission((SELECT auth.uid()), 'leave_type_configuration', 'update')
    )
  )
);

CREATE POLICY "Authorized users can delete leave type config"
ON public.leave_type_config FOR DELETE TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin()
      OR public.check_user_permission((SELECT auth.uid()), 'leave_type_configuration', 'update')
    )
  )
);
