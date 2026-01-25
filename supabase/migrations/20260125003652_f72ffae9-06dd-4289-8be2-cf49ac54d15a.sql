-- =====================================================
-- FASE 1: NUEVAS TABLAS NORMALIZADAS PARA EMPLEADOS
-- Modelo relacional completo según requerimiento
-- =====================================================

-- Primero, crear nuevos enums necesarios
CREATE TYPE public.gender_type AS ENUM ('M', 'F', 'O');
CREATE TYPE public.marital_status_type AS ENUM ('soltero', 'casado', 'union_libre', 'divorciado', 'viudo');
CREATE TYPE public.blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE public.account_type AS ENUM ('ahorros', 'corriente');
CREATE TYPE public.risk_level AS ENUM ('I', 'II', 'III', 'IV', 'V');
CREATE TYPE public.certification_type AS ENUM ('licencia_conduccion', 'manejo_defensivo', 'manipulacion_alimentos', 'psicosensometrico', 'bpm', 'trabajo_alturas', 'primeros_auxilios', 'otro');
CREATE TYPE public.vaccine_type AS ENUM ('TT', 'HA', 'HB', 'FA', 'TIFO', 'COVID', 'INFLUENZA', 'otro');
CREATE TYPE public.payroll_type AS ENUM ('quincenal', 'mensual');
CREATE TYPE public.employee_document_type AS ENUM ('contrato', 'hoja_vida', 'cedula', 'certificado_laboral', 'certificado_estudio', 'antecedentes', 'carta_residencia', 'carta_banco', 'otro');
CREATE TYPE public.link_type AS ENUM ('indefinido', 'fijo', 'obra_labor', 'aprendizaje', 'servicios', 'temporal');

-- =====================================================
-- A. EMPLEADOS (CORE) - Identidad básica
-- =====================================================
CREATE TABLE public.employees_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificación
    document_type public.document_type NOT NULL DEFAULT 'CC',
    document_number TEXT NOT NULL,
    document_issue_city TEXT,
    document_issue_date DATE,
    
    -- Nombres
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    second_last_name TEXT,
    
    -- Nacimiento
    birth_country TEXT DEFAULT 'Colombia',
    birth_department TEXT,
    birth_city TEXT,
    birth_date DATE,
    
    -- Características
    gender public.gender_type,
    blood_type public.blood_type,
    marital_status public.marital_status_type,
    
    -- Estado
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(company_id, document_type, document_number)
);

-- =====================================================
-- B. DIRECCIÓN Y CONTACTO
-- =====================================================
CREATE TABLE public.employee_contact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    
    -- Residencia
    residence_department TEXT,
    residence_city TEXT,
    residence_address TEXT,
    residence_neighborhood TEXT,
    
    -- Contacto
    email TEXT,
    personal_email TEXT,
    phone TEXT,
    mobile TEXT,
    
    -- Emergencia
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    
    -- Carta residencia
    residence_letter_url TEXT,
    residence_letter_expiry DATE,
    
    -- Vigencia (para historial)
    is_current BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- C. GRUPO FAMILIAR
