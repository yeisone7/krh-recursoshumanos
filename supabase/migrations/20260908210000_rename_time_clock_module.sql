-- Keep the user-facing label aligned for databases where the attendance module was already applied.
UPDATE public.modules
SET name = 'Reloj de Asistencia'
WHERE code = 'reloj_checador';

UPDATE public.permissions permission
SET description = 'Reloj de Asistencia - ' || CASE permission.action::text
  WHEN 'view' THEN 'Ver'
  WHEN 'create' THEN 'Registrar'
  WHEN 'update' THEN 'Configurar'
  WHEN 'delete' THEN 'Desactivar'
  WHEN 'approve' THEN 'Aprobar correcciones'
  WHEN 'export' THEN 'Exportar'
  ELSE permission.description
END
FROM public.modules module
WHERE permission.module_id = module.id
  AND module.code = 'reloj_checador';
