BEGIN;

CREATE TABLE IF NOT EXISTS public.selection_vacancy_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id) ON DELETE RESTRICT,
  rotation boolean NOT NULL DEFAULT false,
  module_type text NOT NULL DEFAULT 'normal' CHECK (module_type IN ('normal', 'ep_onshore')),
  residence_letter_validation text,
  available_compensation_funds text,
  publication_compensation_funds text,
  spe_email text,
  spe_username text,
  spe_compensation_fund_access text,
  spe_password text,
  compensation_fund_contacts text,
  social_contacts text,
  special_observations text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT selection_vacancy_information_center_unique UNIQUE (company_id, operation_center_id)
);

CREATE INDEX IF NOT EXISTS selection_vacancy_information_company_idx ON public.selection_vacancy_information(company_id, operation_center_id);
ALTER TABLE public.selection_vacancy_information ENABLE ROW LEVEL SECURITY;

WITH parent_module AS (SELECT id FROM public.modules WHERE code = 'seleccion' LIMIT 1)
INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
SELECT 'catalogos_seleccion_informacion_vacantes', 'Catálogos Selección: Información Vacantes', id, 'NotebookTabs', 611, true FROM parent_module
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, action.name::public.permission_action, 'Catálogos Selección: Información Vacantes - ' || action.label
FROM public.modules module CROSS JOIN (VALUES ('view', 'Ver'), ('create', 'Crear'), ('update', 'Modificar'), ('delete', 'Eliminar')) AS action(name, label)
WHERE module.code = 'catalogos_seleccion_informacion_vacantes'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id FROM public.custom_roles role CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true AND module.code = 'catalogos_seleccion_informacion_vacantes'
ON CONFLICT (role_id, permission_id) DO NOTHING;

DROP POLICY IF EXISTS "Selection vacancy information can view" ON public.selection_vacancy_information;
CREATE POLICY "Selection vacancy information can view" ON public.selection_vacancy_information FOR SELECT TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_vacantes', 'view'))));
DROP POLICY IF EXISTS "Selection vacancy information can create" ON public.selection_vacancy_information;
CREATE POLICY "Selection vacancy information can create" ON public.selection_vacancy_information FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_vacantes', 'create'))));
DROP POLICY IF EXISTS "Selection vacancy information can update" ON public.selection_vacancy_information;
CREATE POLICY "Selection vacancy information can update" ON public.selection_vacancy_information FOR UPDATE TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_vacantes', 'update'))))
WITH CHECK (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_vacantes', 'update'))));
DROP POLICY IF EXISTS "Selection vacancy information can delete" ON public.selection_vacancy_information;
CREATE POLICY "Selection vacancy information can delete" ON public.selection_vacancy_information FOR DELETE TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_vacantes', 'delete'))));

DROP TRIGGER IF EXISTS update_selection_vacancy_information_updated_at ON public.selection_vacancy_information;
CREATE TRIGGER update_selection_vacancy_information_updated_at BEFORE UPDATE ON public.selection_vacancy_information
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
