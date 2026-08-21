BEGIN;

CREATE TABLE IF NOT EXISTS public.selection_medical_exam_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id) ON DELETE RESTRICT,
  exam_type text NOT NULL CHECK (length(btrim(exam_type)) BETWEEN 2 AND 160),
  vaccination_scheme text[] NOT NULL DEFAULT '{}'::text[],
  ips text,
  order_type text NOT NULL CHECK (order_type IN ('propia', 'ocupasalud')),
  contact text,
  email text,
  address text,
  observations text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS selection_medical_exam_information_company_idx ON public.selection_medical_exam_information(company_id, operation_center_id);
ALTER TABLE public.selection_medical_exam_information ENABLE ROW LEVEL SECURITY;

WITH parent_module AS (SELECT id FROM public.modules WHERE code = 'seleccion' LIMIT 1)
INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
SELECT 'catalogos_seleccion_informacion_examenes_medicos', 'Catálogos Selección: Información exámenes médicos', id, 'Stethoscope', 612, true FROM parent_module
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, action.name::public.permission_action, 'Catálogos Selección: Información exámenes médicos - ' || action.label
FROM public.modules module CROSS JOIN (VALUES ('view', 'Ver'), ('create', 'Crear'), ('update', 'Modificar'), ('delete', 'Eliminar')) AS action(name, label)
WHERE module.code = 'catalogos_seleccion_informacion_examenes_medicos'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id FROM public.custom_roles role CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true AND module.code = 'catalogos_seleccion_informacion_examenes_medicos'
ON CONFLICT (role_id, permission_id) DO NOTHING;

DROP POLICY IF EXISTS "Selection medical exam information can view" ON public.selection_medical_exam_information;
CREATE POLICY "Selection medical exam information can view" ON public.selection_medical_exam_information FOR SELECT TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_examenes_medicos', 'view'))));
DROP POLICY IF EXISTS "Selection medical exam information can create" ON public.selection_medical_exam_information;
CREATE POLICY "Selection medical exam information can create" ON public.selection_medical_exam_information FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_examenes_medicos', 'create'))));
DROP POLICY IF EXISTS "Selection medical exam information can update" ON public.selection_medical_exam_information;
CREATE POLICY "Selection medical exam information can update" ON public.selection_medical_exam_information FOR UPDATE TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_examenes_medicos', 'update'))))
WITH CHECK (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_examenes_medicos', 'update'))));
DROP POLICY IF EXISTS "Selection medical exam information can delete" ON public.selection_medical_exam_information;
CREATE POLICY "Selection medical exam information can delete" ON public.selection_medical_exam_information FOR DELETE TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission(auth.uid(), 'catalogos_seleccion_informacion_examenes_medicos', 'delete'))));

DROP TRIGGER IF EXISTS update_selection_medical_exam_information_updated_at ON public.selection_medical_exam_information;
CREATE TRIGGER update_selection_medical_exam_information_updated_at BEFORE UPDATE ON public.selection_medical_exam_information FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
