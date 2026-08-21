BEGIN;

CREATE TABLE IF NOT EXISTS public.selection_pink_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reference_date date NOT NULL DEFAULT current_date,
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 2 AND 200),
  document_number text NOT NULL CHECK (length(btrim(document_number)) BETWEEN 3 AND 50),
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE RESTRICT,
  operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id) ON DELETE RESTRICT,
  observations text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS selection_pink_list_company_date_idx ON public.selection_pink_list(company_id, reference_date DESC);
CREATE INDEX IF NOT EXISTS selection_pink_list_document_idx ON public.selection_pink_list(company_id, document_number);
ALTER TABLE public.selection_pink_list ENABLE ROW LEVEL SECURITY;

WITH parent_module AS (SELECT id FROM public.modules WHERE code = 'seleccion' LIMIT 1)
INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
SELECT 'catalogos_seleccion_lista_rosada', 'Catálogos Selección: Lista Rosada', id, 'ListChecks', 610, true FROM parent_module
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, action.name::public.permission_action, 'Catálogos Selección: Lista Rosada - ' || action.label
FROM public.modules module CROSS JOIN (VALUES ('view', 'Ver'), ('create', 'Crear'), ('update', 'Modificar'), ('delete', 'Eliminar')) AS action(name, label)
WHERE module.code = 'catalogos_seleccion_lista_rosada'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id FROM public.custom_roles role CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true AND module.code = 'catalogos_seleccion_lista_rosada'
ON CONFLICT (role_id, permission_id) DO NOTHING;

DROP POLICY IF EXISTS "Selection pink list can view" ON public.selection_pink_list;
CREATE POLICY "Selection pink list can view" ON public.selection_pink_list FOR SELECT TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_lista_rosada', 'view'))));
DROP POLICY IF EXISTS "Selection pink list can create" ON public.selection_pink_list;
CREATE POLICY "Selection pink list can create" ON public.selection_pink_list FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_lista_rosada', 'create'))));
DROP POLICY IF EXISTS "Selection pink list can update" ON public.selection_pink_list;
CREATE POLICY "Selection pink list can update" ON public.selection_pink_list FOR UPDATE TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_lista_rosada', 'update'))))
WITH CHECK (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_lista_rosada', 'update'))));
DROP POLICY IF EXISTS "Selection pink list can delete" ON public.selection_pink_list;
CREATE POLICY "Selection pink list can delete" ON public.selection_pink_list FOR DELETE TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_lista_rosada', 'delete'))));

DROP TRIGGER IF EXISTS update_selection_pink_list_updated_at ON public.selection_pink_list;
CREATE TRIGGER update_selection_pink_list_updated_at BEFORE UPDATE ON public.selection_pink_list
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
