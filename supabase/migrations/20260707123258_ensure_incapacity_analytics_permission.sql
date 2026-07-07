-- Ensure Incapacity Analytics is available as an independent access-matrix permission.

WITH parent_module AS (
  SELECT id
  FROM public.modules
  WHERE code = 'incapacidades'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT
  'analitica_incapacidades',
  'Analitica de Incapacidades',
  'BarChart3',
  91,
  parent_module.id,
  true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, permission_seed.action_value::public.permission_action, permission_seed.description_value
FROM public.modules AS m
CROSS JOIN (
  VALUES
    ('view', 'Analitica de Incapacidades - Ver'),
    ('export', 'Analitica de Incapacidades - Exportar')
) AS permission_seed(action_value, description_value)
WHERE m.code = 'analitica_incapacidades'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

-- Preserve current behavior: roles that can view Incapacidades inherit the
-- analytics view permission, but it remains removable from the matrix.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT incapacity_role_permissions.role_id, analytics_permission.id
FROM public.role_permissions AS incapacity_role_permissions
JOIN public.permissions AS incapacity_permission
  ON incapacity_permission.id = incapacity_role_permissions.permission_id
JOIN public.modules AS incapacity_module
  ON incapacity_module.id = incapacity_permission.module_id
JOIN public.modules AS analytics_module
  ON analytics_module.code = 'analitica_incapacidades'
JOIN public.permissions AS analytics_permission
  ON analytics_permission.module_id = analytics_module.id
 AND analytics_permission.action = 'view'::public.permission_action
WHERE incapacity_module.code = 'incapacidades'
  AND incapacity_permission.action = 'view'::public.permission_action
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles AS cr
CROSS JOIN public.permissions AS p
JOIN public.modules AS m
  ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'analitica_incapacidades'
ON CONFLICT (role_id, permission_id) DO NOTHING;
