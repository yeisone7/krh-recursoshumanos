
-- Enum for permission actions
CREATE TYPE public.permission_action AS ENUM ('view', 'create', 'update', 'delete');

-- Modules catalog
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permissions catalog (module + action)
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  action public.permission_action NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_id, action)
);

-- Dynamic roles catalog
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Role-Permission pivot
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- User-Role assignments (new dynamic system)
CREATE TABLE public.user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Triggers for updated_at
CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS: modules and permissions are readable by all authenticated users
CREATE POLICY "Authenticated users can read modules" ON public.modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

-- RLS: custom_roles readable by company members, writable by admins
CREATE POLICY "Company members can read roles" ON public.custom_roles
  FOR SELECT TO authenticated USING (public.is_company_member(company_id));

CREATE POLICY "Admins can manage roles" ON public.custom_roles
  FOR ALL TO authenticated USING (public.is_admin_or_rrhh()) WITH CHECK (public.is_admin_or_rrhh());

-- RLS: role_permissions readable by authenticated, writable by admins
CREATE POLICY "Authenticated can read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions
  FOR ALL TO authenticated USING (public.is_admin_or_rrhh()) WITH CHECK (public.is_admin_or_rrhh());

-- RLS: user_custom_roles
CREATE POLICY "Users can read own roles" ON public.user_custom_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_rrhh());

CREATE POLICY "Admins can manage user roles" ON public.user_custom_roles
  FOR ALL TO authenticated USING (public.is_admin_or_rrhh()) WITH CHECK (public.is_admin_or_rrhh());

-- Anon access for modules/permissions (needed for check_user_permission)
CREATE POLICY "Anon can read modules" ON public.modules
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can read permissions" ON public.permissions
  FOR SELECT TO anon USING (true);

-- Function: check_user_permission
CREATE OR REPLACE FUNCTION public.check_user_permission(_user_id UUID, _module_code TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_custom_roles ucr
    JOIN public.custom_roles cr ON ucr.role_id = cr.id
    WHERE ucr.user_id = _user_id
      AND cr.is_active = true
      AND (
        cr.is_system = true
        OR EXISTS (
          SELECT 1
          FROM public.role_permissions rp
          JOIN public.permissions p ON rp.permission_id = p.id
          JOIN public.modules m ON p.module_id = m.id
          WHERE rp.role_id = cr.id
            AND m.code = _module_code
            AND p.action = _action::permission_action
            AND m.is_active = true
        )
      )
  )
$$;

-- Function: get user effective permissions (all module_code + action pairs)
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(module_code TEXT, action TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- If user has any system role, return ALL permissions
  SELECT DISTINCT m.code, p.action::TEXT
  FROM public.modules m
  JOIN public.permissions p ON p.module_id = m.id
  WHERE m.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_custom_roles ucr
      JOIN public.custom_roles cr ON ucr.role_id = cr.id
      WHERE ucr.user_id = _user_id AND cr.is_active = true AND cr.is_system = true
    )
  UNION
  -- Otherwise return specific permissions from active roles
  SELECT DISTINCT m.code, p.action::TEXT
  FROM public.user_custom_roles ucr
  JOIN public.custom_roles cr ON ucr.role_id = cr.id
  JOIN public.role_permissions rp ON rp.role_id = cr.id
  JOIN public.permissions p ON rp.permission_id = p.id
  JOIN public.modules m ON p.module_id = m.id
  WHERE ucr.user_id = _user_id
    AND cr.is_active = true
    AND cr.is_system = false
    AND m.is_active = true
$$;

-- Seed: Insert all system modules
INSERT INTO public.modules (code, name, icon, sort_order) VALUES
  ('dashboard', 'Dashboard', 'LayoutDashboard', 1),
  ('analitica', 'Analítica RRHH', 'BarChart3', 2),
  ('empleados', 'Empleados', 'Users', 3),
  ('contratos', 'Contratos', 'FileText', 4),
  ('requisiciones', 'Requisiciones', 'ClipboardList', 5),
  ('seleccion', 'Selección y Vacantes', 'UserSearch', 6),
  ('vacaciones', 'Vacaciones', 'Palmtree', 7),
  ('permisos', 'Permisos', 'ClipboardList', 8),
  ('incapacidades', 'Incapacidades', 'HeartPulse', 9),
  ('capacitaciones', 'Capacitaciones', 'GraduationCap', 10),
  ('evaluaciones', 'Evaluaciones de Desempeño', 'Target', 11),
  ('disciplinarios', 'Disciplinarios', 'Gavel', 12),
  ('dotacion', 'Dotación', 'Package', 13),
  ('cesantias', 'Cesantías', 'Landmark', 14),
  ('examenes', 'Exámenes Médicos', 'Stethoscope', 15),
  ('jornadas', 'Jornadas', 'Briefcase', 16),
  ('novedades', 'Novedades', 'Clock', 17),
  ('pre_liquidacion', 'Pre-Liquidación', 'Calculator', 18),
  ('calendario', 'Calendario', 'Calendar', 19),
  ('reportes', 'Reportes', 'FileBarChart', 20),
  ('organigrama', 'Organigrama', 'Network', 21),
  ('catalogos', 'Catálogos', 'FolderOpen', 22),
  ('seguridad', 'Seguridad', 'ShieldCheck', 23),
  ('configuracion', 'Configuración', 'Settings', 24),
  ('centros', 'Centros de Operación', 'Building2', 25),
  ('config_laboral', 'Configuración Laboral', 'Settings', 26),
  ('alertas', 'Alertas', 'Bell', 27);

-- Seed: Generate CRUD permissions for all modules
INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, a.action, m.name || ' - ' || 
  CASE a.action 
    WHEN 'view' THEN 'Ver'
    WHEN 'create' THEN 'Crear'
    WHEN 'update' THEN 'Modificar'
    WHEN 'delete' THEN 'Eliminar'
  END
FROM public.modules m
CROSS JOIN (VALUES ('view'::permission_action), ('create'::permission_action), ('update'::permission_action), ('delete'::permission_action)) AS a(action);
