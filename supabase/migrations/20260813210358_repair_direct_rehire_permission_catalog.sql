-- Repair environments where the direct-rehire RPCs were deployed but the
-- module/permission catalog row was not created. The statements are
-- intentionally idempotent so this migration is safe for every environment.
DO $$
DECLARE
  employee_module_id uuid;
  direct_rehire_module_id uuid;
BEGIN
  SELECT id
  INTO employee_module_id
  FROM public.modules
  WHERE code = 'empleados'
  LIMIT 1;

  IF employee_module_id IS NULL THEN
    RAISE EXCEPTION 'No se puede registrar recontratacion_directa: falta el modulo empleados';
  END IF;

  INSERT INTO public.modules (
    code,
    name,
    icon,
    sort_order,
    parent_id,
    is_active
  )
  VALUES (
    'recontratacion_directa',
    'Recontratación directa',
    'RotateCcw',
    4,
    employee_module_id,
    true
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    parent_id = EXCLUDED.parent_id,
    is_active = true
  RETURNING id INTO direct_rehire_module_id;

  INSERT INTO public.permissions (module_id, action, description)
  VALUES (
    direct_rehire_module_id,
    'create'::public.permission_action,
    'Ejecutar una recontratación directa sin proceso de selección'
  )
  ON CONFLICT (module_id, action) DO UPDATE SET
    description = EXCLUDED.description;

  IF NOT EXISTS (
    SELECT 1
    FROM public.permissions permission
    WHERE permission.module_id = direct_rehire_module_id
      AND permission.action = 'create'::public.permission_action
  ) THEN
    RAISE EXCEPTION 'No se pudo registrar el permiso recontratacion_directa:create';
  END IF;
END;
$$;
