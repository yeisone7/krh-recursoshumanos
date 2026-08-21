-- Reconcile the catalog permissions in environments where the feature
-- migrations were deployed before the module registry finished syncing.
WITH selection_module AS (
  SELECT id FROM public.modules WHERE code = 'seleccion' LIMIT 1
), catalog_modules(code, name, icon, sort_order) AS (
  VALUES
    ('catalogos_seleccion_referencias_laborales', 'Catálogos Selección: Referencias laborales', 'ContactRound', 608),
    ('catalogos_seleccion_referencias_academicas', 'Catálogos Selección: Referencias académicas', 'GraduationCap', 609),
    ('catalogos_seleccion_lista_rosada', 'Catálogos Selección: Lista Rosada', 'ListChecks', 610),
    ('catalogos_seleccion_informacion_vacantes', 'Catálogos Selección: Información Vacantes', 'NotebookTabs', 611),
    ('catalogos_seleccion_informacion_examenes_medicos', 'Catálogos Selección: Información exámenes médicos', 'Stethoscope', 612)
)
INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
SELECT catalog_modules.code, catalog_modules.name, selection_module.id, catalog_modules.icon, catalog_modules.sort_order, true
FROM catalog_modules CROSS JOIN selection_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

WITH catalog_modules(code, name) AS (
  VALUES
    ('catalogos_seleccion_referencias_laborales', 'Catálogos Selección: Referencias laborales'),
    ('catalogos_seleccion_referencias_academicas', 'Catálogos Selección: Referencias académicas'),
    ('catalogos_seleccion_lista_rosada', 'Catálogos Selección: Lista Rosada'),
    ('catalogos_seleccion_informacion_vacantes', 'Catálogos Selección: Información Vacantes'),
    ('catalogos_seleccion_informacion_examenes_medicos', 'Catálogos Selección: Información exámenes médicos')
), actions(action, label) AS (
  VALUES ('view'::public.permission_action, 'Ver'), ('create'::public.permission_action, 'Crear'),
         ('update'::public.permission_action, 'Modificar'), ('delete'::public.permission_action, 'Eliminar')
)
INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, actions.action, catalog_modules.name || ' - ' || actions.label
FROM catalog_modules
JOIN public.modules module ON module.code = catalog_modules.code
CROSS JOIN actions
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.custom_roles role
CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true
  AND module.code IN (
    'catalogos_seleccion_referencias_laborales',
    'catalogos_seleccion_referencias_academicas',
    'catalogos_seleccion_lista_rosada',
    'catalogos_seleccion_informacion_vacantes',
    'catalogos_seleccion_informacion_examenes_medicos'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
