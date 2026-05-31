-- Roles that can manage the notification engine must also be able to read it.
-- Without the view permission, the UI can open the tab but RLS blocks the load.
WITH motor_module AS (
  SELECT id
  FROM public.modules
  WHERE code = 'motor_notificaciones'
),
view_permission AS (
  SELECT p.id
  FROM public.permissions p
  JOIN motor_module m ON m.id = p.module_id
  WHERE p.action = 'view'
),
roles_with_motor_management AS (
  SELECT DISTINCT rp.role_id
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  JOIN motor_module m ON m.id = p.module_id
  WHERE p.action IN ('create', 'update', 'delete', 'export')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, v.id
FROM roles_with_motor_management r
CROSS JOIN view_permission v
ON CONFLICT (role_id, permission_id) DO NOTHING;
