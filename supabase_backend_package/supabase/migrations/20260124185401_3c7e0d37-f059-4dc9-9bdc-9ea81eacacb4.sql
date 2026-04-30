-- =============================================
-- PHASE 5: SHIFTS AND WORK SCHEDULES
-- =============================================

-- Shift Types table
CREATE TABLE public.shift_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 60,
  is_night_shift BOOLEAN DEFAULT false,
  is_rotating BOOLEAN DEFAULT false,
  rotation_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Employee Shifts assignment
CREATE TABLE public.employee_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_type_id UUID NOT NULL REFERENCES public.shift_types(id) ON DELETE RESTRICT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 6: SYSTEM CONFIGURATION
-- =============================================

-- Areas/Departments
CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  parent_id UUID REFERENCES public.areas(id),
  manager_id UUID,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Positions/Cargos
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.areas(id),
  name TEXT NOT NULL,
  code TEXT,
  level INTEGER DEFAULT 1,
  min_salary NUMERIC,
  max_salary NUMERIC,
  description TEXT,
  requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Contract Type Configuration (extends the enum with additional metadata)
CREATE TABLE public.contract_type_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  max_duration_months INTEGER,
  max_extensions INTEGER,
  requires_end_date BOOLEAN DEFAULT true,
  default_trial_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, contract_type)
);

-- Dotation Item Types
CREATE TABLE public.dotation_item_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT NOT NULL DEFAULT 'uniforme',
  default_validity_months INTEGER DEFAULT 12,
  requires_size BOOLEAN DEFAULT true,
  sizes_available TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- System Configuration (key-value store for company settings)
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, config_key)
);

-- =============================================
-- DEFAULT CONFIGURATION VALUES
-- =============================================

-- Function to insert default config for a company
CREATE OR REPLACE FUNCTION public.insert_default_company_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Alert settings
  INSERT INTO public.system_config (company_id, config_key, config_value, description)
  VALUES 
    (NEW.id, 'alert_contract_days', '{"warning": 30, "critical": 7}'::jsonb, 'Días de anticipación para alertas de vencimiento de contratos'),
    (NEW.id, 'alert_exam_days', '{"warning": 30, "critical": 7}'::jsonb, 'Días de anticipación para alertas de exámenes médicos'),
    (NEW.id, 'alert_dotation_days', '{"warning": 30, "critical": 7}'::jsonb, 'Días de anticipación para alertas de dotación'),
    (NEW.id, 'work_schedule', '{"hours_per_day": 8, "days_per_week": 5}'::jsonb, 'Configuración de jornada laboral estándar')
  ON CONFLICT (company_id, config_key) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-insert default config when company is created
CREATE TRIGGER trigger_insert_default_config
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.insert_default_company_config();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_type_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dotation_item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Shift Types Policies
CREATE POLICY "Users can view company shift types" ON public.shift_types
  FOR SELECT USING (is_company_member(company_id) OR is_admin());

CREATE POLICY "Admin and RRHH can manage shift types" ON public.shift_types
  FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- Employee Shifts Policies
CREATE POLICY "Users can view accessible employee shifts" ON public.employee_shifts
  FOR SELECT USING (has_employee_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee shifts" ON public.employee_shifts
  FOR ALL USING (is_admin_or_rrhh() AND has_employee_access(employee_id))
  WITH CHECK (is_admin_or_rrhh() AND has_employee_access(employee_id));

-- Areas Policies
CREATE POLICY "Users can view company areas" ON public.areas
  FOR SELECT USING (is_company_member(company_id) OR is_admin());

CREATE POLICY "Admin and RRHH can manage areas" ON public.areas
  FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- Positions Policies
CREATE POLICY "Users can view company positions" ON public.positions
  FOR SELECT USING (is_company_member(company_id) OR is_admin());

CREATE POLICY "Admin and RRHH can manage positions" ON public.positions
  FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- Contract Type Config Policies
CREATE POLICY "Users can view contract type config" ON public.contract_type_config
  FOR SELECT USING (is_company_member(company_id) OR is_admin());

CREATE POLICY "Admin can manage contract type config" ON public.contract_type_config
  FOR ALL USING (is_admin() AND is_company_member(company_id))
  WITH CHECK (is_admin() AND is_company_member(company_id));

-- Dotation Item Types Policies
CREATE POLICY "Users can view dotation item types" ON public.dotation_item_types
  FOR SELECT USING (is_company_member(company_id) OR is_admin());

CREATE POLICY "Admin and RRHH can manage dotation item types" ON public.dotation_item_types
  FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- System Config Policies
CREATE POLICY "Users can view company config" ON public.system_config
  FOR SELECT USING (is_company_member(company_id) OR is_admin());

CREATE POLICY "Admin can manage system config" ON public.system_config
  FOR ALL USING (is_admin() AND is_company_member(company_id))
  WITH CHECK (is_admin() AND is_company_member(company_id));

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_shift_types_updated_at
  BEFORE UPDATE ON public.shift_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_shifts_updated_at
  BEFORE UPDATE ON public.employee_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_areas_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_type_config_updated_at
  BEFORE UPDATE ON public.contract_type_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dotation_item_types_updated_at
  BEFORE UPDATE ON public.dotation_item_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();