-- =====================================================
CREATE TABLE public.employee_family (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    
    -- Cónyuge
    spouse_name TEXT,
    spouse_gender public.gender_type,
    spouse_birth_date DATE,
    spouse_works BOOLEAN DEFAULT false,
    
    -- Hijos
    children_count INTEGER DEFAULT 0,
    
    -- Vigencia
    is_current BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- D. INFORMACIÓN LABORAL (contexto empresa)
-- =====================================================
CREATE TABLE public.employee_work_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Ubicación organizacional
    operation_center_id UUID REFERENCES public.operation_centers(id),
    cost_center TEXT,
    area_id UUID REFERENCES public.areas(id),
    position_id UUID REFERENCES public.positions(id),
    position_name TEXT NOT NULL, -- Redundante pero útil para histórico
    
    -- Ubicación física
    work_city TEXT,
    
    -- Fechas
    hire_date DATE NOT NULL,
    termination_date DATE,
    
    -- Tipo vinculación
    link_type public.link_type NOT NULL DEFAULT 'indefinido',
    
    -- Observaciones
    observations TEXT,
    
    -- Vigencia
    is_current BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- E. SEGURIDAD SOCIAL Y RIESGO
-- =====================================================
CREATE TABLE public.employee_social_security (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    
    -- Nivel de riesgo
    risk_level public.risk_level,
    
    -- Entidades
    arl TEXT,
    eps TEXT,
    afp TEXT, -- Fondo de pensiones
    ccf TEXT, -- Caja de compensación
    afc TEXT, -- Ahorro fomento construcción
    ips TEXT, -- IPS preferida
    
    -- Vigencia
    is_current BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- F. INFORMACIÓN BANCARIA
-- =====================================================
CREATE TABLE public.employee_bank_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    
    bank_name TEXT,
    account_type public.account_type,
    account_number TEXT,
    bank_letter_url TEXT,
    account_registered BOOLEAN DEFAULT false,
    
    -- Vigencia
    is_current BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- G. DOCUMENTOS DEL EMPLEADO
-- =====================================================
CREATE TABLE public.employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    document_type public.employee_document_type NOT NULL,
    document_name TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    
    observations TEXT,
    
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- H. CERTIFICACIONES Y LICENCIAS
-- =====================================================
CREATE TABLE public.employee_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    
    certification_type public.certification_type NOT NULL,
    certification_name TEXT, -- Para tipo 'otro'
    
    issue_date DATE,
    expiry_date DATE,
    
    -- Licencia de conducción específico
    license_category TEXT, -- A1, A2, B1, B2, C1, C2, C3
    
    document_url TEXT,
    applies_to_position BOOLEAN DEFAULT false,
    
    is_valid BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- I. VACUNACIÓN
-- =====================================================
CREATE TABLE public.employee_vaccinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    
    vaccine_type public.vaccine_type NOT NULL,
    vaccine_name TEXT, -- Para tipo 'otro'
    
    dose_number INTEGER NOT NULL DEFAULT 1,
    application_date DATE NOT NULL,
    next_dose_date DATE,
    
    document_url TEXT,
    provider TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- J. JORNADA Y TURNOS
-- =====================================================
CREATE TABLE public.employee_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    
    payroll_type public.payroll_type NOT NULL DEFAULT 'quincenal',
    shift_type_id UUID REFERENCES public.shift_types(id),
    is_office_schedule BOOLEAN DEFAULT true,
    rest_day TEXT, -- 'domingo', 'sabado', etc.
    
    -- Vigencia
    is_current BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_employees_v2_company ON public.employees_v2(company_id);
CREATE INDEX idx_employees_v2_document ON public.employees_v2(document_type, document_number);
CREATE INDEX idx_employees_v2_active ON public.employees_v2(is_active);

CREATE INDEX idx_employee_contact_employee ON public.employee_contact(employee_id);
CREATE INDEX idx_employee_contact_current ON public.employee_contact(employee_id, is_current);

CREATE INDEX idx_employee_family_employee ON public.employee_family(employee_id);

CREATE INDEX idx_employee_work_info_employee ON public.employee_work_info(employee_id);
CREATE INDEX idx_employee_work_info_company ON public.employee_work_info(company_id);
CREATE INDEX idx_employee_work_info_center ON public.employee_work_info(operation_center_id);
CREATE INDEX idx_employee_work_info_current ON public.employee_work_info(employee_id, is_current);

CREATE INDEX idx_employee_social_security_employee ON public.employee_social_security(employee_id);
CREATE INDEX idx_employee_bank_info_employee ON public.employee_bank_info(employee_id);
CREATE INDEX idx_employee_documents_employee ON public.employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON public.employee_documents(document_type);
CREATE INDEX idx_employee_certifications_employee ON public.employee_certifications(employee_id);
CREATE INDEX idx_employee_certifications_expiry ON public.employee_certifications(expiry_date);
CREATE INDEX idx_employee_vaccinations_employee ON public.employee_vaccinations(employee_id);
CREATE INDEX idx_employee_schedule_employee ON public.employee_schedule(employee_id);

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================
CREATE TRIGGER update_employees_v2_updated_at BEFORE UPDATE ON public.employees_v2
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_contact_updated_at BEFORE UPDATE ON public.employee_contact
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_family_updated_at BEFORE UPDATE ON public.employee_family
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_work_info_updated_at BEFORE UPDATE ON public.employee_work_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_social_security_updated_at BEFORE UPDATE ON public.employee_social_security
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_bank_info_updated_at BEFORE UPDATE ON public.employee_bank_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON public.employee_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_certifications_updated_at BEFORE UPDATE ON public.employee_certifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_vaccinations_updated_at BEFORE UPDATE ON public.employee_vaccinations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_schedule_updated_at BEFORE UPDATE ON public.employee_schedule
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENABLE RLS EN TODAS LAS TABLAS
-- =====================================================
ALTER TABLE public.employees_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_work_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_social_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_bank_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedule ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCIÓN HELPER PARA ACCESO A EMPLEADOS V2
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_employee_v2_access(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees_v2 e
    LEFT JOIN public.employee_work_info ewi ON ewi.employee_id = e.id AND ewi.is_current = true
    WHERE e.id = _employee_id
      AND (
        public.is_company_member(e.company_id)
        OR public.has_center_access(ewi.operation_center_id)
      )
  )
$$;

-- =====================================================
-- RLS POLICIES - EMPLOYEES_V2 (CORE)
-- =====================================================
CREATE POLICY "Users can view accessible employees v2"
ON public.employees_v2
FOR SELECT
USING (is_admin() OR is_company_member(company_id));

CREATE POLICY "Admin and RRHH can create employees v2"
ON public.employees_v2
FOR INSERT
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Admin and RRHH can update employees v2"
ON public.employees_v2
FOR UPDATE
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Admin can delete employees v2"
ON public.employees_v2
FOR DELETE
USING (is_admin() AND is_company_member(company_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_CONTACT
-- =====================================================
CREATE POLICY "Users can view accessible employee contact"
ON public.employee_contact
FOR SELECT
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee contact"
ON public.employee_contact
FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_FAMILY
-- =====================================================
CREATE POLICY "Users can view accessible employee family"
ON public.employee_family
FOR SELECT
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee family"
ON public.employee_family
FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_WORK_INFO
-- =====================================================
CREATE POLICY "Users can view accessible employee work info"
ON public.employee_work_info
FOR SELECT
USING (is_admin() OR is_company_member(company_id));

CREATE POLICY "Admin and RRHH can manage employee work info"
ON public.employee_work_info
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_SOCIAL_SECURITY
-- =====================================================
CREATE POLICY "Users can view accessible employee social security"
ON public.employee_social_security
FOR SELECT
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee social security"
ON public.employee_social_security
FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_BANK_INFO
-- =====================================================
CREATE POLICY "Users can view accessible employee bank info"
ON public.employee_bank_info
FOR SELECT
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee bank info"
ON public.employee_bank_info
FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_DOCUMENTS
-- =====================================================
CREATE POLICY "Users can view accessible employee documents"
ON public.employee_documents
FOR SELECT
USING (is_admin() OR is_company_member(company_id));

CREATE POLICY "Admin and RRHH can manage employee documents"
ON public.employee_documents
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_CERTIFICATIONS
-- =====================================================
CREATE POLICY "Users can view accessible employee certifications"
ON public.employee_certifications
FOR SELECT
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee certifications"
ON public.employee_certifications
FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_VACCINATIONS
-- =====================================================
CREATE POLICY "Users can view accessible employee vaccinations"
ON public.employee_vaccinations
FOR SELECT
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee vaccinations"
ON public.employee_vaccinations
FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

-- =====================================================
-- RLS POLICIES - EMPLOYEE_SCHEDULE
-- =====================================================
CREATE POLICY "Users can view accessible employee schedule"
ON public.employee_schedule
FOR SELECT
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee schedule"
ON public.employee_schedule
FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));