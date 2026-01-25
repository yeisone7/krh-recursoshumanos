-- =============================================
-- LEAVE TYPES ENUM
-- =============================================
CREATE TYPE public.leave_type AS ENUM (
  'calamidad_domestica',
  'cita_medica',
  'licencia_maternidad',
  'licencia_paternidad',
  'licencia_luto',
  'permiso_sindical',
  'permiso_estudio',
  'permiso_personal',
  'licencia_no_remunerada',
  'otro'
);

CREATE TYPE public.leave_request_status AS ENUM (
  'pendiente',
  'aprobado',
  'rechazado',
  'cancelado'
);

CREATE TYPE public.leave_duration_type AS ENUM (
  'dias_completos',
  'medio_dia',
  'horas'
);

-- =============================================
-- LEAVE TYPE CONFIGURATION TABLE
-- =============================================
CREATE TABLE public.leave_type_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  max_days_per_year INTEGER,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  requires_document BOOLEAN NOT NULL DEFAULT false,
  document_description TEXT,
  min_days_advance INTEGER DEFAULT 0,
  allows_half_day BOOLEAN DEFAULT true,
  allows_hours BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, leave_type)
);

-- =============================================
-- LEAVE BALANCES TABLE
-- =============================================
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  year INTEGER NOT NULL,
  entitled_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  pending_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  available_days NUMERIC(5,2) GENERATED ALWAYS AS (entitled_days - used_days - pending_days) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type, year)
);

-- =============================================
-- LEAVE REQUESTS TABLE
-- =============================================
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  duration_type public.leave_duration_type NOT NULL DEFAULT 'dias_completos',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_days NUMERIC(5,2) NOT NULL,
  total_hours NUMERIC(5,2),
  reason TEXT NOT NULL,
  document_url TEXT,
  document_name TEXT,
  status public.leave_request_status NOT NULL DEFAULT 'pendiente',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewer_name TEXT,
  review_notes TEXT,
  rejection_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX idx_leave_requests_company ON public.leave_requests(company_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX idx_leave_balances_employee ON public.leave_balances(employee_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.leave_type_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Leave Type Config Policies
CREATE POLICY "Admin can manage leave type config"
ON public.leave_type_config FOR ALL
USING (is_admin() AND is_company_member(company_id))
WITH CHECK (is_admin() AND is_company_member(company_id));

CREATE POLICY "Users can view leave type config"
ON public.leave_type_config FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- Leave Balances Policies
CREATE POLICY "Admin and RRHH can manage leave balances"
ON public.leave_balances FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company leave balances"
ON public.leave_balances FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- Leave Requests Policies
CREATE POLICY "Admin and RRHH can manage leave requests"
ON public.leave_requests FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company leave requests"
ON public.leave_requests FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_leave_type_config_updated_at
BEFORE UPDATE ON public.leave_type_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at
BEFORE UPDATE ON public.leave_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INSERT DEFAULT LEAVE TYPES FOR NEW COMPANIES
-- =============================================
CREATE OR REPLACE FUNCTION public.insert_default_leave_types()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leave_type_config (company_id, leave_type, display_name, description, max_days_per_year, is_paid, requires_document, min_days_advance, color)
  VALUES 
    (NEW.id, 'calamidad_domestica', 'Calamidad Doméstica', 'Permiso por situaciones graves que afectan al trabajador o su familia', 5, true, true, 0, '#EF4444'),
    (NEW.id, 'cita_medica', 'Cita Médica', 'Permiso para asistir a citas médicas programadas', NULL, true, true, 1, '#3B82F6'),
    (NEW.id, 'licencia_maternidad', 'Licencia de Maternidad', 'Licencia legal de 18 semanas para madres', 126, true, true, 30, '#EC4899'),
    (NEW.id, 'licencia_paternidad', 'Licencia de Paternidad', 'Licencia legal de 2 semanas para padres', 14, true, true, 0, '#8B5CF6'),
    (NEW.id, 'licencia_luto', 'Licencia de Luto', 'Licencia por fallecimiento de familiar cercano', 5, true, true, 0, '#6B7280'),
    (NEW.id, 'permiso_sindical', 'Permiso Sindical', 'Permiso para actividades sindicales', NULL, true, false, 3, '#F59E0B'),
    (NEW.id, 'permiso_estudio', 'Permiso de Estudio', 'Permiso para actividades académicas', NULL, false, true, 5, '#10B981'),
    (NEW.id, 'permiso_personal', 'Permiso Personal', 'Permiso para asuntos personales', 3, false, false, 2, '#6366F1'),
    (NEW.id, 'licencia_no_remunerada', 'Licencia No Remunerada', 'Licencia sin goce de salario', NULL, false, true, 15, '#78716C'),
    (NEW.id, 'otro', 'Otro Permiso', 'Otros tipos de permisos no categorizados', NULL, false, false, 0, '#94A3B8')
  ON CONFLICT (company_id, leave_type) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER insert_company_leave_types
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.insert_default_leave_types();