-- Add Employee Analytics as an independent access-matrix permission under Empleados.

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'empleados'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT 'analitica_empleados', 'Analitica de Empleados', 'BarChart3', 211, parent_module.id, true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, 'view'::public.permission_action, 'Analitica de Empleados - Ver'
FROM public.modules m
WHERE m.code = 'analitica_empleados'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

-- Preserve current behavior: roles that could view Empleados inherit this new
-- analytics view permission, but it remains removable from the matrix.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT employee_role_permissions.role_id, analytics_permission.id
FROM public.role_permissions AS employee_role_permissions
JOIN public.permissions AS employee_permission
  ON employee_permission.id = employee_role_permissions.permission_id
JOIN public.modules AS employee_module
  ON employee_module.id = employee_permission.module_id
JOIN public.modules AS analytics_module
  ON analytics_module.code = 'analitica_empleados'
JOIN public.permissions AS analytics_permission
  ON analytics_permission.module_id = analytics_module.id
 AND analytics_permission.action = 'view'::public.permission_action
WHERE employee_module.code = 'empleados'
  AND employee_permission.action = 'view'::public.permission_action
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'analitica_empleados'
ON CONFLICT (role_id, permission_id) DO NOTHING;
