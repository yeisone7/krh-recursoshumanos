BEGIN;

CREATE TABLE IF NOT EXISTS public.selection_labor_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company text NOT NULL CHECK (length(btrim(company)) BETWEEN 2 AND 160),
  phone text,
  email text,
  observations text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT selection_labor_references_company_unique UNIQUE (company_id, company)
);

CREATE INDEX IF NOT EXISTS selection_labor_references_company_idx
  ON public.selection_labor_references(company_id, company);

ALTER TABLE public.selection_labor_references ENABLE ROW LEVEL SECURITY;

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'seleccion' LIMIT 1
)
INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
SELECT 'catalogos_seleccion_referencias_laborales', 'Catálogos Selección: Referencias laborales', id, 'ContactRound', 608, true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, action.name::public.permission_action,
       'Catálogos Selección: Referencias laborales - ' || action.label
FROM public.modules module
CROSS JOIN (VALUES
  ('view', 'Ver'), ('create', 'Crear'), ('update', 'Modificar'), ('delete', 'Eliminar')
) AS action(name, label)
WHERE module.code = 'catalogos_seleccion_referencias_laborales'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.custom_roles role
CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true
  AND module.code = 'catalogos_seleccion_referencias_laborales'
ON CONFLICT (role_id, permission_id) DO NOTHING;

DROP POLICY IF EXISTS "Selection labor references can view" ON public.selection_labor_references;
CREATE POLICY "Selection labor references can view"
ON public.selection_labor_references FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_referencias_laborales', 'view')
  ))
);

DROP POLICY IF EXISTS "Selection labor references can create" ON public.selection_labor_references;
CREATE POLICY "Selection labor references can create"
ON public.selection_labor_references FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_referencias_laborales', 'create')
  ))
);

DROP POLICY IF EXISTS "Selection labor references can update" ON public.selection_labor_references;
CREATE POLICY "Selection labor references can update"
ON public.selection_labor_references FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_referencias_laborales', 'update')
  ))
)
WITH CHECK (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_referencias_laborales', 'update')
  ))
);

DROP POLICY IF EXISTS "Selection labor references can delete" ON public.selection_labor_references;
CREATE POLICY "Selection labor references can delete"
ON public.selection_labor_references FOR DELETE TO authenticated
USING (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_referencias_laborales', 'delete')
  ))
);

DROP TRIGGER IF EXISTS update_selection_labor_references_updated_at ON public.selection_labor_references;
CREATE TRIGGER update_selection_labor_references_updated_at
  BEFORE UPDATE ON public.selection_labor_references
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
