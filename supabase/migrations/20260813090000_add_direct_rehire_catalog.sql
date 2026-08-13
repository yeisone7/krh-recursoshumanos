ALTER TYPE public.employment_cycle_source ADD VALUE IF NOT EXISTS 'direct_rehire';

WITH employee_module AS (
  SELECT id FROM public.modules WHERE code = 'empleados' LIMIT 1
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT 'recontratacion_directa', 'Recontratacion directa', 'RotateCcw', 4, employee_module.id, true
FROM employee_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT id, 'create'::public.permission_action, 'Ejecutar una recontratacion directa sin proceso de seleccion'
FROM public.modules
WHERE code = 'recontratacion_directa'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;
