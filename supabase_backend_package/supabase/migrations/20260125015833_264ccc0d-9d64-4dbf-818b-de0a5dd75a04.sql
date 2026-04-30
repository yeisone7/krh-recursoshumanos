-- Enum para origen de la incapacidad
CREATE TYPE public.incapacity_origin AS ENUM ('comun', 'laboral');

-- Enum para estado de recobro
CREATE TYPE public.recovery_status AS ENUM ('pendiente', 'radicado', 'en_tramite', 'aprobado', 'rechazado', 'pagado');

-- Tabla principal de incapacidades
CREATE TABLE public.employee_incapacities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Información básica
  origin incapacity_origin NOT NULL DEFAULT 'comun',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  
  -- Información clínica
  cie10_code TEXT,
  diagnosis TEXT NOT NULL,
  treating_doctor TEXT,
  certificate_number TEXT,
  medical_entity TEXT, -- Entidad que expide el certificado
  
  -- Entidades responsables del pago (leídas de employee_social_security)
  eps_name TEXT,
  arl_name TEXT,
  afp_name TEXT,
  
  -- Cálculo de pagos según normativa colombiana
  employer_days INTEGER NOT NULL DEFAULT 0, -- Días 1-2 (origen común) o 0 (origen laboral)
  eps_days INTEGER NOT NULL DEFAULT 0, -- Días 3-180 (origen común)
  arl_days INTEGER NOT NULL DEFAULT 0, -- Todos los días (origen laboral)
  afp_days INTEGER NOT NULL DEFAULT 0, -- Días 181-540 (origen común)
  
  -- Montos calculados
  daily_base_salary NUMERIC(12,2), -- IBC diario
  employer_amount NUMERIC(12,2) DEFAULT 0, -- 100% primeros 2 días
  eps_amount NUMERIC(12,2) DEFAULT 0, -- 66.67% días 3-180
  arl_amount NUMERIC(12,2) DEFAULT 0, -- 100% origen laboral
  afp_amount NUMERIC(12,2) DEFAULT 0, -- 50% días 181+
  total_amount NUMERIC(12,2) DEFAULT 0,
  
  -- Gestión de recobro
  recovery_status recovery_status NOT NULL DEFAULT 'pendiente',
  filing_date DATE, -- Fecha de radicación ante EPS/ARL
  filing_number TEXT, -- Número de radicado
  expected_payment_date DATE,
  actual_payment_date DATE,
  recovered_amount NUMERIC(12,2) DEFAULT 0,
  recovery_notes TEXT,
  
  -- Prórroga
  is_extension BOOLEAN NOT NULL DEFAULT false,
  parent_incapacity_id UUID REFERENCES public.employee_incapacities(id),
  extension_number INTEGER DEFAULT 0,
  
  -- Documentos
  certificate_url TEXT, -- Certificado de incapacidad
  clinical_history_url TEXT, -- Historia clínica
  
  -- Examen de reintegro
  requires_reintegration_exam BOOLEAN NOT NULL DEFAULT false,
  reintegration_exam_id UUID REFERENCES public.medical_exams(id),
  
  -- Metadatos
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_incapacities_employee ON public.employee_incapacities(employee_id);
CREATE INDEX idx_incapacities_company ON public.employee_incapacities(company_id);
CREATE INDEX idx_incapacities_dates ON public.employee_incapacities(start_date, end_date);
CREATE INDEX idx_incapacities_recovery_status ON public.employee_incapacities(recovery_status);
CREATE INDEX idx_incapacities_parent ON public.employee_incapacities(parent_incapacity_id) WHERE parent_incapacity_id IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.employee_incapacities ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin and RRHH can manage incapacities"
  ON public.employee_incapacities
  FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company incapacities"
  ON public.employee_incapacities
  FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- Trigger para updated_at
CREATE TRIGGER update_employee_incapacities_updated_at
  BEFORE UPDATE ON public.employee_incapacities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_incapacities;