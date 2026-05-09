-- ============================================================
-- MIGRACIÓN: Completar sistema de permisos por roles
-- ============================================================

/* 
  PASO 1: Ejecuta estas dos líneas SOLAS primero:
  
  ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'approve';
  ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'export';

  Una vez ejecutadas, procede con el resto del script abajo.
*/

-- ============================================================
-- 2. INSERTAR MÓDULOS FALTANTES (ignora duplicados)
-- ============================================================
INSERT INTO modules (code, name, sort_order, is_active) VALUES
  ('dashboard',       'Dashboard',                1,  true),
  ('empleados',       'Empleados',                2,  true),
  ('contratos',       'Contratos',                3,  true),
  ('incapacidades',   'Incapacidades',            4,  true),
  ('vacaciones',      'Vacaciones',               5,  true),
  ('permisos',        'Permisos de Ausencia',     6,  true),
  ('novedades',       'Novedades de Nómina',      7,  true),
  ('pre_liquidacion', 'Pre-Liquidación',          8,  true),
  ('jornadas',        'Jornadas y Turnos',        9,  true),
  ('prestamos',       'Préstamos',                10, true),
  ('descuentos',      'Descuentos',               11, true),
  ('cesantias',       'Cesantías',                12, true),
  ('dotacion',        'Dotación',                 13, true),
  ('examenes',        'Exámenes Médicos',         14, true),
  ('disciplinarios',  'Procesos Disciplinarios',  15, true),
  ('capacitaciones',  'Capacitaciones',           16, true),
  ('evaluaciones',    'Evaluaciones',             17, true),
  ('seleccion',       'Selección',                18, true),
  ('requisiciones',   'Requisiciones',            19, true),
  ('centros',         'Centros de Operación',     20, true),
  ('organigrama',     'Organigrama',              21, true),
  ('calendario',      'Calendario',               22, true),
  ('alertas',         'Alertas y Notificaciones', 23, true),
  ('reportes',        'Reportes',                 24, true),
  ('analitica',       'Analítica',                25, true),
  ('asistente_ia',    'Asistente IA',             26, true),
  ('catalogos',       'Catálogos',                27, true),
  ('config_laboral',  'Configuración Laboral',    28, true),
  ('seguridad',       'Seguridad y Auditoría',    29, true),
  ('configuracion',   'Configuración',            30, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- ============================================================
-- 3. CREAR PERMISOS BÁSICOS (view, create, update, delete)
-- ============================================================
INSERT INTO permissions (module_id, action, description)
SELECT m.id, a.action::permission_action, 
  CASE a.action
    WHEN 'view'   THEN 'Ver ' || m.name
    WHEN 'create' THEN 'Crear en ' || m.name
    WHEN 'update' THEN 'Modificar en ' || m.name
    WHEN 'delete' THEN 'Eliminar en ' || m.name
  END
FROM modules m
CROSS JOIN (VALUES ('view'), ('create'), ('update'), ('delete')) AS a(action)
WHERE m.is_active = true
ON CONFLICT (module_id, action) DO NOTHING;

-- ============================================================
-- 4. CREAR PERMISOS DE APROBACIÓN
-- ============================================================
INSERT INTO permissions (module_id, action, description)
SELECT m.id, 'approve'::permission_action, 'Aprobar en ' || m.name
FROM modules m
WHERE m.code IN (
  'vacaciones', 'permisos', 'contratos', 'requisiciones', 'seleccion', 
  'novedades', 'pre_liquidacion', 'prestamos', 'incapacidades', 
  'capacitaciones', 'evaluaciones', 'dotacion', 'disciplinarios', 
  'cesantias', 'jornadas'
)
AND m.is_active = true
ON CONFLICT (module_id, action) DO NOTHING;

-- ============================================================
-- 5. CREAR PERMISOS DE EXPORTACIÓN
-- ============================================================
INSERT INTO permissions (module_id, action, description)
SELECT m.id, 'export'::permission_action, 'Exportar datos de ' || m.name
FROM modules m
WHERE m.code IN (
  'empleados', 'contratos', 'novedades', 'reportes', 'analitica', 
  'vacaciones', 'permisos', 'incapacidades', 'prestamos', 'descuentos', 
  'jornadas', 'capacitaciones', 'evaluaciones', 'cesantias', 'dotacion', 
  'pre_liquidacion', 'disciplinarios', 'seleccion', 'requisiciones'
)
AND m.is_active = true
ON CONFLICT (module_id, action) DO NOTHING;

-- ============================================================
-- 6. VERIFICACIÓN FINAL
-- ============================================================
SELECT m.code AS modulo, m.name AS nombre, p.action AS accion, p.description
FROM permissions p
JOIN modules m ON m.id = p.module_id
ORDER BY m.sort_order, 
  CASE p.action 
    WHEN 'view' THEN 1 
    WHEN 'create' THEN 2 
    WHEN 'update' THEN 3 
    WHEN 'delete' THEN 4 
    WHEN 'approve' THEN 5 
    WHEN 'export' THEN 6 
  END;
