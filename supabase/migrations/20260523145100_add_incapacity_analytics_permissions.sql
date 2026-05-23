WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'incapacidades'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id)
SELECT 'analitica_incapacidades', 'Analitica de Incapacidades', 'BarChart3', 91, parent_module.id
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, action_value::public.permission_action, description_value
FROM public.modules m
CROSS JOIN (
  VALUES
    ('view', 'Analitica de Incapacidades - Ver'),
    ('export', 'Analitica de Incapacidades - Exportar')
) AS permission_seed(action_value, description_value)
WHERE m.code = 'analitica_incapacidades'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'analitica_incapacidades'
ON CONFLICT (role_id, permission_id) DO NOTHING;
