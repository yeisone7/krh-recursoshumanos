-- Ensure the Labor Compliance view is visible to HR roles that can already
-- access the core employee/recruitment workflow modules.

INSERT INTO public.modules (code, name, icon, sort_order, is_active)
VALUES ('cumplimiento_laboral', 'Cumplimiento Laboral', 'ShieldCheck', 29, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, permission_seed.action_value::public.permission_action, permission_seed.description_value
FROM public.modules m
CROSS JOIN (
  VALUES
    ('view', 'Cumplimiento Laboral - Ver'),
    ('create', 'Cumplimiento Laboral - Crear'),
    ('update', 'Cumplimiento Laboral - Modificar'),
    ('delete', 'Cumplimiento Laboral - Eliminar')
) AS permission_seed(action_value, description_value)
WHERE m.code = 'cumplimiento_laboral'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

WITH compliance_permissions AS (
  SELECT p.id
  FROM public.permissions p
  JOIN public.modules m ON m.id = p.module_id
  WHERE m.code = 'cumplimiento_laboral'
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, cp.id
FROM public.custom_roles cr
CROSS JOIN compliance_permissions cp
WHERE cr.is_system = true
ON CONFLICT (role_id, permission_id) DO NOTHING;

WITH compliance_view_permission AS (
  SELECT p.id
  FROM public.permissions p
  JOIN public.modules m ON m.id = p.module_id
  WHERE m.code = 'cumplimiento_laboral'
    AND p.action = 'view'
),
hr_roles AS (
  SELECT DISTINCT rp.role_id
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  JOIN public.modules m ON m.id = p.module_id
  WHERE p.action = 'view'
    AND m.code IN (
      'empleados',
      'contratos',
      'requisiciones',
      'seleccion',
      'disciplinarios',
      'incapacidades',
      'examenes'
    )
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT hr.role_id, cvp.id
FROM hr_roles hr
CROSS JOIN compliance_view_permission cvp
ON CONFLICT (role_id, permission_id) DO NOTHING;
