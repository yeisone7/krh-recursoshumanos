-- Ensure the confidential requisitions permission is present in the access
-- matrix catalog, even for environments that applied the confidentiality
-- migration before the Requisiciones parent module existed or was repaired.

WITH parent_module AS (
  SELECT id
  FROM public.modules
  WHERE code = 'requisiciones'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT
  'req_confidential_requisitions',
  'Requisiciones: Confidenciales',
  'Lock',
  191,
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
SELECT
  m.id,
  'view'::public.permission_action,
  'Requisiciones confidenciales - Ver'
FROM public.modules AS m
WHERE m.code = 'req_confidential_requisitions'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;
