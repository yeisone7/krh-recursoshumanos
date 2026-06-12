-- Consolidado de migraciones del backend actual.
-- Recomendado: usar supabase db push con la carpeta migrations.
-- Alternativa: ejecutar este archivo completo en SQL Editor de un proyecto vacío.


-- ============================================================
-- MIGRATION: 20260124141210_8d00f48b-0125-4625-8ac9-aa91c8b4f1ed.sql
-- ============================================================
-- =============================================
-- KRH: Sistema de RRHH Multi-empresa
-- =============================================

-- 1. Crear enum para roles de aplicación
CREATE TYPE public.app_role AS ENUM ('admin', 'rrhh', 'psicologo', 'jefe_area', 'auditor');

-- 2. Crear enum para tipos de documento
CREATE TYPE public.document_type AS ENUM ('CC', 'CE', 'TI', 'PA', 'PEP');

-- 3. Crear enum para tipos de contrato
CREATE TYPE public.contract_type AS ENUM ('indefinido', 'fijo', 'obra_labor', 'aprendizaje', 'servicios');

-- 4. Crear enum para estados de empleado
CREATE TYPE public.employee_status AS ENUM ('active', 'suspended', 'retired');

-- 5. Crear enum para tipos de examen médico
CREATE TYPE public.exam_type AS ENUM ('ingreso', 'periodico', 'egreso', 'reintegro');

-- 6. Crear enum para resultados de examen
CREATE TYPE public.exam_result AS ENUM ('apto', 'apto_restricciones', 'no_apto', 'pendiente');

-- 7. Crear enum para tipos de dotación
CREATE TYPE public.dotation_item_type AS ENUM (
  'uniforme_camisa', 'uniforme_pantalon', 'uniforme_conjunto', 
  'calzado_seguridad', 'calzado_dielectrico', 'casco', 'guantes', 
  'gafas_seguridad', 'protector_auditivo', 'arnes', 'overol', 
  'chaleco_reflectivo', 'impermeable', 'otros'
);

-- =============================================
-- TABLA DE ROLES DE USUARIO
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE EMPRESAS
-- =============================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nit TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE ASIGNACIÓN USUARIO-EMPRESA
-- =============================================
CREATE TABLE public.user_company_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

ALTER TABLE public.user_company_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE CENTROS DE OPERACIÓN
-- =============================================
CREATE TABLE public.operation_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  department TEXT,
  phone TEXT,
  manager_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operation_centers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE ASIGNACIÓN USUARIO-CENTRO
-- =============================================
CREATE TABLE public.user_center_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  operation_center_id UUID REFERENCES public.operation_centers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, operation_center_id)
);

ALTER TABLE public.user_center_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE EMPLEADOS
-- =============================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  operation_center_id UUID REFERENCES public.operation_centers(id) ON DELETE SET NULL,
  
  -- Datos personales
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  document_type document_type NOT NULL DEFAULT 'CC',
  document_number TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  blood_type TEXT,
  marital_status TEXT,
  
  -- Datos de contacto
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  department TEXT,
  
  -- Contacto de emergencia
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Datos laborales
  position TEXT NOT NULL,
  department_area TEXT,
  hire_date DATE NOT NULL,
  contract_type contract_type NOT NULL DEFAULT 'indefinido',
  shift_type TEXT,
  salary NUMERIC(12,2),
  
  -- Datos adicionales
  education_level TEXT,
  profession TEXT,
  eps TEXT,
  afp TEXT,
  arl TEXT,
  caja_compensacion TEXT,
  
  -- Estado
  status employee_status NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (company_id, document_type, document_number)
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE CONTRATOS
-- =============================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  
  contract_type contract_type NOT NULL,
  contract_number TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Salario y compensación
  salary NUMERIC(12,2) NOT NULL,
  salary_type TEXT DEFAULT 'mensual',
  transport_allowance NUMERIC(12,2) DEFAULT 0,
  other_allowances NUMERIC(12,2) DEFAULT 0,
  
  -- Período de prueba
  trial_period_days INTEGER DEFAULT 0,
  trial_end_date DATE,
  
  -- Ubicación
  work_city TEXT,
  work_address TEXT,
  
  -- Estado
  is_terminated BOOLEAN DEFAULT false,
  termination_date DATE,
  termination_reason TEXT,
  
  -- Cláusulas
  has_confidentiality_clause BOOLEAN DEFAULT false,
  has_non_compete_clause BOOLEAN DEFAULT false,
  special_clauses TEXT,
  
  -- Documento
  document_url TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE PRÓRROGAS DE CONTRATO
-- =============================================
CREATE TABLE public.contract_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  
  extension_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  new_salary NUMERIC(12,2),
  document_url TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_extensions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE ENTREGAS DE DOTACIÓN
-- =============================================
CREATE TABLE public.dotation_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  
  item_type dotation_item_type NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  
  delivery_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  
  delivered_by TEXT,
  received_by TEXT,
  signature_url TEXT,
  document_url TEXT,
  observations TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dotation_deliveries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA DE EXÁMENES MÉDICOS
-- =============================================
CREATE TABLE public.medical_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  
  exam_type exam_type NOT NULL,
  exam_date DATE NOT NULL,
  expiration_date DATE,
  
  result exam_result NOT NULL DEFAULT 'pendiente',
  concept TEXT NOT NULL,
  restrictions TEXT,
  
  provider TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  
  document_url TEXT,
  observations TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_exams ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCIONES HELPER DE SEGURIDAD
-- =============================================

-- Función para verificar si el usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Función para verificar si el usuario es admin o RRHH
CREATE OR REPLACE FUNCTION public.is_admin_or_rrhh()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rrhh')
$$;

-- Función para verificar si el usuario es auditor
CREATE OR REPLACE FUNCTION public.is_auditor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'auditor')
$$;

-- Función para verificar si el usuario es psicólogo
CREATE OR REPLACE FUNCTION public.is_psicologo()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'psicologo')
$$;

-- Función para obtener las empresas del usuario
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_company_assignments
  WHERE user_id = auth.uid()
$$;

-- Función para verificar si el usuario pertenece a una empresa
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_assignments
    WHERE user_id = auth.uid()
      AND company_id = _company_id
  )
$$;

-- Función para obtener los centros del usuario
CREATE OR REPLACE FUNCTION public.get_user_center_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT operation_center_id
  FROM public.user_center_assignments
  WHERE user_id = auth.uid()
$$;

-- Función para verificar si el usuario tiene acceso a un centro
CREATE OR REPLACE FUNCTION public.has_center_access(_center_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_center_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.operation_center_id = _center_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.operation_centers oc
    JOIN public.user_company_assignments ucp ON ucp.company_id = oc.company_id
    WHERE oc.id = _center_id
      AND ucp.user_id = auth.uid()
  )
$$;

-- Función para verificar acceso a empleado
CREATE OR REPLACE FUNCTION public.has_employee_access(_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = _employee_id
      AND (
        public.is_company_member(e.company_id)
        OR public.has_center_access(e.operation_center_id)
      )
  )
$$;

-- =============================================
-- POLÍTICAS RLS PARA user_roles
-- =============================================
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- POLÍTICAS RLS PARA companies
-- =============================================
CREATE POLICY "Users can view assigned companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_company_member(id)
  );

CREATE POLICY "Admins can manage companies"
  ON public.companies
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================
-- POLÍTICAS RLS PARA user_company_assignments
-- =============================================
CREATE POLICY "Admins can manage company assignments"
  ON public.user_company_assignments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own company assignments"
  ON public.user_company_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- POLÍTICAS RLS PARA operation_centers
-- =============================================
CREATE POLICY "Users can view accessible centers"
  ON public.operation_centers
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_company_member(company_id)
    OR public.has_center_access(id)
  );

CREATE POLICY "Admin and RRHH can manage centers"
  ON public.operation_centers
  FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_rrhh()
    AND public.is_company_member(company_id)
  )
  WITH CHECK (
    public.is_admin_or_rrhh()
    AND public.is_company_member(company_id)
  );

-- =============================================
-- POLÍTICAS RLS PARA user_center_assignments
-- =============================================
CREATE POLICY "Admins can manage center assignments"
  ON public.user_center_assignments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own center assignments"
  ON public.user_center_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- POLÍTICAS RLS PARA employees
-- =============================================
CREATE POLICY "Users can view accessible employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_company_member(company_id)
    OR public.has_center_access(operation_center_id)
  );

CREATE POLICY "Admin and RRHH can create employees"
  ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_or_rrhh()
    AND public.is_company_member(company_id)
  );

CREATE POLICY "Admin and RRHH can update employees"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_rrhh()
    AND public.is_company_member(company_id)
  )
  WITH CHECK (
    public.is_admin_or_rrhh()
    AND public.is_company_member(company_id)
  );

CREATE POLICY "Admin can delete employees"
  ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    AND public.is_company_member(company_id)
  );

-- =============================================
-- POLÍTICAS RLS PARA contracts
-- =============================================
CREATE POLICY "Users can view accessible contracts"
  ON public.contracts
  FOR SELECT
  TO authenticated
  USING (
    public.has_employee_access(employee_id)
  );

CREATE POLICY "Admin and RRHH can manage contracts"
  ON public.contracts
  FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_rrhh()
    AND public.has_employee_access(employee_id)
  )
  WITH CHECK (
    public.is_admin_or_rrhh()
    AND public.has_employee_access(employee_id)
  );

-- =============================================
-- POLÍTICAS RLS PARA contract_extensions
-- =============================================
CREATE POLICY "Users can view accessible extensions"
  ON public.contract_extensions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
        AND public.has_employee_access(c.employee_id)
    )
  );

CREATE POLICY "Admin and RRHH can manage extensions"
  ON public.contract_extensions
  FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_rrhh()
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
        AND public.has_employee_access(c.employee_id)
    )
  )
  WITH CHECK (
    public.is_admin_or_rrhh()
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
        AND public.has_employee_access(c.employee_id)
    )
  );

-- =============================================
-- POLÍTICAS RLS PARA dotation_deliveries
-- =============================================
CREATE POLICY "Users can view accessible dotation"
  ON public.dotation_deliveries
  FOR SELECT
  TO authenticated
  USING (
    public.has_employee_access(employee_id)
  );

CREATE POLICY "Admin and RRHH can manage dotation"
  ON public.dotation_deliveries
  FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_rrhh()
    AND public.has_employee_access(employee_id)
  )
  WITH CHECK (
    public.is_admin_or_rrhh()
    AND public.has_employee_access(employee_id)
  );

-- =============================================
-- POLÍTICAS RLS PARA medical_exams
-- =============================================
CREATE POLICY "Users can view accessible exams"
  ON public.medical_exams
  FOR SELECT
  TO authenticated
  USING (
    public.has_employee_access(employee_id)
  );

CREATE POLICY "Admin RRHH and Psicologo can manage exams"
  ON public.medical_exams
  FOR ALL
  TO authenticated
  USING (
    (public.is_admin_or_rrhh() OR public.is_psicologo())
    AND public.has_employee_access(employee_id)
  )
  WITH CHECK (
    (public.is_admin_or_rrhh() OR public.is_psicologo())
    AND public.has_employee_access(employee_id)
  );

-- =============================================
-- TRIGGER PARA UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_operation_centers_updated_at
  BEFORE UPDATE ON public.operation_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dotation_deliveries_updated_at
  BEFORE UPDATE ON public.dotation_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_exams_updated_at
  BEFORE UPDATE ON public.medical_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260124141309_10376a8b-46d7-4f04-aadb-b8197df41fd8.sql
-- ============================================================
-- Fix: Set search_path for update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- MIGRATION: 20260124144602_8d99a1d5-2681-467d-9f3d-43e502eacdbc.sql
-- ============================================================
-- Create audit_logs table for tracking all critical actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  company_id UUID REFERENCES public.companies(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins and auditors can view all logs for their company
CREATE POLICY "Admins and auditors can view company logs"
ON public.audit_logs
FOR SELECT
USING (
  (is_admin() OR is_auditor()) 
  AND (company_id IS NULL OR is_company_member(company_id))
);

-- Users can insert their own logs (needed for client-side logging)
CREATE POLICY "Users can insert their own logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Registro de auditoría para todas las acciones críticas del sistema';

-- ============================================================
-- MIGRATION: 20260124174219_c14ca072-f58c-4725-b348-e8d7052bcc1b.sql
-- ============================================================
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- RLS Policies for documents bucket

-- Policy: Users can view documents from their company's employees
CREATE POLICY "Users can view company documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (
    -- Extract company_id from path structure: documents/{company_id}/{entity_type}/{entity_id}/{filename}
    EXISTS (
      SELECT 1 FROM public.user_company_assignments uca
      WHERE uca.user_id = auth.uid()
        AND uca.company_id::text = (storage.foldername(name))[1]
    )
    OR public.is_admin()
  )
);

-- Policy: Admin and RRHH can upload documents
CREATE POLICY "Admin and RRHH can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_admin_or_rrhh()
  AND EXISTS (
    SELECT 1 FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Admin and RRHH can update documents
CREATE POLICY "Admin and RRHH can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND public.is_admin_or_rrhh()
  AND EXISTS (
    SELECT 1 FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Only admin can delete documents (soft delete preferred, but allow for cleanup)
CREATE POLICY "Admin can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND public.is_admin()
  AND EXISTS (
    SELECT 1 FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
);

-- Create a documents metadata table for versioning and audit trail
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'contract', 'contract_extension', 'medical_exam', 'dotation'
  entity_id UUID NOT NULL,
  company_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents from their company
CREATE POLICY "Users can view company document versions"
ON public.document_versions FOR SELECT
USING (
  public.is_company_member(company_id)
  OR public.is_admin()
);

-- Policy: Admin and RRHH can insert document versions
CREATE POLICY "Admin and RRHH can insert document versions"
ON public.document_versions FOR INSERT
WITH CHECK (
  public.is_admin_or_rrhh()
  AND public.is_company_member(company_id)
);

-- Policy: Admin and RRHH can update document versions (for marking as non-current)
CREATE POLICY "Admin and RRHH can update document versions"
ON public.document_versions FOR UPDATE
USING (
  public.is_admin_or_rrhh()
  AND public.is_company_member(company_id)
);

-- Create index for fast lookups
CREATE INDEX idx_document_versions_entity ON public.document_versions(entity_type, entity_id);
CREATE INDEX idx_document_versions_company ON public.document_versions(company_id);
CREATE INDEX idx_document_versions_current ON public.document_versions(entity_type, entity_id, is_current) WHERE is_current = true;

-- ============================================================
-- MIGRATION: 20260124175721_03addd1b-02e0-48ef-a7a1-acc71bee0ec0.sql
-- ============================================================
-- Create enum for vacancy status
CREATE TYPE public.vacancy_status AS ENUM ('open', 'in_process', 'closed', 'cancelled');

-- Create enum for vacancy type (recruitment type)
CREATE TYPE public.vacancy_type AS ENUM ('internal', 'external', 'both');

-- Create enum for vacancy reason
CREATE TYPE public.vacancy_reason AS ENUM ('new_position', 'replacement', 'growth', 'temporary', 'other');

-- Create enum for candidate status
CREATE TYPE public.candidate_status AS ENUM (
  'applied',
  'in_interview',
  'in_psycho_test',
  'in_technical_test',
  'in_validation',
  'in_medical',
  'selected',
  'not_selected',
  'withdrawn',
  'hired'
);

-- Create enum for selection step type
CREATE TYPE public.selection_step_type AS ENUM (
  'initial_interview',
  'psycho_test',
  'technical_test',
  'background_check',
  'academic_validation',
  'reference_check',
  'financial_check',
  'medical_exam',
  'final_interview',
  'offer'
);

-- Create enum for selection step status
CREATE TYPE public.selection_step_status AS ENUM ('pending', 'scheduled', 'completed', 'passed', 'failed', 'skipped');

-- =====================
-- VACANCIES TABLE
-- =====================
CREATE TABLE public.vacancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id UUID REFERENCES public.operation_centers(id) ON DELETE SET NULL,
  
  -- Position details
  position_title TEXT NOT NULL,
  department_area TEXT,
  shift_type TEXT DEFAULT 'oficina', -- oficina, turnos, mixto
  positions_count INTEGER NOT NULL DEFAULT 1,
  
  -- Vacancy details
  vacancy_type public.vacancy_type NOT NULL DEFAULT 'external',
  vacancy_reason public.vacancy_reason NOT NULL DEFAULT 'new_position',
  reason_details TEXT,
  
  -- Compensation
  salary_range_min NUMERIC,
  salary_range_max NUMERIC,
  salary_type TEXT DEFAULT 'mensual',
  includes_transport BOOLEAN DEFAULT true,
  other_benefits TEXT,
  
  -- Description
  job_description TEXT,
  requirements TEXT,
  experience_years INTEGER DEFAULT 0,
  education_level TEXT,
  
  -- Assignment
  psychologist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hiring_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dates
  open_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_close_date DATE,
  actual_close_date DATE,
  
  -- Publication
  publication_platforms TEXT[], -- array of platform names
  
  -- Status
  status public.vacancy_status NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  observations TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vacancies
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vacancies
CREATE POLICY "Users can view vacancies from their company"
ON public.vacancies FOR SELECT
USING (
  public.is_company_member(company_id)
  OR public.is_admin()
);

CREATE POLICY "Admin RRHH and Psicologo can manage vacancies"
ON public.vacancies FOR ALL
USING (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND public.is_company_member(company_id)
)
WITH CHECK (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND public.is_company_member(company_id)
);

-- Create indexes for vacancies
CREATE INDEX idx_vacancies_company ON public.vacancies(company_id);
CREATE INDEX idx_vacancies_status ON public.vacancies(status);
CREATE INDEX idx_vacancies_center ON public.vacancies(operation_center_id);

-- Trigger for updated_at
CREATE TRIGGER update_vacancies_updated_at
  BEFORE UPDATE ON public.vacancies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- CANDIDATES TABLE
-- =====================
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  
  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  document_type public.document_type NOT NULL DEFAULT 'CC',
  document_number TEXT NOT NULL,
  
  -- Contact
  email TEXT,
  phone TEXT,
  mobile TEXT,
  
  -- Location
  address TEXT,
  city TEXT,
  department TEXT,
  
  -- Demographics
  birth_date DATE,
  gender TEXT,
  
  -- Professional
  education_level TEXT,
  profession TEXT,
  experience_years INTEGER DEFAULT 0,
  current_company TEXT,
  current_position TEXT,
  salary_expectation NUMERIC,
  
  -- Application
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT, -- how they found the vacancy
  cv_url TEXT,
  
  -- Status tracking
  status public.candidate_status NOT NULL DEFAULT 'applied',
  current_step public.selection_step_type,
  
  -- Evaluation
  general_notes TEXT,
  strengths TEXT,
  weaknesses TEXT,
  final_score NUMERIC,
  final_concept TEXT,
  
  -- Result
  is_selected BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- if hired
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on candidates
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidates
CREATE POLICY "Users can view candidates from their company vacancies"
ON public.candidates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
  OR public.is_admin()
);

CREATE POLICY "Admin RRHH and Psicologo can manage candidates"
ON public.candidates FOR ALL
USING (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND EXISTS (
    SELECT 1 FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
)
WITH CHECK (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND EXISTS (
    SELECT 1 FROM public.vacancies v
    WHERE v.id = candidates.vacancy_id
      AND public.is_company_member(v.company_id)
  )
);

-- Create indexes for candidates
CREATE INDEX idx_candidates_vacancy ON public.candidates(vacancy_id);
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_document ON public.candidates(document_number);

-- Trigger for updated_at
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- SELECTION STEPS TABLE
-- =====================
CREATE TABLE public.selection_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  
  -- Step details
  step_type public.selection_step_type NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 1,
  
  -- Scheduling
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  -- Assignment
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluator_name TEXT,
  
  -- Status and result
  status public.selection_step_status NOT NULL DEFAULT 'pending',
  score NUMERIC,
  result TEXT, -- detailed result description
  
  -- Documentation
  notes TEXT,
  document_url TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on selection_steps
ALTER TABLE public.selection_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for selection_steps
CREATE POLICY "Users can view selection steps from their company"
ON public.selection_steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
  OR public.is_admin()
);

CREATE POLICY "Admin RRHH and Psicologo can manage selection steps"
ON public.selection_steps FOR ALL
USING (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
)
WITH CHECK (
  (public.is_admin_or_rrhh() OR public.is_psicologo())
  AND EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.vacancies v ON v.id = c.vacancy_id
    WHERE c.id = selection_steps.candidate_id
      AND public.is_company_member(v.company_id)
  )
);

-- Create indexes for selection_steps
CREATE INDEX idx_selection_steps_candidate ON public.selection_steps(candidate_id);
CREATE INDEX idx_selection_steps_type ON public.selection_steps(step_type);

-- Trigger for updated_at
CREATE TRIGGER update_selection_steps_updated_at
  BEFORE UPDATE ON public.selection_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260124185401_3c7e0d37-f059-4dc9-9bdc-9ea81eacacb4.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: 20260124204658_84c0d851-496a-4d5b-a4cf-dd6ce071165d.sql
-- ============================================================
-- Enum for termination types
CREATE TYPE termination_type AS ENUM (
  'mutuo_acuerdo',           -- 01
  'preaviso',                -- 02
  'periodo_prueba',          -- 03
  'obra_labor',              -- 04
  'sin_justa_causa',         -- 05
  'renuncia'                 -- 07 (Aceptación de renuncia)
);

-- Enum for termination document types
CREATE TYPE termination_document_type AS ENUM (
  'acta_terminacion',        -- Documento principal de terminación
  'preaviso',                -- 02
  'notificacion_aportes',    -- 06
  'aceptacion_renuncia',     -- 07
  'certificado_laboral',     -- 08
  'paz_y_salvo',             -- 09
  'examen_egreso',           -- 10
  'retiro_cesantias'         -- 11
);

-- Main termination/offboarding process table
CREATE TABLE public.employee_terminations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Termination details
  termination_type termination_type NOT NULL,
  termination_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  reason TEXT,
  
  -- Resignation specific fields
  resignation_date DATE,  -- Date employee submitted resignation
  
  -- Process status
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Termination documents checklist
CREATE TABLE public.termination_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  termination_id UUID NOT NULL REFERENCES public.employee_terminations(id) ON DELETE CASCADE,
  document_type termination_document_type NOT NULL,
  
  -- Status
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_generated BOOLEAN NOT NULL DEFAULT false,
  is_signed BOOLEAN NOT NULL DEFAULT false,
  
  -- Document data (used for PDF generation)
  document_data JSONB,
  
  -- Signed/uploaded document
  document_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by TEXT,
  
  -- Generation info
  generated_at TIMESTAMP WITH TIME ZONE,
  generated_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(termination_id, document_type)
);

-- Enable RLS
ALTER TABLE public.employee_terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termination_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_terminations
CREATE POLICY "Admin and RRHH can manage terminations"
ON public.employee_terminations
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company terminations"
ON public.employee_terminations
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for termination_documents
CREATE POLICY "Admin and RRHH can manage termination documents"
ON public.termination_documents
FOR ALL
USING (
  is_admin_or_rrhh() AND 
  EXISTS (
    SELECT 1 FROM public.employee_terminations et
    WHERE et.id = termination_documents.termination_id
    AND is_company_member(et.company_id)
  )
)
WITH CHECK (
  is_admin_or_rrhh() AND 
  EXISTS (
    SELECT 1 FROM public.employee_terminations et
    WHERE et.id = termination_documents.termination_id
    AND is_company_member(et.company_id)
  )
);

CREATE POLICY "Users can view termination documents"
ON public.termination_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employee_terminations et
    WHERE et.id = termination_documents.termination_id
    AND (is_company_member(et.company_id) OR is_admin())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_employee_terminations_updated_at
  BEFORE UPDATE ON public.employee_terminations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_termination_documents_updated_at
  BEFORE UPDATE ON public.termination_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_employee_terminations_contract ON public.employee_terminations(contract_id);
CREATE INDEX idx_employee_terminations_employee ON public.employee_terminations(employee_id);
CREATE INDEX idx_termination_documents_termination ON public.termination_documents(termination_id);

-- ============================================================
-- MIGRATION: 20260124223225_1646b46a-1003-4a16-8307-68172d76c6d2.sql
-- ============================================================
-- Add 'en_retiro' value to employee_status enum
ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'en_retiro';

-- ============================================================
-- MIGRATION: 20260124230745_edcbaef4-b926-42b7-8b6f-6476be36a00f.sql
-- ============================================================
-- Enable pg_cron and pg_net extensions for scheduled function calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================
-- MIGRATION: 20260125003652_f72ffae9-06dd-4289-8be2-cf49ac54d15a.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: 20260125015833_264ccc0d-9d64-4dbf-818b-de0a5dd75a04.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: 20260125131145_92a142b7-63dd-4616-a0e5-5257d8044d5d.sql
-- ============================================================
-- =====================================================
-- MÓDULO DE PROCESOS DISCIPLINARIOS
-- =====================================================

-- Enum para tipos de falta
CREATE TYPE public.fault_type AS ENUM ('leve', 'grave', 'gravisima');

-- Enum para estados del proceso disciplinario
CREATE TYPE public.disciplinary_status AS ENUM (
  'apertura',           -- Inicio del proceso
  'investigacion',      -- En investigación
  'citacion_descargos', -- Citación a descargos
  'descargos',          -- Esperando descargos del empleado
  'analisis',           -- Análisis de pruebas y descargos
  'decision',           -- Decisión tomada
  'apelacion',          -- En apelación
  'cerrado'             -- Proceso finalizado
);

-- Enum para tipos de sanción
CREATE TYPE public.sanction_type AS ENUM (
  'amonestacion_verbal',
  'amonestacion_escrita',
  'suspension_1_3_dias',
  'suspension_4_8_dias',
  'terminacion_justa_causa',
  'sin_sancion'
);

-- =====================================================
-- TABLA PRINCIPAL: PROCESOS DISCIPLINARIOS
-- =====================================================
CREATE TABLE public.disciplinary_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  
  -- Información del caso
  case_number TEXT NOT NULL,
  status disciplinary_status NOT NULL DEFAULT 'apertura',
  fault_type fault_type NOT NULL,
  fault_date DATE NOT NULL,
  
  -- Descripción de los hechos
  facts_description TEXT NOT NULL,
  article_violated TEXT, -- Artículos del reglamento interno
  witnesses TEXT, -- Nombres de testigos si aplica
  
  -- Fechas del proceso
  opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notification_date DATE, -- Fecha de notificación al empleado
  hearing_date TIMESTAMP WITH TIME ZONE, -- Fecha de audiencia de descargos
  decision_date DATE, -- Fecha de decisión
  closing_date DATE, -- Fecha de cierre
  
  -- Resultado
  sanction_type sanction_type,
  sanction_days INTEGER DEFAULT 0, -- Días de suspensión si aplica
  sanction_start_date DATE,
  sanction_end_date DATE,
  decision_summary TEXT,
  
  -- Apelación
  has_appeal BOOLEAN DEFAULT FALSE,
  appeal_date DATE,
  appeal_resolution TEXT,
  appeal_decision_date DATE,
  
  -- Responsables
  investigator_name TEXT,
  investigator_id UUID,
  decision_maker_name TEXT,
  decision_maker_id UUID,
  
  -- Documentos
  opening_document_url TEXT,
  notification_document_url TEXT,
  hearing_document_url TEXT,
  decision_document_url TEXT,
  appeal_document_url TEXT,
  
  -- Control
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: EVIDENCIAS DEL PROCESO
-- =====================================================
CREATE TABLE public.disciplinary_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.disciplinary_processes(id) ON DELETE CASCADE,
  
  evidence_type TEXT NOT NULL, -- documento, testimonio, video, foto, otro
  description TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  
  collected_date DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_by TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: HISTORIAL DE ESTADOS/ACCIONES
-- =====================================================
CREATE TABLE public.disciplinary_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.disciplinary_processes(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL, -- apertura, citacion, audiencia, decision, etc.
  action_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_status disciplinary_status,
  new_status disciplinary_status,
  
  description TEXT NOT NULL,
  performed_by UUID,
  performed_by_name TEXT,
  document_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLA: DESCARGOS DEL EMPLEADO
-- =====================================================
CREATE TABLE public.disciplinary_defenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.disciplinary_processes(id) ON DELETE CASCADE,
  
  defense_date DATE NOT NULL,
  defense_type TEXT NOT NULL, -- escrito, oral
  content TEXT NOT NULL, -- Contenido de los descargos
  
  received_by TEXT,
  received_by_id UUID,
  document_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_disciplinary_processes_company ON public.disciplinary_processes(company_id);
CREATE INDEX idx_disciplinary_processes_employee ON public.disciplinary_processes(employee_id);
CREATE INDEX idx_disciplinary_processes_status ON public.disciplinary_processes(status);
CREATE INDEX idx_disciplinary_processes_case_number ON public.disciplinary_processes(case_number);
CREATE INDEX idx_disciplinary_evidence_process ON public.disciplinary_evidence(process_id);
CREATE INDEX idx_disciplinary_timeline_process ON public.disciplinary_timeline(process_id);
CREATE INDEX idx_disciplinary_defenses_process ON public.disciplinary_defenses(process_id);

-- =====================================================
-- TRIGGERS DE UPDATED_AT
-- =====================================================
CREATE TRIGGER update_disciplinary_processes_updated_at
  BEFORE UPDATE ON public.disciplinary_processes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disciplinary_evidence_updated_at
  BEFORE UPDATE ON public.disciplinary_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disciplinary_defenses_updated_at
  BEFORE UPDATE ON public.disciplinary_defenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.disciplinary_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_defenses ENABLE ROW LEVEL SECURITY;

-- Políticas para disciplinary_processes
CREATE POLICY "Admin and RRHH can manage disciplinary processes"
  ON public.disciplinary_processes FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company disciplinary processes"
  ON public.disciplinary_processes FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- Políticas para disciplinary_evidence
CREATE POLICY "Admin and RRHH can manage disciplinary evidence"
  ON public.disciplinary_evidence FOR ALL
  USING (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_evidence.process_id
      AND is_company_member(dp.company_id)
    )
  )
  WITH CHECK (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_evidence.process_id
      AND is_company_member(dp.company_id)
    )
  );

CREATE POLICY "Users can view disciplinary evidence"
  ON public.disciplinary_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_evidence.process_id
      AND (is_company_member(dp.company_id) OR is_admin())
    )
  );

-- Políticas para disciplinary_timeline
CREATE POLICY "Admin and RRHH can manage disciplinary timeline"
  ON public.disciplinary_timeline FOR ALL
  USING (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_timeline.process_id
      AND is_company_member(dp.company_id)
    )
  )
  WITH CHECK (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_timeline.process_id
      AND is_company_member(dp.company_id)
    )
  );

CREATE POLICY "Users can view disciplinary timeline"
  ON public.disciplinary_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_timeline.process_id
      AND (is_company_member(dp.company_id) OR is_admin())
    )
  );

-- Políticas para disciplinary_defenses
CREATE POLICY "Admin and RRHH can manage disciplinary defenses"
  ON public.disciplinary_defenses FOR ALL
  USING (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_defenses.process_id
      AND is_company_member(dp.company_id)
    )
  )
  WITH CHECK (
    is_admin_or_rrhh() AND EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_defenses.process_id
      AND is_company_member(dp.company_id)
    )
  );

CREATE POLICY "Users can view disciplinary defenses"
  ON public.disciplinary_defenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disciplinary_processes dp
      WHERE dp.id = disciplinary_defenses.process_id
      AND (is_company_member(dp.company_id) OR is_admin())
    )
  );

-- ============================================================
-- MIGRATION: 20260125141031_8dd2b4d0-c4cc-411a-9d47-1d452cfb7cc4.sql
-- ============================================================
-- Crear enums para vacaciones
CREATE TYPE vacation_request_type AS ENUM ('disfrute', 'compensacion', 'acumulacion', 'interrupcion');
CREATE TYPE vacation_status AS ENUM ('borrador', 'aprobado', 'en_curso', 'completado', 'cancelado', 'interrumpido');

-- Tabla de configuración de vacaciones por empresa
CREATE TABLE public.vacation_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    days_per_year INTEGER NOT NULL DEFAULT 15,
    max_accumulation_years INTEGER NOT NULL DEFAULT 2,
    max_compensation_percentage NUMERIC NOT NULL DEFAULT 50,
    alert_threshold_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (company_id)
);

-- Tabla de saldos de vacaciones por periodo
CREATE TABLE public.vacation_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    days_accrued NUMERIC NOT NULL DEFAULT 15,
    days_taken NUMERIC NOT NULL DEFAULT 0,
    days_compensated NUMERIC NOT NULL DEFAULT 0,
    days_pending NUMERIC GENERATED ALWAYS AS (days_accrued - days_taken - days_compensated) STORED,
    is_accumulated BOOLEAN NOT NULL DEFAULT false,
    accumulation_expires DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de solicitudes/movimientos de vacaciones
CREATE TABLE public.vacation_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    balance_id UUID REFERENCES public.vacation_balances(id) ON DELETE SET NULL,
    request_type vacation_request_type NOT NULL DEFAULT 'disfrute',
    status vacation_status NOT NULL DEFAULT 'borrador',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    business_days INTEGER NOT NULL,
    calendar_days INTEGER,
    compensation_amount NUMERIC,
    interruption_date DATE,
    interruption_reason TEXT,
    remaining_days INTEGER DEFAULT 0,
    resume_start_date DATE,
    resume_end_date DATE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    document_url TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.vacation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para vacation_config
CREATE POLICY "Admin can manage vacation config"
ON public.vacation_config
FOR ALL
USING (is_admin() AND is_company_member(company_id))
WITH CHECK (is_admin() AND is_company_member(company_id));

CREATE POLICY "Users can view vacation config"
ON public.vacation_config
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- Políticas RLS para vacation_balances
CREATE POLICY "Admin and RRHH can manage vacation balances"
ON public.vacation_balances
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company vacation balances"
ON public.vacation_balances
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- Políticas RLS para vacation_requests
CREATE POLICY "Admin and RRHH can manage vacation requests"
ON public.vacation_requests
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company vacation requests"
ON public.vacation_requests
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- Triggers para updated_at
CREATE TRIGGER update_vacation_config_updated_at
    BEFORE UPDATE ON public.vacation_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vacation_balances_updated_at
    BEFORE UPDATE ON public.vacation_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vacation_requests_updated_at
    BEFORE UPDATE ON public.vacation_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_vacation_balances_employee ON public.vacation_balances(employee_id);
CREATE INDEX idx_vacation_balances_company ON public.vacation_balances(company_id);
CREATE INDEX idx_vacation_balances_period ON public.vacation_balances(period_start, period_end);
CREATE INDEX idx_vacation_requests_employee ON public.vacation_requests(employee_id);
CREATE INDEX idx_vacation_requests_company ON public.vacation_requests(company_id);
CREATE INDEX idx_vacation_requests_status ON public.vacation_requests(status);
CREATE INDEX idx_vacation_requests_dates ON public.vacation_requests(start_date, end_date);

-- ============================================================
-- MIGRATION: 20260125143123_3fb32ab6-f26b-4f72-a283-1ef96bc7266a.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: 20260125144629_dd2fbb81-196b-4bf2-8ee1-b59a96f7373f.sql
-- ============================================================
-- Create overtime type enum
CREATE TYPE public.overtime_type AS ENUM (
  'extra_diurna',           -- 25% recargo
  'extra_nocturna',         -- 75% recargo
  'recargo_nocturno',       -- 35% recargo (sin hora extra)
  'dominical_diurna',       -- 75% recargo
  'dominical_nocturna',     -- 110% recargo
  'festivo_diurna',         -- 75% recargo
  'festivo_nocturna'        -- 110% recargo
);

-- Create overtime status enum
CREATE TYPE public.overtime_status AS ENUM (
  'pendiente',
  'aprobado',
  'rechazado',
  'pagado'
);

-- Create overtime records table
CREATE TABLE public.overtime_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  
  -- Date and time info
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Calculated fields
  total_hours NUMERIC(5,2) NOT NULL,
  overtime_type public.overtime_type NOT NULL,
  surcharge_percentage INTEGER NOT NULL,
  
  -- Financial
  hourly_rate NUMERIC(12,2),
  total_value NUMERIC(12,2),
  
  -- Status and approval
  status public.overtime_status NOT NULL DEFAULT 'pendiente',
  reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  rejected_reason TEXT,
  
  -- Payroll export
  is_exported BOOLEAN NOT NULL DEFAULT false,
  exported_at TIMESTAMP WITH TIME ZONE,
  export_batch_id UUID,
  payroll_period TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create overtime export batches table
CREATE TABLE public.overtime_export_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  payroll_period TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  total_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  exported_by UUID,
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_export_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for overtime_records
CREATE POLICY "Users can view company overtime records"
ON public.overtime_records
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

CREATE POLICY "Admin and RRHH can manage overtime records"
ON public.overtime_records
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- RLS Policies for overtime_export_batches
CREATE POLICY "Users can view company export batches"
ON public.overtime_export_batches
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

CREATE POLICY "Admin and RRHH can manage export batches"
ON public.overtime_export_batches
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- Create indexes for performance
CREATE INDEX idx_overtime_records_company ON public.overtime_records(company_id);
CREATE INDEX idx_overtime_records_employee ON public.overtime_records(employee_id);
CREATE INDEX idx_overtime_records_date ON public.overtime_records(work_date);
CREATE INDEX idx_overtime_records_status ON public.overtime_records(status);
CREATE INDEX idx_overtime_records_exported ON public.overtime_records(is_exported);
CREATE INDEX idx_overtime_export_batches_company ON public.overtime_export_batches(company_id);

-- Trigger for updated_at
CREATE TRIGGER update_overtime_records_updated_at
BEFORE UPDATE ON public.overtime_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260125155129_ea80fb29-f8f4-4aab-9477-4679cd6eb90e.sql
-- ============================================================

-- Enum para tipos de evaluación
CREATE TYPE public.evaluation_type AS ENUM ('self', 'manager', 'peer', '360');

-- Enum para estados del ciclo
CREATE TYPE public.evaluation_cycle_status AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- Enum para estados de evaluación individual
CREATE TYPE public.evaluation_status AS ENUM ('pending', 'in_progress', 'submitted', 'reviewed', 'approved');

-- Tabla de plantillas de evaluación
CREATE TABLE public.evaluation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de competencias/criterios de evaluación
CREATE TABLE public.evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  weight NUMERIC DEFAULT 1,
  max_score INTEGER DEFAULT 5,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de ciclos de evaluación
CREATE TABLE public.evaluation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.evaluation_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  self_evaluation_deadline DATE,
  manager_evaluation_deadline DATE,
  status evaluation_cycle_status NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de evaluaciones individuales
CREATE TABLE public.performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  evaluator_id UUID,
  evaluation_type evaluation_type NOT NULL DEFAULT 'manager',
  status evaluation_status NOT NULL DEFAULT 'pending',
  overall_score NUMERIC,
  overall_rating TEXT,
  strengths TEXT,
  areas_to_improve TEXT,
  general_comments TEXT,
  employee_comments TEXT,
  development_plan TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de calificaciones por criterio
CREATE TABLE public.evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.performance_evaluations(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, criteria_id)
);

-- Tabla de objetivos/metas
CREATE TABLE public.performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value TEXT,
  achieved_value TEXT,
  weight NUMERIC DEFAULT 1,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  progress_percentage INTEGER DEFAULT 0,
  manager_feedback TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evaluation_templates
CREATE POLICY "Admin and RRHH can manage evaluation templates"
ON public.evaluation_templates FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company evaluation templates"
ON public.evaluation_templates FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for evaluation_criteria
CREATE POLICY "Admin and RRHH can manage evaluation criteria"
ON public.evaluation_criteria FOR ALL
USING (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM evaluation_templates t WHERE t.id = evaluation_criteria.template_id AND is_company_member(t.company_id)
))
WITH CHECK (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM evaluation_templates t WHERE t.id = evaluation_criteria.template_id AND is_company_member(t.company_id)
));

CREATE POLICY "Users can view evaluation criteria"
ON public.evaluation_criteria FOR SELECT
USING (EXISTS (
  SELECT 1 FROM evaluation_templates t WHERE t.id = evaluation_criteria.template_id AND (is_company_member(t.company_id) OR is_admin())
));

-- RLS Policies for evaluation_cycles
CREATE POLICY "Admin and RRHH can manage evaluation cycles"
ON public.evaluation_cycles FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company evaluation cycles"
ON public.evaluation_cycles FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for performance_evaluations
CREATE POLICY "Admin and RRHH can manage performance evaluations"
ON public.performance_evaluations FOR ALL
USING (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM evaluation_cycles c WHERE c.id = performance_evaluations.cycle_id AND is_company_member(c.company_id)
))
WITH CHECK (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM evaluation_cycles c WHERE c.id = performance_evaluations.cycle_id AND is_company_member(c.company_id)
));

CREATE POLICY "Users can view evaluations from their company cycles"
ON public.performance_evaluations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM evaluation_cycles c WHERE c.id = performance_evaluations.cycle_id AND (is_company_member(c.company_id) OR is_admin())
));

-- RLS Policies for evaluation_scores
CREATE POLICY "Admin and RRHH can manage evaluation scores"
ON public.evaluation_scores FOR ALL
USING (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM performance_evaluations pe 
  JOIN evaluation_cycles c ON c.id = pe.cycle_id 
  WHERE pe.id = evaluation_scores.evaluation_id AND is_company_member(c.company_id)
))
WITH CHECK (is_admin_or_rrhh() AND EXISTS (
  SELECT 1 FROM performance_evaluations pe 
  JOIN evaluation_cycles c ON c.id = pe.cycle_id 
  WHERE pe.id = evaluation_scores.evaluation_id AND is_company_member(c.company_id)
));

CREATE POLICY "Users can view evaluation scores"
ON public.evaluation_scores FOR SELECT
USING (EXISTS (
  SELECT 1 FROM performance_evaluations pe 
  JOIN evaluation_cycles c ON c.id = pe.cycle_id 
  WHERE pe.id = evaluation_scores.evaluation_id AND (is_company_member(c.company_id) OR is_admin())
));

-- RLS Policies for performance_goals
CREATE POLICY "Admin and RRHH can manage performance goals"
ON public.performance_goals FOR ALL
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible performance goals"
ON public.performance_goals FOR SELECT
USING (has_employee_v2_access(employee_id) OR is_admin());

-- Triggers for updated_at
CREATE TRIGGER update_evaluation_templates_updated_at
  BEFORE UPDATE ON public.evaluation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_cycles_updated_at
  BEFORE UPDATE ON public.evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_evaluations_updated_at
  BEFORE UPDATE ON public.performance_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_goals_updated_at
  BEFORE UPDATE ON public.performance_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260125160935_7ea88268-45d8-4f57-b683-14fa0bfc2f0a.sql
-- ============================================================
-- Enum for cesantias deposit status
CREATE TYPE public.cesantias_status AS ENUM ('pendiente', 'calculado', 'depositado', 'extemporaneo');

-- Enum for cesantias withdrawal reason
CREATE TYPE public.cesantias_withdrawal_reason AS ENUM ('vivienda', 'educacion', 'terminacion_contrato');

-- Table for annual cesantías deposits
CREATE TABLE public.cesantias_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  calculation_start_date DATE NOT NULL,
  calculation_end_date DATE NOT NULL,
  base_salary NUMERIC NOT NULL,
  average_salary NUMERIC,
  days_worked INTEGER NOT NULL DEFAULT 360,
  cesantias_amount NUMERIC NOT NULL,
  fund_name TEXT NOT NULL,
  fund_account TEXT,
  due_date DATE NOT NULL, -- Feb 14 of next year
  deposit_date DATE,
  deposit_document_url TEXT,
  status public.cesantias_status NOT NULL DEFAULT 'pendiente',
  is_late BOOLEAN DEFAULT false,
  late_days INTEGER DEFAULT 0,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, year)
);

-- Table for cesantías interest payments (12% annual, due Jan 31)
CREATE TABLE public.cesantias_interest_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  cesantias_balance NUMERIC NOT NULL, -- Balance at Dec 31
  interest_rate NUMERIC NOT NULL DEFAULT 12,
  days_accrued INTEGER NOT NULL DEFAULT 360,
  interest_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL, -- Jan 31 of next year
  payment_date DATE,
  payment_document_url TEXT,
  is_paid BOOLEAN DEFAULT false,
  is_late BOOLEAN DEFAULT false,
  late_days INTEGER DEFAULT 0,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, year)
);

-- Table for partial withdrawals
CREATE TABLE public.cesantias_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  withdrawal_reason public.cesantias_withdrawal_reason NOT NULL,
  amount_requested NUMERIC NOT NULL,
  amount_approved NUMERIC,
  authorization_date DATE,
  disbursement_date DATE,
  fund_name TEXT NOT NULL,
  request_document_url TEXT,
  authorization_document_url TEXT,
  beneficiary_name TEXT,
  beneficiary_document TEXT,
  destination_description TEXT,
  status TEXT NOT NULL DEFAULT 'solicitado',
  rejection_reason TEXT,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cesantias_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cesantias_interest_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cesantias_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cesantias_deposits
CREATE POLICY "Admin and RRHH can manage cesantias deposits"
  ON public.cesantias_deposits FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company cesantias deposits"
  ON public.cesantias_deposits FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for cesantias_interest_payments
CREATE POLICY "Admin and RRHH can manage cesantias interest"
  ON public.cesantias_interest_payments FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company cesantias interest"
  ON public.cesantias_interest_payments FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for cesantias_withdrawals
CREATE POLICY "Admin and RRHH can manage cesantias withdrawals"
  ON public.cesantias_withdrawals FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company cesantias withdrawals"
  ON public.cesantias_withdrawals FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- Triggers for updated_at
CREATE TRIGGER update_cesantias_deposits_updated_at
  BEFORE UPDATE ON public.cesantias_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cesantias_interest_updated_at
  BEFORE UPDATE ON public.cesantias_interest_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cesantias_withdrawals_updated_at
  BEFORE UPDATE ON public.cesantias_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260125162210_3348e149-f9bc-4108-aeaa-1446cbc92512.sql
-- ============================================================
-- Create table to link employees with auth users
CREATE TABLE IF NOT EXISTS public.employee_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(employee_id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.employee_user_links ENABLE ROW LEVEL SECURITY;

-- Policies for employee_user_links
CREATE POLICY "Admin and RRHH can manage employee links"
  ON public.employee_user_links FOR ALL
  USING (is_admin_or_rrhh())
  WITH CHECK (is_admin_or_rrhh());

CREATE POLICY "Employees can view their own link"
  ON public.employee_user_links FOR SELECT
  USING (user_id = auth.uid());

-- Create table for change requests
CREATE TABLE IF NOT EXISTS public.employee_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  request_type text NOT NULL,
  field_name text NOT NULL,
  current_value text,
  requested_value text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_change_requests ENABLE ROW LEVEL SECURITY;

-- Policies for change requests
CREATE POLICY "Admin and RRHH can manage change requests"
  ON public.employee_change_requests FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Employees can view their own requests"
  ON public.employee_change_requests FOR SELECT
  USING (requested_by = auth.uid());

CREATE POLICY "Employees can insert their own requests"
  ON public.employee_change_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());

-- Function to get current user's employee_id
CREATE OR REPLACE FUNCTION public.get_my_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id
  FROM public.employee_user_links
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$;

-- Trigger for updated_at
CREATE TRIGGER update_employee_change_requests_updated_at
  BEFORE UPDATE ON public.employee_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260125164507_4b5929d2-6e3d-49e5-82a7-7546115fbd10.sql
-- ============================================================
-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
    category TEXT NOT NULL DEFAULT 'general', -- contract, exam, dotation, certification, incapacity, vacation, cesantias, general
    entity_type TEXT, -- e.g., 'contract', 'employee', 'incapacity'
    entity_id UUID,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Admin and RRHH can insert notifications for users in their company
CREATE POLICY "Admin and RRHH can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
    is_admin_or_rrhh() AND 
    (company_id IS NULL OR is_company_member(company_id))
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- MIGRATION: 20260125164711_b0085a9e-d8fe-4257-ad41-e3c03e167520.sql
-- ============================================================
-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- MIGRATION: 20260125180700_78caa597-f3f7-473d-b383-f13722867ba9.sql
-- ============================================================
-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create user_preferences table for notification settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification preferences
  notify_contract_expiry BOOLEAN NOT NULL DEFAULT true,
  notify_medical_exam_expiry BOOLEAN NOT NULL DEFAULT true,
  notify_dotation_expiry BOOLEAN NOT NULL DEFAULT true,
  notify_vacation_requests BOOLEAN NOT NULL DEFAULT true,
  notify_leave_requests BOOLEAN NOT NULL DEFAULT true,
  notify_disciplinary_updates BOOLEAN NOT NULL DEFAULT true,
  notify_system_announcements BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  
  -- Display preferences
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'es',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_sessions table to track active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION: 20260125235225_8dcc6fef-b295-4875-91b2-18c96c44311e.sql
-- ============================================================

-- =============================================
-- MÓDULO DE HORARIOS Y TURNOS - KRH
-- =============================================

-- Enum para modalidad de tiempo del empleado
CREATE TYPE public.employee_time_mode AS ENUM ('administrative', 'shift');

-- Enum para origen de asignación de turno
CREATE TYPE public.shift_assignment_source AS ENUM ('cycle', 'manual');

-- =============================================
-- 1. WORK_SCHEDULES (Horarios Administrativos)
-- =============================================
CREATE TABLE public.work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Dom, 1=Lun, ..., 6=Sab
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 2. SHIFTS (Turnos Operativos)
-- =============================================
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  crosses_midnight BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3B82F6', -- Para visualización en calendario
  is_rest_day BOOLEAN DEFAULT false, -- Para días de descanso en ciclos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 3. SHIFT_CYCLES (Ciclos de Rotación)
-- =============================================
CREATE TABLE public.shift_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  total_days INTEGER NOT NULL, -- Total de días en el ciclo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 4. SHIFT_CYCLE_DAYS (Días del Ciclo)
-- =============================================
CREATE TABLE public.shift_cycle_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_cycle_id UUID NOT NULL REFERENCES public.shift_cycles(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL, -- 1, 2, 3, ... hasta total_days
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shift_cycle_id, day_number)
);

-- =============================================
-- 5. EMPLOYEE_TIME_CONFIG (Config por Empleado)
-- =============================================
CREATE TABLE public.employee_time_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  mode public.employee_time_mode NOT NULL,
  work_schedule_id UUID REFERENCES public.work_schedules(id) ON DELETE SET NULL,
  shift_cycle_id UUID REFERENCES public.shift_cycles(id) ON DELETE SET NULL,
  cycle_start_date DATE, -- Fecha de inicio del ciclo para calcular posición
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Validación: solo un modo activo por empleado
  CONSTRAINT valid_mode_config CHECK (
    (mode = 'administrative' AND work_schedule_id IS NOT NULL AND shift_cycle_id IS NULL) OR
    (mode = 'shift' AND shift_cycle_id IS NOT NULL AND work_schedule_id IS NULL)
  )
);

-- Índice para garantizar solo un registro activo por empleado
CREATE UNIQUE INDEX idx_employee_time_config_active 
ON public.employee_time_config(employee_id) 
WHERE is_active = true;

-- =============================================
-- 6. EMPLOYEE_SHIFT_ASSIGNMENTS (Asignaciones Diarias)
-- =============================================
CREATE TABLE public.employee_shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  assignment_date DATE NOT NULL,
  source public.shift_assignment_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Un empleado solo puede tener un turno por día
  UNIQUE(employee_id, assignment_date)
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_work_schedules_company ON public.work_schedules(company_id);
CREATE INDEX idx_shifts_company ON public.shifts(company_id);
CREATE INDEX idx_shift_cycles_company ON public.shift_cycles(company_id);
CREATE INDEX idx_employee_time_config_employee ON public.employee_time_config(employee_id);
CREATE INDEX idx_employee_shift_assignments_employee_date ON public.employee_shift_assignments(employee_id, assignment_date);
CREATE INDEX idx_employee_shift_assignments_date ON public.employee_shift_assignments(assignment_date);

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_cycles_updated_at
  BEFORE UPDATE ON public.shift_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_time_config_updated_at
  BEFORE UPDATE ON public.employee_time_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_shift_assignments_updated_at
  BEFORE UPDATE ON public.employee_shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_cycle_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas para work_schedules
CREATE POLICY "work_schedules_select" ON public.work_schedules
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "work_schedules_insert" ON public.work_schedules
  FOR INSERT WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "work_schedules_update" ON public.work_schedules
  FOR UPDATE USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "work_schedules_delete" ON public.work_schedules
  FOR DELETE USING (public.is_company_member(company_id) AND public.is_admin());

-- Políticas para shifts
CREATE POLICY "shifts_select" ON public.shifts
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "shifts_insert" ON public.shifts
  FOR INSERT WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "shifts_update" ON public.shifts
  FOR UPDATE USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "shifts_delete" ON public.shifts
  FOR DELETE USING (public.is_company_member(company_id) AND public.is_admin());

-- Políticas para shift_cycles
CREATE POLICY "shift_cycles_select" ON public.shift_cycles
  FOR SELECT USING (public.is_company_member(company_id));

CREATE POLICY "shift_cycles_insert" ON public.shift_cycles
  FOR INSERT WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "shift_cycles_update" ON public.shift_cycles
  FOR UPDATE USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "shift_cycles_delete" ON public.shift_cycles
  FOR DELETE USING (public.is_company_member(company_id) AND public.is_admin());

-- Políticas para shift_cycle_days (heredan del ciclo padre)
CREATE POLICY "shift_cycle_days_select" ON public.shift_cycle_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shift_cycles sc 
      WHERE sc.id = shift_cycle_id AND public.is_company_member(sc.company_id)
    )
  );

CREATE POLICY "shift_cycle_days_insert" ON public.shift_cycle_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shift_cycles sc 
      WHERE sc.id = shift_cycle_id AND public.is_company_member(sc.company_id) AND public.is_admin_or_rrhh()
    )
  );

CREATE POLICY "shift_cycle_days_update" ON public.shift_cycle_days
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shift_cycles sc 
      WHERE sc.id = shift_cycle_id AND public.is_company_member(sc.company_id) AND public.is_admin_or_rrhh()
    )
  );

CREATE POLICY "shift_cycle_days_delete" ON public.shift_cycle_days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shift_cycles sc 
      WHERE sc.id = shift_cycle_id AND public.is_company_member(sc.company_id) AND public.is_admin()
    )
  );

-- Políticas para employee_time_config
CREATE POLICY "employee_time_config_select" ON public.employee_time_config
  FOR SELECT USING (public.has_employee_v2_access(employee_id));

CREATE POLICY "employee_time_config_insert" ON public.employee_time_config
  FOR INSERT WITH CHECK (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE POLICY "employee_time_config_update" ON public.employee_time_config
  FOR UPDATE USING (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE POLICY "employee_time_config_delete" ON public.employee_time_config
  FOR DELETE USING (public.has_employee_v2_access(employee_id) AND public.is_admin());

-- Políticas para employee_shift_assignments
CREATE POLICY "employee_shift_assignments_select" ON public.employee_shift_assignments
  FOR SELECT USING (public.has_employee_v2_access(employee_id));

CREATE POLICY "employee_shift_assignments_insert" ON public.employee_shift_assignments
  FOR INSERT WITH CHECK (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE POLICY "employee_shift_assignments_update" ON public.employee_shift_assignments
  FOR UPDATE USING (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE POLICY "employee_shift_assignments_delete" ON public.employee_shift_assignments
  FOR DELETE USING (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());


-- ============================================================
-- MIGRATION: 20260126013730_a1f2bf63-98c6-4df9-94bc-73b9690d5828.sql
-- ============================================================
-- Create table for ARL (Administradoras de Riesgos Laborales)
CREATE TABLE public.catalog_arl (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for EPS (Entidades Promotoras de Salud)
CREATE TABLE public.catalog_eps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for AFP (Administradoras de Fondos de Pensiones)
CREATE TABLE public.catalog_afp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for CCF (Cajas de Compensación Familiar)
CREATE TABLE public.catalog_ccf (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for AFC (Cuentas de Ahorro para el Fomento de la Construcción)
CREATE TABLE public.catalog_afc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Create table for IPS (Instituciones Prestadoras de Servicios de Salud)
CREATE TABLE public.catalog_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  nit VARCHAR(20),
  address VARCHAR(255),
  city VARCHAR(100),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Enable RLS on all tables
ALTER TABLE public.catalog_arl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_eps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_afp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ccf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_afc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ips ENABLE ROW LEVEL SECURITY;

-- RLS policies for catalog_arl
CREATE POLICY "Users can view ARL from their companies" ON public.catalog_arl
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert ARL" ON public.catalog_arl
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update ARL" ON public.catalog_arl
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete ARL" ON public.catalog_arl
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_eps
CREATE POLICY "Users can view EPS from their companies" ON public.catalog_eps
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert EPS" ON public.catalog_eps
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update EPS" ON public.catalog_eps
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete EPS" ON public.catalog_eps
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_afp
CREATE POLICY "Users can view AFP from their companies" ON public.catalog_afp
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert AFP" ON public.catalog_afp
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update AFP" ON public.catalog_afp
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete AFP" ON public.catalog_afp
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_ccf
CREATE POLICY "Users can view CCF from their companies" ON public.catalog_ccf
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert CCF" ON public.catalog_ccf
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update CCF" ON public.catalog_ccf
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete CCF" ON public.catalog_ccf
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_afc
CREATE POLICY "Users can view AFC from their companies" ON public.catalog_afc
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert AFC" ON public.catalog_afc
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update AFC" ON public.catalog_afc
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete AFC" ON public.catalog_afc
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- RLS policies for catalog_ips
CREATE POLICY "Users can view IPS from their companies" ON public.catalog_ips
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can insert IPS" ON public.catalog_ips
  FOR INSERT WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin/RRHH can update IPS" ON public.catalog_ips
  FOR UPDATE USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));
CREATE POLICY "Admin can delete IPS" ON public.catalog_ips
  FOR DELETE USING (public.is_admin() AND public.is_company_member(company_id));

-- Create triggers for updated_at
CREATE TRIGGER update_catalog_arl_updated_at BEFORE UPDATE ON public.catalog_arl
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_eps_updated_at BEFORE UPDATE ON public.catalog_eps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_afp_updated_at BEFORE UPDATE ON public.catalog_afp
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_ccf_updated_at BEFORE UPDATE ON public.catalog_ccf
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_afc_updated_at BEFORE UPDATE ON public.catalog_afc
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_ips_updated_at BEFORE UPDATE ON public.catalog_ips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260126021253_5ae6b59e-3659-4568-8d9b-d68b00d52893.sql
-- ============================================================
-- Create catalog_banks table for bank catalog
CREATE TABLE public.catalog_banks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    nit TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Enable RLS
ALTER TABLE public.catalog_banks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view banks from their companies"
ON public.catalog_banks FOR SELECT
USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can insert banks"
ON public.catalog_banks FOR INSERT
WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can update banks"
ON public.catalog_banks FOR UPDATE
USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can delete banks"
ON public.catalog_banks FOR DELETE
USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

-- Trigger for updated_at
CREATE TRIGGER update_catalog_banks_updated_at
BEFORE UPDATE ON public.catalog_banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index
CREATE INDEX idx_catalog_banks_company_id ON public.catalog_banks(company_id);

-- ============================================================
-- MIGRATION: 20260126140221_a5869a52-29d1-478c-9080-2ce720235cd8.sql
-- ============================================================
-- Drop existing restrictive policies for avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create new policies that allow authenticated users to manage employee avatars
-- HR staff and admins need to upload avatars for employees

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- ============================================================
-- MIGRATION: 20260126173617_ca7c3d1a-fbbb-4626-b74e-90b116e48697.sql
-- ============================================================
-- Agregar columna para la plantilla de contrato en contract_type_config
ALTER TABLE public.contract_type_config 
ADD COLUMN IF NOT EXISTS template_url TEXT,
ADD COLUMN IF NOT EXISTS template_file_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Comentario explicativo
COMMENT ON COLUMN public.contract_type_config.template_url IS 'URL del archivo de plantilla de contrato (DOCX/PDF)';
COMMENT ON COLUMN public.contract_type_config.template_file_name IS 'Nombre original del archivo de plantilla';
COMMENT ON COLUMN public.contract_type_config.description IS 'Descripción del tipo de contrato';

-- ============================================================
-- MIGRATION: 20260126175915_645a59a7-7892-4123-bdf1-3eaca0f6169d.sql
-- ============================================================
-- Update the documents bucket to allow DOCX, DOC, and PDF files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word',
  'application/octet-stream'
]
WHERE id = 'documents';

-- ============================================================
-- MIGRATION: 20260126193019_a8f97884-69d1-46ef-9b93-424be6ecbff1.sql
-- ============================================================
-- Update contracts RLS policies to use has_employee_v2_access instead of has_employee_access

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and RRHH can manage contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view accessible contracts" ON public.contracts;

-- Create updated policies using has_employee_v2_access
CREATE POLICY "Admin and RRHH can manage contracts"
ON public.contracts
FOR ALL
TO authenticated
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible contracts"
ON public.contracts
FOR SELECT
TO authenticated
USING (has_employee_v2_access(employee_id));

-- ============================================================
-- MIGRATION: 20260126193647_6c351742-8005-4b06-bd49-1d3a0f0073a7.sql
-- ============================================================
-- Drop the old foreign key first
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_employee_id_fkey;

-- Add new foreign key referencing employees_v2
ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.employees_v2(id) ON DELETE CASCADE;

-- ============================================================
-- MIGRATION: 20260126195125_043294ec-7f1f-4728-94c1-47c53460681c.sql
-- ============================================================
-- Add extension_type column to distinguish between 'pactada' (agreed) and 'automatica' (automatic) extensions
-- per Colombian labor law (Art. 46 CST)
ALTER TABLE public.contract_extensions 
ADD COLUMN IF NOT EXISTS extension_type TEXT NOT NULL DEFAULT 'pactada' 
CHECK (extension_type IN ('pactada', 'automatica'));

-- Add comment explaining the column
COMMENT ON COLUMN public.contract_extensions.extension_type IS 'Tipo de prórroga según ley colombiana: pactada (acordada por escrito) o automatica (por falta de preaviso de 30 días)';

-- ============================================================
-- MIGRATION: 20260126205118_885c71d2-16a3-40cf-aed1-17e2a30d4e0d.sql
-- ============================================================
-- Drop existing policies for contract_extensions
DROP POLICY IF EXISTS "Admin and RRHH can manage extensions" ON public.contract_extensions;
DROP POLICY IF EXISTS "Users can view accessible extensions" ON public.contract_extensions;

-- Create updated policies using has_employee_v2_access for employees_v2 schema
CREATE POLICY "Users can view accessible extensions" 
ON public.contract_extensions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.id = contract_extensions.contract_id 
    AND has_employee_v2_access(c.employee_id)
  )
);

CREATE POLICY "Admin and RRHH can manage extensions" 
ON public.contract_extensions 
FOR ALL 
USING (
  is_admin_or_rrhh() AND EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.id = contract_extensions.contract_id 
    AND has_employee_v2_access(c.employee_id)
  )
)
WITH CHECK (
  is_admin_or_rrhh() AND EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.id = contract_extensions.contract_id 
    AND has_employee_v2_access(c.employee_id)
  )
);

-- ============================================================
-- MIGRATION: 20260127002350_e2d3c988-21fe-4e60-af2d-1713ac0d5ff2.sql
-- ============================================================
-- Create a user_status table to track active/inactive state
-- This is separate from auth.users to avoid modifying the auth schema
CREATE TABLE IF NOT EXISTS public.user_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES auth.users(id),
  deactivation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view user status"
  ON public.user_status
  FOR SELECT
  USING (public.is_admin_or_rrhh());

CREATE POLICY "Admins can insert user status"
  ON public.user_status
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user status"
  ON public.user_status
  FOR UPDATE
  USING (public.is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_user_status_updated_at
  BEFORE UPDATE ON public.user_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to check if a user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.user_status WHERE user_id = _user_id),
    true -- Default to active if no record exists
  )
$$;

-- ============================================================
-- MIGRATION: 20260127003439_fa30b844-502e-4ef2-80ce-637cc63a7de6.sql
-- ============================================================
-- Crear tabla user_profiles para almacenar información visible del usuario
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para búsquedas por nombre
CREATE INDEX idx_user_profiles_full_name ON public.user_profiles(full_name);

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer perfiles
CREATE POLICY "Users can read all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Política: Admins pueden insertar perfiles para nuevos usuarios
CREATE POLICY "Admins can insert profiles"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Política: Usuarios pueden insertar su propio perfil (para onboarding)
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260127230231_19e21f68-be6e-4269-ad0e-cd38af205528.sql
-- ============================================================
-- Table to track contract consecutive numbers per company per year
CREATE TABLE public.contract_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT 'PC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, year)
);

-- Enable RLS
ALTER TABLE public.contract_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company sequences"
ON public.contract_sequences
FOR SELECT
USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert sequences for their company"
ON public.contract_sequences
FOR INSERT
WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update sequences for their company"
ON public.contract_sequences
FOR UPDATE
USING (public.is_company_member(company_id));

-- Function to get next contract number
CREATE OR REPLACE FUNCTION public.get_next_contract_number(
  _company_id UUID,
  _prefix TEXT DEFAULT 'PC'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year INTEGER;
  _next_number INTEGER;
  _contract_number TEXT;
BEGIN
  _year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Insert or update the sequence and get the next number
  INSERT INTO public.contract_sequences (company_id, year, last_number, prefix)
  VALUES (_company_id, _year, 1, _prefix)
  ON CONFLICT (company_id, year)
  DO UPDATE SET 
    last_number = contract_sequences.last_number + 1,
    prefix = _prefix,
    updated_at = now()
  RETURNING last_number INTO _next_number;
  
  -- Format: PREFIX-YEAR-0001
  _contract_number := _prefix || '-' || _year::TEXT || '-' || LPAD(_next_number::TEXT, 4, '0');
  
  RETURN _contract_number;
END;
$$;

-- Add trigger to update updated_at
CREATE TRIGGER update_contract_sequences_updated_at
BEFORE UPDATE ON public.contract_sequences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260128002435_73e9e4fd-ce38-40d3-82d5-49994367caa5.sql
-- ============================================================
-- Add approval fields to contracts table
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- ============================================================
-- MIGRATION: 20260129213050_e8b8d384-cdcb-48f2-bbad-bc4bfefde14b.sql
-- ============================================================
-- Allow dynamic contract types from catalog by converting contracts.contract_type from enum to text
ALTER TABLE public.contracts
  ALTER COLUMN contract_type TYPE text USING contract_type::text;

-- Optional: ensure not null remains (if it is)
-- (No change here; existing constraint will remain if present)

-- Update any indexes that depend on enum type are automatically compatible with text in Postgres.


-- ============================================================
-- MIGRATION: 20260130013802_9cbe9cd5-a9a8-4978-8547-34c574a317b0.sql
-- ============================================================
-- Add work_labor_description field for "Obra o Labor" contracts
-- This field describes the specific work or task to be performed

ALTER TABLE public.contracts
ADD COLUMN work_labor_description TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.contracts.work_labor_description IS 'Descripción del objeto o labor a realizar, requerido para contratos de tipo Obra o Labor';

-- ============================================================
-- MIGRATION: 20260130140620_e7840355-8399-4373-ba0d-82bec85ba134.sql
-- ============================================================
-- Enum para día de descanso obligatorio
CREATE TYPE public.day_of_week AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

-- Enum para motivo de solicitud
CREATE TYPE public.requisition_reason AS ENUM (
  'renuncia', 'vacaciones', 'incapacidad', 'rotacion', 
  'movimiento_interno', 'nuevo_cargo', 'nuevo_puesto', 
  'terminacion_contrato', 'calamidad', 'licencia'
);

-- Enum para tipo de convocatoria
CREATE TYPE public.recruitment_type AS ENUM ('externa', 'interna', 'mixta');

-- Enum para estado de requisición
CREATE TYPE public.requisition_status AS ENUM (
  'borrador', 'enviada', 'en_operaciones', 'en_rrhh', 
  'en_juridico', 'en_seleccion', 'en_gerencia', 
  'aprobada', 'rechazada', 'cerrada'
);

-- Tabla principal de requisiciones de personal
CREATE TABLE public.personnel_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Datos generales
  fecha_requisicion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_ingreso_estimada DATE,
  cantidad_vacantes_requeridas INTEGER NOT NULL DEFAULT 1,
  cargo_solicitado TEXT NOT NULL,
  area_id UUID REFERENCES public.areas(id),
  operation_center_id UUID REFERENCES public.operation_centers(id),
  cargo_a_reemplazar TEXT,
  persona_a_reemplazar TEXT,
  requiere_herramienta_trabajo BOOLEAN DEFAULT false,
  horario_trabajo TEXT,
  dia_descanso_obligatorio public.day_of_week,
  
  -- Motivo de la solicitud
  motivo_solicitud public.requisition_reason NOT NULL,
  observaciones_motivo_solicitud TEXT,
  
  -- Información del solicitante
  solicitante_id UUID REFERENCES auth.users(id),
  solicitante_nombre TEXT NOT NULL,
  cargo_solicitante TEXT,
  
  -- Aprobaciones Operaciones
  operaciones_aprobado BOOLEAN,
  operaciones_aprobado_salario BOOLEAN,
  operaciones_quien_aprobo TEXT,
  operaciones_aprobador_id UUID REFERENCES auth.users(id),
  operaciones_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  operaciones_observaciones TEXT,
  
  -- Aprobaciones RRHH
  rrhh_asignacion_salarial NUMERIC(12,2),
  rrhh_condiciones_adicionales TEXT,
  rrhh_fuente_asignacion_salarial TEXT,
  rrhh_nivel_politica_salarial TEXT,
  rrhh_tipo_convocatoria public.recruitment_type,
  rrhh_observaciones TEXT,
  rrhh_aprobado BOOLEAN,
  rrhh_quien_aprobo TEXT,
  rrhh_aprobador_id UUID REFERENCES auth.users(id),
  rrhh_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Aprobaciones Jurídico
  juridico_tipo_contrato TEXT,
  juridico_duracion TEXT,
  juridico_observaciones TEXT,
  juridico_aprobado BOOLEAN,
  juridico_quien_aprobo TEXT,
  juridico_aprobador_id UUID REFERENCES auth.users(id),
  juridico_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Aprobaciones Selección
  seleccion_fecha_inicio_proceso DATE,
  seleccion_observaciones TEXT,
  seleccion_aprobado BOOLEAN,
  seleccion_quien_aprobo TEXT,
  seleccion_aprobador_id UUID REFERENCES auth.users(id),
  seleccion_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Aprobaciones Gerencia
  gerencia_aprobado_salario BOOLEAN,
  gerencia_aprobado BOOLEAN,
  gerencia_observaciones TEXT,
  gerencia_quien_aprobo TEXT,
  gerencia_aprobador_id UUID REFERENCES auth.users(id),
  gerencia_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Estado del proceso
  estado_requisicion public.requisition_status NOT NULL DEFAULT 'borrador',
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para códigos de vacantes externas
CREATE TABLE public.requisition_vacancy_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES public.personnel_requisitions(id) ON DELETE CASCADE,
  codigo_vacante_externa TEXT NOT NULL,
  entidad_origen TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar columna de referencia a requisición en vacantes
ALTER TABLE public.vacancies 
ADD COLUMN requisition_id UUID REFERENCES public.personnel_requisitions(id);

-- Índices para performance
CREATE INDEX idx_personnel_requisitions_company ON public.personnel_requisitions(company_id);
CREATE INDEX idx_personnel_requisitions_status ON public.personnel_requisitions(estado_requisicion);
CREATE INDEX idx_personnel_requisitions_area ON public.personnel_requisitions(area_id);
CREATE INDEX idx_requisition_vacancy_codes_requisition ON public.requisition_vacancy_codes(requisition_id);
CREATE INDEX idx_vacancies_requisition ON public.vacancies(requisition_id);

-- Trigger para updated_at
CREATE TRIGGER update_personnel_requisitions_updated_at
  BEFORE UPDATE ON public.personnel_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.personnel_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_vacancy_codes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para personnel_requisitions
CREATE POLICY "Users can view requisitions from their company"
  ON public.personnel_requisitions
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can insert requisitions"
  ON public.personnel_requisitions
  FOR INSERT
  WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can update requisitions"
  ON public.personnel_requisitions
  FOR UPDATE
  USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin can delete requisitions"
  ON public.personnel_requisitions
  FOR DELETE
  USING (public.is_admin() AND public.is_company_member(company_id));

-- Políticas RLS para requisition_vacancy_codes
CREATE POLICY "Users can view vacancy codes from their requisitions"
  ON public.requisition_vacancy_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.personnel_requisitions pr
      WHERE pr.id = requisition_id
      AND public.is_company_member(pr.company_id)
    )
  );

CREATE POLICY "Admin and RRHH can manage vacancy codes"
  ON public.requisition_vacancy_codes
  FOR ALL
  USING (
    public.is_admin_or_rrhh() AND
    EXISTS (
      SELECT 1 FROM public.personnel_requisitions pr
      WHERE pr.id = requisition_id
      AND public.is_company_member(pr.company_id)
    )
  );

-- ============================================================
-- MIGRATION: 20260130144009_1d356a67-201b-4f96-9052-259bd7c9f3b6.sql
-- ============================================================
-- Add specific email preference for requisition approvals
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS email_requisition_approvals boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.email_requisition_approvals IS 'Receive email notifications for pending requisition approvals';

-- ============================================================
-- MIGRATION: 20260206192645_2193267d-2a09-459c-ac50-eb8e0bece133.sql
-- ============================================================
-- Add proposed salary and contract type to personnel requisitions form
ALTER TABLE public.personnel_requisitions 
ADD COLUMN IF NOT EXISTS salario_propuesto numeric(12,2),
ADD COLUMN IF NOT EXISTS tipo_contrato_solicitado text;

-- Add comment for documentation
COMMENT ON COLUMN public.personnel_requisitions.salario_propuesto IS 'Salario propuesto por el solicitante para la posición';
COMMENT ON COLUMN public.personnel_requisitions.tipo_contrato_solicitado IS 'Tipo de contrato sugerido por el solicitante';

-- ============================================================
-- MIGRATION: 20260208122606_95efbffd-70e2-4d92-913d-137ad9c308d0.sql
-- ============================================================
-- Function to delete shift assignments for an absence period
-- Excludes rest days (is_rest_day = true)
CREATE OR REPLACE FUNCTION public.delete_shift_assignments_for_absence(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete work shift assignments (not rest days) in the given date range
  DELETE FROM employee_shift_assignments esa
  WHERE esa.employee_id = p_employee_id
    AND esa.assignment_date BETWEEN p_start_date AND p_end_date
    AND EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = esa.shift_id
        AND s.is_rest_day = false
    );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- ============================================================
-- MIGRATION: 20260208133942_902f7875-0680-4b4c-b7bb-64dc90b28cb4.sql
-- ============================================================
-- Create table for company holidays
CREATE TABLE public.company_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_national BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, holiday_date)
);

-- Enable RLS
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view holidays from their companies"
  ON public.company_holidays
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can insert holidays"
  ON public.company_holidays
  FOR INSERT
  WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can update holidays"
  ON public.company_holidays
  FOR UPDATE
  USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can delete holidays"
  ON public.company_holidays
  FOR DELETE
  USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

-- Trigger for updated_at
CREATE TRIGGER update_company_holidays_updated_at
  BEFORE UPDATE ON public.company_holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_company_holidays_date ON public.company_holidays(company_id, holiday_date);
CREATE INDEX idx_company_holidays_year ON public.company_holidays(company_id, EXTRACT(YEAR FROM holiday_date));

-- Function to insert default Colombian holidays for a company
CREATE OR REPLACE FUNCTION public.insert_default_holidays()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.company_holidays (company_id, holiday_date, name, is_national) VALUES
    -- 2024
    (NEW.id, '2024-01-01', 'Año Nuevo', true),
    (NEW.id, '2024-01-08', 'Día de los Reyes Magos', true),
    (NEW.id, '2024-03-25', 'Día de San José', true),
    (NEW.id, '2024-03-28', 'Jueves Santo', true),
    (NEW.id, '2024-03-29', 'Viernes Santo', true),
    (NEW.id, '2024-05-01', 'Día del Trabajo', true),
    (NEW.id, '2024-05-13', 'Día de la Ascensión', true),
    (NEW.id, '2024-06-03', 'Corpus Christi', true),
    (NEW.id, '2024-06-10', 'Sagrado Corazón', true),
    (NEW.id, '2024-07-01', 'San Pedro y San Pablo', true),
    (NEW.id, '2024-07-20', 'Día de la Independencia', true),
    (NEW.id, '2024-08-07', 'Batalla de Boyacá', true),
    (NEW.id, '2024-08-19', 'Asunción de la Virgen', true),
    (NEW.id, '2024-10-14', 'Día de la Raza', true),
    (NEW.id, '2024-11-04', 'Día de Todos los Santos', true),
    (NEW.id, '2024-11-11', 'Independencia de Cartagena', true),
    (NEW.id, '2024-12-08', 'Inmaculada Concepción', true),
    (NEW.id, '2024-12-25', 'Navidad', true),
    -- 2025
    (NEW.id, '2025-01-01', 'Año Nuevo', true),
    (NEW.id, '2025-01-06', 'Día de los Reyes Magos', true),
    (NEW.id, '2025-03-24', 'Día de San José', true),
    (NEW.id, '2025-04-17', 'Jueves Santo', true),
    (NEW.id, '2025-04-18', 'Viernes Santo', true),
    (NEW.id, '2025-05-01', 'Día del Trabajo', true),
    (NEW.id, '2025-05-02', 'Día de la Ascensión', true),
    (NEW.id, '2025-06-23', 'Corpus Christi', true),
    (NEW.id, '2025-06-30', 'Sagrado Corazón', true),
    (NEW.id, '2025-06-30', 'San Pedro y San Pablo', true),
    (NEW.id, '2025-07-20', 'Día de la Independencia', true),
    (NEW.id, '2025-08-07', 'Batalla de Boyacá', true),
    (NEW.id, '2025-08-18', 'Asunción de la Virgen', true),
    (NEW.id, '2025-10-13', 'Día de la Raza', true),
    (NEW.id, '2025-11-03', 'Día de Todos los Santos', true),
    (NEW.id, '2025-11-17', 'Independencia de Cartagena', true),
    (NEW.id, '2025-12-08', 'Inmaculada Concepción', true),
    (NEW.id, '2025-12-25', 'Navidad', true),
    -- 2026
    (NEW.id, '2026-01-01', 'Año Nuevo', true),
    (NEW.id, '2026-01-12', 'Día de los Reyes Magos', true),
    (NEW.id, '2026-03-23', 'Día de San José', true),
    (NEW.id, '2026-04-02', 'Jueves Santo', true),
    (NEW.id, '2026-04-03', 'Viernes Santo', true),
    (NEW.id, '2026-05-01', 'Día del Trabajo', true),
    (NEW.id, '2026-05-18', 'Día de la Ascensión', true),
    (NEW.id, '2026-06-08', 'Corpus Christi', true),
    (NEW.id, '2026-06-15', 'Sagrado Corazón', true),
    (NEW.id, '2026-06-29', 'San Pedro y San Pablo', true),
    (NEW.id, '2026-07-20', 'Día de la Independencia', true),
    (NEW.id, '2026-08-07', 'Batalla de Boyacá', true),
    (NEW.id, '2026-08-17', 'Asunción de la Virgen', true),
    (NEW.id, '2026-10-12', 'Día de la Raza', true),
    (NEW.id, '2026-11-02', 'Día de Todos los Santos', true),
    (NEW.id, '2026-11-16', 'Independencia de Cartagena', true),
    (NEW.id, '2026-12-08', 'Inmaculada Concepción', true),
    (NEW.id, '2026-12-25', 'Navidad', true)
  ON CONFLICT (company_id, holiday_date) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-insert holidays for new companies
CREATE TRIGGER insert_company_holidays_trigger
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_default_holidays();

-- ============================================================
-- MIGRATION: 20260212160511_c9d6d494-cd42-4de4-8bc0-d76122c2b976.sql
-- ============================================================

-- =============================================
-- Table 1: payroll_labor_config
-- =============================================
CREATE TABLE public.payroll_labor_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  max_weekly_hours NUMERIC NOT NULL DEFAULT 46,
  daily_hours NUMERIC NOT NULL DEFAULT 8,
  display_unit TEXT NOT NULL DEFAULT 'hours',
  night_start TIME NOT NULL DEFAULT '21:00',
  night_end TIME NOT NULL DEFAULT '06:00',
  surcharge_hedo INTEGER NOT NULL DEFAULT 25,
  surcharge_heno INTEGER NOT NULL DEFAULT 75,
  surcharge_rn INTEGER NOT NULL DEFAULT 35,
  surcharge_hedf INTEGER NOT NULL DEFAULT 100,
  surcharge_henf INTEGER NOT NULL DEFAULT 150,
  surcharge_rnf INTEGER NOT NULL DEFAULT 110,
  surcharge_dominical INTEGER NOT NULL DEFAULT 75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id)
);

ALTER TABLE public.payroll_labor_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll config for their company"
  ON public.payroll_labor_config FOR SELECT
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can insert payroll config for their company"
  ON public.payroll_labor_config FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can update payroll config for their company"
  ON public.payroll_labor_config FOR UPDATE
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can delete payroll config for their company"
  ON public.payroll_labor_config FOR DELETE
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- =============================================
-- Table 2: payroll_novelties
-- =============================================
CREATE TABLE public.payroll_novelties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  novelty_date DATE NOT NULL,
  novelty_type TEXT NOT NULL CHECK (novelty_type IN (
    'jornada', 'hedo', 'heno', 'hedf', 'henf', 'rn', 'rnf',
    'dominical_trabajado', 'festivo_trabajado', 'descanso_remunerado',
    'incapacidad', 'vacaciones', 'permiso'
  )),
  hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_novelties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll novelties for their company"
  ON public.payroll_novelties FOR SELECT
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can insert payroll novelties for their company"
  ON public.payroll_novelties FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can update payroll novelties for their company"
  ON public.payroll_novelties FOR UPDATE
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can delete payroll novelties for their company"
  ON public.payroll_novelties FOR DELETE
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- Indexes
CREATE INDEX idx_payroll_novelties_employee ON public.payroll_novelties(employee_id);
CREATE INDEX idx_payroll_novelties_date ON public.payroll_novelties(novelty_date);
CREATE INDEX idx_payroll_novelties_company_date ON public.payroll_novelties(company_id, novelty_date);

-- Updated_at triggers
CREATE TRIGGER update_payroll_labor_config_updated_at
  BEFORE UPDATE ON public.payroll_labor_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_novelties_updated_at
  BEFORE UPDATE ON public.payroll_novelties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260212171524_06c237cf-bba9-46de-994e-9c6c5ba01c45.sql
-- ============================================================

-- Create novelty_reasons catalog table
CREATE TABLE public.novelty_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on company + item_number
ALTER TABLE public.novelty_reasons ADD CONSTRAINT novelty_reasons_company_item_unique UNIQUE (company_id, item_number);

-- Enable RLS
ALTER TABLE public.novelty_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view novelty_reasons of their company"
  ON public.novelty_reasons FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can insert novelty_reasons"
  ON public.novelty_reasons FOR INSERT
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "Admin/RRHH can update novelty_reasons"
  ON public.novelty_reasons FOR UPDATE
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "Admin/RRHH can delete novelty_reasons"
  ON public.novelty_reasons FOR DELETE
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- Trigger for updated_at
CREATE TRIGGER update_novelty_reasons_updated_at
  BEFORE UPDATE ON public.novelty_reasons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add new columns to payroll_novelties
ALTER TABLE public.payroll_novelties
  ADD COLUMN start_time TIME,
  ADD COLUMN end_time TIME,
  ADD COLUMN reason_id UUID REFERENCES public.novelty_reasons(id);


-- ============================================================
-- MIGRATION: 20260216152554_5840bf32-958e-45dc-8d54-50d79def6659.sql
-- ============================================================
-- Update function to delete ALL shift assignments (including rest days) for an absence period
CREATE OR REPLACE FUNCTION public.delete_shift_assignments_for_absence(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete ALL shift assignments (including rest days) in the given date range
  DELETE FROM employee_shift_assignments esa
  WHERE esa.employee_id = p_employee_id
    AND esa.assignment_date BETWEEN p_start_date AND p_end_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- ============================================================
-- MIGRATION: 20260224002121_88a8e429-4cb0-4ac7-8aa8-7d983ee0dbcc.sql
-- ============================================================

-- =============================================
-- FASE 1: Módulo de Capacitaciones - DB & Storage
-- =============================================

-- 1. ALTER TABLE training_courses: agregar columnas faltantes
ALTER TABLE public.training_courses 
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS legal_framework text,
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'borrador',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Change content column from text to jsonb for structured AI content
ALTER TABLE public.training_courses ALTER COLUMN content TYPE jsonb USING content::jsonb;

-- Make created_by NOT NULL (set existing nulls first)
UPDATE public.training_courses SET created_by = (SELECT auth.uid()) WHERE created_by IS NULL;

-- 2. ALTER TABLE training_attendance: agregar signature_data
ALTER TABLE public.training_attendance 
  ADD COLUMN IF NOT EXISTS signature_data text;

-- 3. CREATE TABLE training_access_tokens
CREATE TABLE public.training_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_type text NOT NULL DEFAULT 'solo_link',
  usage_type text NOT NULL DEFAULT 'multiple',
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  requires_evaluation boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. CREATE TABLE training_completions
CREATE TABLE public.training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.training_access_tokens(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees_v2(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  operator_name text NOT NULL,
  operator_cedula text,
  signature_data text NOT NULL,
  ip_address text,
  user_agent text
);

-- 5. CREATE TABLE training_media
CREATE TABLE public.training_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size integer,
  duration integer,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable RLS on new tables
ALTER TABLE public.training_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_media ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for training_access_tokens
-- Authenticated users: full CRUD by company
CREATE POLICY "Users can manage access tokens for their company"
  ON public.training_access_tokens
  FOR ALL
  TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- Anon: SELECT to validate tokens
CREATE POLICY "Anon can validate access tokens"
  ON public.training_access_tokens
  FOR SELECT
  TO anon
  USING (is_active = true AND expires_at > now());

-- Anon: UPDATE to increment uses_count
CREATE POLICY "Anon can increment token usage"
  ON public.training_access_tokens
  FOR UPDATE
  TO anon
  USING (is_active = true AND expires_at > now())
  WITH CHECK (is_active = true AND expires_at > now());

-- 8. RLS Policies for training_completions
-- Authenticated users: read by company
CREATE POLICY "Users can read completions for their company"
  ON public.training_completions
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- Authenticated users: delete by company
CREATE POLICY "Users can delete completions for their company"
  ON public.training_completions
  FOR DELETE
  TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- Anon: INSERT completions (public flow)
CREATE POLICY "Anon can insert completions"
  ON public.training_completions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 9. RLS Policies for training_media
CREATE POLICY "Users can manage media for their company courses"
  ON public.training_media
  FOR ALL
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM public.training_courses 
      WHERE company_id IN (SELECT public.get_user_company_ids())
    )
  );

-- Anon: SELECT media (needed for public access flow)
CREATE POLICY "Anon can view media"
  ON public.training_media
  FOR SELECT
  TO anon
  USING (true);

-- 10. Storage bucket for training media
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-media', 'training-media', true)
ON CONFLICT (id) DO NOTHING;

-- 11. Storage RLS policies
CREATE POLICY "Authenticated users can upload training media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'training-media');

CREATE POLICY "Anyone can view training media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'training-media');

CREATE POLICY "Authenticated users can delete training media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'training-media');

-- 12. Anon policy: SELECT on training_courses for public access
CREATE POLICY "Anon can view active courses"
  ON public.training_courses
  FOR SELECT
  TO anon
  USING (is_active = true AND status = 'publicado');

-- 13. Updated_at triggers for new tables (reuse existing function)
CREATE TRIGGER update_training_access_tokens_updated_at
  BEFORE UPDATE ON public.training_access_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260227191556_5c8124e5-1265-4de6-be65-35e40466e493.sql
-- ============================================================
ALTER TABLE public.training_access_tokens 
ADD COLUMN operation_center_id UUID REFERENCES public.operation_centers(id) DEFAULT NULL;

-- ============================================================
-- MIGRATION: 20260227195417_6efa2040-ef60-461d-a584-a509ce9f5a94.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_employee_cedula(p_cedula text, p_company_id uuid)
RETURNS TABLE(employee_id uuid, employee_name text) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, first_name || ' ' || COALESCE(last_name, '')
  FROM public.employees_v2 
  WHERE document_number = p_cedula AND company_id = p_company_id AND is_active = true
  LIMIT 1;
$$;


-- ============================================================
-- MIGRATION: 20260228001238_6206366b-998f-4ade-86fe-09af4eb62d6d.sql
-- ============================================================
ALTER TABLE public.training_completions ADD COLUMN IF NOT EXISTS quiz_score integer;

-- ============================================================
-- MIGRATION: 20260228004035_45ce878e-03fc-4b21-a860-2bfa0abb4e84.sql
-- ============================================================
-- Fix training completion insert policy for public links used by both anonymous and authenticated sessions
DROP POLICY IF EXISTS "Anon can insert completions" ON public.training_completions;

CREATE POLICY "Public can insert completions with valid token"
ON public.training_completions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  token_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.training_access_tokens t
    WHERE t.id = training_completions.token_id
      AND t.is_active = true
      AND t.expires_at > now()
      AND t.company_id = training_completions.company_id
      AND t.course_id = training_completions.course_id
      AND (
        t.usage_type <> 'unico'
        OR COALESCE(t.uses_count, 0) < COALESCE(t.max_uses, 1)
      )
  )
);

-- ============================================================
-- MIGRATION: 20260228144001_a19bae6a-d3f3-4a8f-8496-0f4cdce2b6f6.sql
-- ============================================================
ALTER TABLE public.training_access_tokens ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ============================================================
-- MIGRATION: 20260228172436_0c71de10-6d98-4aa1-bd59-3949ce8090d3.sql
-- ============================================================

ALTER TABLE evaluation_templates
  ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE evaluation_criteria
  ADD COLUMN level_4_description TEXT,
  ADD COLUMN level_3_description TEXT,
  ADD COLUMN level_2_description TEXT,
  ADD COLUMN level_1_description TEXT;

ALTER TABLE evaluation_templates
  ADD COLUMN qualitative_questions JSONB DEFAULT '["¿Qué aportes ha hecho usted a la empresa, área o campo donde se desempeña?", "¿En qué aspectos opina usted que debe mejorar?", "Teniendo en cuenta los aspectos en donde la calificación no es muy buena, ¿Qué compromisos va a adquirir para mejorar?"]'::jsonb,
  ADD COLUMN rating_scale JSONB DEFAULT '[{"label":"Sobresaliente","min":91,"max":100,"description":"Mantener el compromiso hasta ahora alcanzado"},{"label":"Bueno","min":75,"max":90,"description":"Trabajar en mejora continua"},{"label":"Aceptable","min":60,"max":74,"description":"Requiere capacitación continua"},{"label":"Deficiente","min":0,"max":59,"description":"Requiere cumplimiento inmediato"}]'::jsonb;


-- ============================================================
-- MIGRATION: 20260301112806_0988f8d8-7dd9-4795-bb62-19fa8e07b99d.sql
-- ============================================================

-- Tabla intermedia many-to-many
CREATE TABLE public.evaluation_template_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, position_id)
);

-- Migrar datos existentes
INSERT INTO public.evaluation_template_positions (template_id, position_id)
SELECT id, position_id FROM public.evaluation_templates WHERE position_id IS NOT NULL;

-- Eliminar columna vieja
ALTER TABLE public.evaluation_templates DROP COLUMN IF EXISTS position_id;

-- RLS
ALTER TABLE public.evaluation_template_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template positions for their company"
ON public.evaluation_template_positions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.evaluation_templates et
    WHERE et.id = template_id
    AND et.company_id IN (SELECT public.get_user_company_ids())
  )
);


-- ============================================================
-- MIGRATION: 20260301170343_ae2aab41-1f72-4bf1-8503-37c35dbd9dae.sql
-- ============================================================

-- 1. New table for defense tokens
CREATE TABLE public.disciplinary_defense_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.disciplinary_processes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. New column on defenses
ALTER TABLE public.disciplinary_defenses
  ADD COLUMN submitted_via_token BOOLEAN NOT NULL DEFAULT false;

-- 3. Enable RLS
ALTER TABLE public.disciplinary_defense_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Public SELECT by token (anon + authenticated)
CREATE POLICY "Public can read token by token value"
  ON public.disciplinary_defense_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Company members can insert tokens
CREATE POLICY "Company members can insert tokens"
  ON public.disciplinary_defense_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

-- 6. Company members can update tokens
CREATE POLICY "Company members can update tokens"
  ON public.disciplinary_defense_tokens
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id));

-- 7. RPC function to submit defense via token (security definer)
CREATE OR REPLACE FUNCTION public.submit_defense_via_token(
  p_token TEXT,
  p_content TEXT,
  p_defense_type TEXT DEFAULT 'escrito'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_token_row disciplinary_defense_tokens%ROWTYPE;
  v_defense_id UUID;
BEGIN
  -- Validate token
  SELECT * INTO v_token_row
  FROM disciplinary_defense_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  IF v_token_row.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  -- Insert defense
  INSERT INTO disciplinary_defenses (process_id, defense_date, defense_type, content, submitted_via_token)
  VALUES (v_token_row.process_id, CURRENT_DATE::text, p_defense_type, p_content, true)
  RETURNING id INTO v_defense_id;

  -- Mark token as used
  UPDATE disciplinary_defense_tokens
  SET is_used = true, used_at = now()
  WHERE id = v_token_row.id;

  -- Add timeline entry
  INSERT INTO disciplinary_timeline (process_id, action_type, description, new_status)
  VALUES (
    v_token_row.process_id,
    'descargos_via_token',
    'Descargos presentados por el empleado a través de enlace',
    NULL
  );

  RETURN json_build_object('success', true, 'defense_id', v_defense_id);
END;
$$;


-- ============================================================
-- MIGRATION: 20260301171839_e4e0e55c-cfd2-48c7-9ce6-60b558d71465.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_defense_via_token(p_token text, p_content text, p_defense_type text DEFAULT 'escrito'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token_row disciplinary_defense_tokens%ROWTYPE;
  v_defense_id UUID;
BEGIN
  SELECT * INTO v_token_row
  FROM disciplinary_defense_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  IF v_token_row.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  INSERT INTO disciplinary_defenses (process_id, defense_date, defense_type, content, submitted_via_token)
  VALUES (v_token_row.process_id, CURRENT_DATE, p_defense_type, p_content, true)
  RETURNING id INTO v_defense_id;

  UPDATE disciplinary_defense_tokens
  SET is_used = true, used_at = now()
  WHERE id = v_token_row.id;

  INSERT INTO disciplinary_timeline (process_id, action_type, description, new_status)
  VALUES (
    v_token_row.process_id,
    'descargos_via_token',
    'Descargos presentados por el empleado a través de enlace',
    NULL
  );

  RETURN json_build_object('success', true, 'defense_id', v_defense_id);
END;
$function$;


-- ============================================================
-- MIGRATION: 20260301175604_87728b4c-2b2a-4b17-8729-6fcde65fa883.sql
-- ============================================================

-- Create dotation_inventory table
CREATE TABLE public.dotation_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id UUID REFERENCES public.operation_centers(id) ON DELETE SET NULL,
  item_type public.dotation_item_type NOT NULL,
  item_name TEXT NOT NULL,
  size TEXT,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dotation_inventory_unique UNIQUE (company_id, operation_center_id, item_type, item_name, size)
);

-- Enable RLS
ALTER TABLE public.dotation_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies: company members can read
CREATE POLICY "Company members can view inventory"
  ON public.dotation_inventory
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

-- Admin/RRHH can insert
CREATE POLICY "Admin/RRHH can insert inventory"
  ON public.dotation_inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- Admin/RRHH can update
CREATE POLICY "Admin/RRHH can update inventory"
  ON public.dotation_inventory
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- Admin/RRHH can delete
CREATE POLICY "Admin/RRHH can delete inventory"
  ON public.dotation_inventory
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- Updated_at trigger
CREATE TRIGGER update_dotation_inventory_updated_at
  BEFORE UPDATE ON public.dotation_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260301190553_a3326025-7ffe-46a7-912c-c7004f197654.sql
-- ============================================================

-- Table to track all inventory stock movements
CREATE TABLE public.dotation_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  inventory_item_id UUID NOT NULL REFERENCES public.dotation_inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste', 'entrega', 'devolucion')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL DEFAULT 0,
  new_stock INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  reference_id UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_inventory_movements_item ON public.dotation_inventory_movements(inventory_item_id);
CREATE INDEX idx_inventory_movements_company ON public.dotation_inventory_movements(company_id);
CREATE INDEX idx_inventory_movements_created ON public.dotation_inventory_movements(created_at DESC);

-- RLS
ALTER TABLE public.dotation_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view inventory movements"
  ON public.dotation_inventory_movements
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can insert inventory movements"
  ON public.dotation_inventory_movements
  FOR INSERT
  WITH CHECK (public.is_admin_or_rrhh());


-- ============================================================
-- MIGRATION: 20260302023049_395015d3-9bdf-4393-8974-30eb7249bf24.sql
-- ============================================================

-- Create dotation_profesiograma table
CREATE TABLE public.dotation_profesiograma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id UUID NOT NULL REFERENCES public.operation_centers(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, operation_center_id, position_id)
);

-- Create dotation_profesiograma_items table
CREATE TABLE public.dotation_profesiograma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesiograma_id UUID NOT NULL REFERENCES public.dotation_profesiograma(id) ON DELETE CASCADE,
  dotation_item_type_id UUID NOT NULL REFERENCES public.dotation_item_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profesiograma_id, dotation_item_type_id)
);

-- Enable RLS
ALTER TABLE public.dotation_profesiograma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dotation_profesiograma_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for dotation_profesiograma
CREATE POLICY "Company members can view profesiogramas"
  ON public.dotation_profesiograma
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can insert profesiogramas"
  ON public.dotation_profesiograma
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "Admin/RRHH can update profesiogramas"
  ON public.dotation_profesiograma
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE POLICY "Admin/RRHH can delete profesiogramas"
  ON public.dotation_profesiograma
  FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

-- RLS policies for dotation_profesiograma_items (access through parent)
CREATE POLICY "Members can view profesiograma items"
  ON public.dotation_profesiograma_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dotation_profesiograma dp
    WHERE dp.id = profesiograma_id AND public.is_company_member(dp.company_id)
  ));

CREATE POLICY "Admin/RRHH can insert profesiograma items"
  ON public.dotation_profesiograma_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dotation_profesiograma dp
    WHERE dp.id = profesiograma_id AND public.is_company_member(dp.company_id) AND public.is_admin_or_rrhh()
  ));

CREATE POLICY "Admin/RRHH can update profesiograma items"
  ON public.dotation_profesiograma_items
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dotation_profesiograma dp
    WHERE dp.id = profesiograma_id AND public.is_company_member(dp.company_id) AND public.is_admin_or_rrhh()
  ));

CREATE POLICY "Admin/RRHH can delete profesiograma items"
  ON public.dotation_profesiograma_items
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dotation_profesiograma dp
    WHERE dp.id = profesiograma_id AND public.is_company_member(dp.company_id) AND public.is_admin_or_rrhh()
  ));

-- Updated_at trigger
CREATE TRIGGER update_dotation_profesiograma_updated_at
  BEFORE UPDATE ON public.dotation_profesiograma
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260302115150_45e7d835-215e-4bac-ad42-af5ec48c65d7.sql
-- ============================================================
ALTER TABLE public.dotation_profesiograma_items 
ADD COLUMN is_required BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- MIGRATION: 20260302123541_54fb0673-b2e5-4aee-85eb-1caded9ced0b.sql
-- ============================================================

-- Add image_url column to dotation_item_types
ALTER TABLE public.dotation_item_types ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for dotation images
INSERT INTO storage.buckets (id, name, public) VALUES ('dotation-images', 'dotation-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload dotation images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dotation-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update dotation images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'dotation-images');

-- Allow public read access
CREATE POLICY "Public can view dotation images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'dotation-images');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete dotation images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dotation-images');


-- ============================================================
-- MIGRATION: 20260303141613_c1a8cb85-4d20-4a36-9a16-bdcc43a47b96.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_profesiogramas_with_items(_company_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(prof_row ORDER BY prof_row.created_at DESC), '[]'::json)
  FROM (
    SELECT 
      p.id,
      p.company_id,
      p.operation_center_id,
      p.position_id,
      p.created_at,
      p.updated_at,
      json_build_object('id', oc.id, 'name', oc.name) AS operation_centers,
      json_build_object('id', pos.id, 'name', pos.name) AS positions,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', pi.id,
          'profesiograma_id', pi.profesiograma_id,
          'dotation_item_type_id', pi.dotation_item_type_id,
          'quantity', pi.quantity,
          'notes', pi.notes,
          'is_required', pi.is_required,
          'dotation_item_types', json_build_object(
            'id', dit.id,
            'name', dit.name,
            'code', dit.code,
            'category', dit.category,
            'requires_size', dit.requires_size,
            'sizes_available', dit.sizes_available,
            'default_validity_months', dit.default_validity_months
          )
        ))
        FROM dotation_profesiograma_items pi
        JOIN dotation_item_types dit ON dit.id = pi.dotation_item_type_id
        WHERE pi.profesiograma_id = p.id),
        '[]'::json
      ) AS items
    FROM dotation_profesiograma p
    LEFT JOIN operation_centers oc ON oc.id = p.operation_center_id
    LEFT JOIN positions pos ON pos.id = p.position_id
    WHERE p.company_id = _company_id
  ) prof_row
$$;


-- ============================================================
-- MIGRATION: 20260303153640_c51b4014-e811-4606-8777-d31fd3d02c6e.sql
-- ============================================================

-- Change item_type from enum to text to support catalog UUIDs
ALTER TABLE public.dotation_inventory ALTER COLUMN item_type TYPE text;


-- ============================================================
-- MIGRATION: 20260303173858_aa90e5ad-ab5b-4c71-9957-6ec91541c6d3.sql
-- ============================================================

-- Fix RLS policies on dotation_deliveries to use employees_v2
DROP POLICY IF EXISTS "Admin and RRHH can manage dotation" ON public.dotation_deliveries;
DROP POLICY IF EXISTS "Users can view accessible dotation" ON public.dotation_deliveries;

CREATE POLICY "Admin and RRHH can manage dotation"
ON public.dotation_deliveries
FOR ALL
TO authenticated
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible dotation"
ON public.dotation_deliveries
FOR SELECT
TO authenticated
USING (has_employee_v2_access(employee_id));


-- ============================================================
-- MIGRATION: 20260303205225_aa4cd709-27d5-439e-8be2-8c33f16ce6fa.sql
-- ============================================================
ALTER TABLE public.dotation_deliveries
DROP CONSTRAINT IF EXISTS dotation_deliveries_employee_id_fkey;

ALTER TABLE public.dotation_deliveries
ADD CONSTRAINT dotation_deliveries_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees_v2(id)
ON UPDATE CASCADE
ON DELETE RESTRICT;

-- ============================================================
-- MIGRATION: 20260304004114_9b347e50-2b72-41be-b709-96af9a122f29.sql
-- ============================================================

-- Create the transaction header table
CREATE TABLE public.dotation_delivery_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  delivered_by TEXT,
  received_by TEXT,
  signature_url TEXT,
  document_url TEXT,
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add transaction_id to deliveries
ALTER TABLE public.dotation_deliveries 
  ADD COLUMN transaction_id UUID REFERENCES public.dotation_delivery_transactions(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.dotation_delivery_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies matching the existing pattern
CREATE POLICY "Admin and RRHH can manage delivery transactions"
  ON public.dotation_delivery_transactions
  FOR ALL
  TO authenticated
  USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
  WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible delivery transactions"
  ON public.dotation_delivery_transactions
  FOR SELECT
  TO authenticated
  USING (has_employee_v2_access(employee_id));

-- Migrate existing data: group by employee_id + delivery_date + created_by
INSERT INTO public.dotation_delivery_transactions (employee_id, delivery_date, delivered_by, received_by, signature_url, document_url, observations, created_by, created_at)
SELECT 
  employee_id,
  delivery_date,
  MAX(delivered_by),
  MAX(received_by),
  MAX(signature_url),
  MAX(document_url),
  MAX(observations),
  created_by,
  MIN(created_at)
FROM public.dotation_deliveries
GROUP BY employee_id, delivery_date, created_by;

-- Link existing deliveries to their transactions
UPDATE public.dotation_deliveries d
SET transaction_id = t.id
FROM public.dotation_delivery_transactions t
WHERE d.employee_id = t.employee_id 
  AND d.delivery_date = t.delivery_date
  AND COALESCE(d.created_by, '00000000-0000-0000-0000-000000000000') = COALESCE(t.created_by, '00000000-0000-0000-0000-000000000000');

-- Timestamp trigger
CREATE TRIGGER update_dotation_delivery_transactions_updated_at
  BEFORE UPDATE ON public.dotation_delivery_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260304114637_a3d7dfd5-9ecb-40f7-9f8d-3f5a106df895.sql
-- ============================================================
ALTER TYPE public.exam_type ADD VALUE IF NOT EXISTS 'post_incapacidad';
ALTER TYPE public.exam_type ADD VALUE IF NOT EXISTS 'cambio_cargo';
ALTER TYPE public.exam_type ADD VALUE IF NOT EXISTS 'seguimiento';

-- ============================================================
-- MIGRATION: 20260304120553_837e7318-58e9-49a2-b6c0-07d1c54c53c5.sql
-- ============================================================

-- 1. Exam Catalog table (equivalent to dotation_item_types)
CREATE TABLE public.exam_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.exam_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam catalog for their company"
  ON public.exam_catalog FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can manage exam catalog"
  ON public.exam_catalog FOR ALL TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE TRIGGER update_exam_catalog_updated_at
  BEFORE UPDATE ON public.exam_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Exam Profesiograma table
CREATE TABLE public.exam_profesiograma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id UUID NOT NULL REFERENCES public.operation_centers(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, operation_center_id, position_id)
);

ALTER TABLE public.exam_profesiograma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam profesiograma for their company"
  ON public.exam_profesiograma FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can manage exam profesiograma"
  ON public.exam_profesiograma FOR ALL TO authenticated
  USING (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
  WITH CHECK (public.is_company_member(company_id) AND public.is_admin_or_rrhh());

CREATE TRIGGER update_exam_profesiograma_updated_at
  BEFORE UPDATE ON public.exam_profesiograma
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Exam Profesiograma Items table
CREATE TABLE public.exam_profesiograma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesiograma_id UUID NOT NULL REFERENCES public.exam_profesiograma(id) ON DELETE CASCADE,
  exam_catalog_id UUID NOT NULL REFERENCES public.exam_catalog(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profesiograma_id, exam_catalog_id)
);

ALTER TABLE public.exam_profesiograma_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam profesiograma items"
  ON public.exam_profesiograma_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exam_profesiograma ep
    WHERE ep.id = profesiograma_id AND public.is_company_member(ep.company_id)
  ));

CREATE POLICY "Admin/RRHH can manage exam profesiograma items"
  ON public.exam_profesiograma_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exam_profesiograma ep
    WHERE ep.id = profesiograma_id AND public.is_company_member(ep.company_id) AND public.is_admin_or_rrhh()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exam_profesiograma ep
    WHERE ep.id = profesiograma_id AND public.is_company_member(ep.company_id) AND public.is_admin_or_rrhh()
  ));

-- 4. Exam Delivery Transactions table (header)
CREATE TABLE public.exam_delivery_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exam_type TEXT NOT NULL DEFAULT 'periodico',
  provider TEXT,
  doctor_name TEXT,
  signature_url TEXT,
  document_url TEXT,
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_delivery_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam transactions"
  ON public.exam_delivery_transactions FOR SELECT TO authenticated
  USING (public.has_employee_v2_access(employee_id));

CREATE POLICY "Admin/RRHH can manage exam transactions"
  ON public.exam_delivery_transactions FOR ALL TO authenticated
  USING (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh())
  WITH CHECK (public.has_employee_v2_access(employee_id) AND public.is_admin_or_rrhh());

CREATE TRIGGER update_exam_delivery_transactions_updated_at
  BEFORE UPDATE ON public.exam_delivery_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Exam Delivery Items table (detail)
CREATE TABLE public.exam_delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.exam_delivery_transactions(id) ON DELETE CASCADE,
  exam_catalog_id UUID REFERENCES public.exam_catalog(id),
  exam_name TEXT NOT NULL,
  result TEXT NOT NULL DEFAULT 'pendiente',
  concept TEXT,
  restrictions TEXT,
  expiration_date DATE,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam delivery items"
  ON public.exam_delivery_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exam_delivery_transactions edt
    WHERE edt.id = transaction_id AND public.has_employee_v2_access(edt.employee_id)
  ));

CREATE POLICY "Admin/RRHH can manage exam delivery items"
  ON public.exam_delivery_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.exam_delivery_transactions edt
    WHERE edt.id = transaction_id AND public.has_employee_v2_access(edt.employee_id) AND public.is_admin_or_rrhh()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exam_delivery_transactions edt
    WHERE edt.id = transaction_id AND public.has_employee_v2_access(edt.employee_id) AND public.is_admin_or_rrhh()
  ));

-- 6. RPC function for exam profesiogramas with items
CREATE OR REPLACE FUNCTION public.get_exam_profesiogramas_with_items(_company_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(json_agg(prof_row ORDER BY prof_row.created_at DESC), '[]'::json)
  FROM (
    SELECT 
      p.id,
      p.company_id,
      p.operation_center_id,
      p.position_id,
      p.created_at,
      p.updated_at,
      json_build_object('id', oc.id, 'name', oc.name) AS operation_centers,
      json_build_object('id', pos.id, 'name', pos.name) AS positions,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', pi.id,
          'profesiograma_id', pi.profesiograma_id,
          'exam_catalog_id', pi.exam_catalog_id,
          'notes', pi.notes,
          'is_required', pi.is_required,
          'exam_catalog', json_build_object(
            'id', ec.id,
            'name', ec.name,
            'code', ec.code,
            'description', ec.description
          )
        ))
        FROM exam_profesiograma_items pi
        JOIN exam_catalog ec ON ec.id = pi.exam_catalog_id
        WHERE pi.profesiograma_id = p.id),
        '[]'::json
      ) AS items
    FROM exam_profesiograma p
    LEFT JOIN operation_centers oc ON oc.id = p.operation_center_id
    LEFT JOIN positions pos ON pos.id = p.position_id
    WHERE p.company_id = _company_id
  ) prof_row
$$;


-- ============================================================
-- MIGRATION: 20260304184859_05cca419-b0c1-496c-a0bf-ecd77fef56ba.sql
-- ============================================================

-- Table: position_profiles
CREATE TABLE public.position_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  purpose TEXT,
  reports_to TEXT,
  supervises TEXT,
  num_positions INTEGER DEFAULT 1,
  education_level TEXT,
  education_detail TEXT,
  experience TEXT,
  specific_knowledge JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  functions JSONB DEFAULT '[]'::jsonb,
  responsibilities JSONB DEFAULT '{}'::jsonb,
  working_conditions JSONB DEFAULT '{}'::jsonb,
  elaborated_by TEXT,
  reviewed_by TEXT,
  approved_by TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one current version per position per company
CREATE UNIQUE INDEX position_profiles_current_unique 
  ON public.position_profiles (company_id, position_id) 
  WHERE is_current = true;

-- Updated_at trigger
CREATE TRIGGER update_position_profiles_updated_at
  BEFORE UPDATE ON public.position_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: when inserting a new current version, mark previous versions as not current
CREATE OR REPLACE FUNCTION public.handle_position_profile_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.position_profiles
    SET is_current = false
    WHERE position_id = NEW.position_id
      AND company_id = NEW.company_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_position_profile_version
  BEFORE INSERT ON public.position_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_position_profile_version();

-- RLS
ALTER TABLE public.position_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view position profiles"
  ON public.position_profiles FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin or RRHH can insert position profiles"
  ON public.position_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin or RRHH can update position profiles"
  ON public.position_profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin or RRHH can delete position profiles"
  ON public.position_profiles FOR DELETE
  TO authenticated
  USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));


-- ============================================================
-- MIGRATION: 20260304195414_1c6f6206-70de-4e63-b1df-9b6c4528e64f.sql
-- ============================================================

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


-- ============================================================
-- MIGRATION: 20260304195703_a66e76e9-e936-4e5a-bf1a-fd6fd87f3cb8.sql
-- ============================================================

-- Auto-create Administrador role for new companies
CREATE OR REPLACE FUNCTION public.insert_default_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  _role_id UUID;
BEGIN
  INSERT INTO public.custom_roles (company_id, name, description, is_system, is_active)
  VALUES (NEW.id, 'Administrador', 'Rol con acceso total al sistema. No se puede eliminar ni quitar permisos.', true, true)
  RETURNING id INTO _role_id;
  
  -- Assign all permissions to the admin role (though is_system=true bypasses checks)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT _role_id, p.id FROM public.permissions p;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_admin_role_for_company
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.insert_default_admin_role();


-- ============================================================
-- MIGRATION: 20260306153834_db1d61c9-094a-4cd8-aa56-eccf88792e30.sql
-- ============================================================

CREATE TABLE public.session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT DEFAULT 'desktop',
  city TEXT,
  country TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session logs"
  ON public.session_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all session logs"
  ON public.session_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Authenticated users can insert their own session logs"
  ON public.session_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_session_logs_user_id ON public.session_logs (user_id);
CREATE INDEX idx_session_logs_login_at ON public.session_logs (login_at DESC);


-- ============================================================
-- MIGRATION: 20260306154856_f8e34b78-a90d-4814-91f5-aa25a6c46e90.sql
-- ============================================================

-- Login attempts tracking table for account lockout
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text
);

-- Index for fast lookups by email
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);

-- Auto-cleanup old attempts (older than 24h) via a function
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '24 hours';
$$;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.check_account_locked(p_email text, p_max_attempts int DEFAULT 5, p_lockout_minutes int DEFAULT 15)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_failed_count int;
  v_last_attempt timestamptz;
  v_locked_until timestamptz;
BEGIN
  -- Count failed attempts in the lockout window
  SELECT COUNT(*), MAX(attempted_at) INTO v_failed_count, v_last_attempt
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > now() - (p_lockout_minutes || ' minutes')::interval;

  IF v_failed_count >= p_max_attempts THEN
    v_locked_until := v_last_attempt + (p_lockout_minutes || ' minutes')::interval;
    RETURN json_build_object(
      'locked', true,
      'failed_attempts', v_failed_count,
      'locked_until', v_locked_until,
      'remaining_minutes', EXTRACT(EPOCH FROM (v_locked_until - now())) / 60
    );
  END IF;

  RETURN json_build_object(
    'locked', false,
    'failed_attempts', v_failed_count,
    'remaining_attempts', p_max_attempts - v_failed_count
  );
END;
$$;

-- RLS: login_attempts is managed by security definer functions, allow insert for anon/authenticated
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert login attempts" ON public.login_attempts
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow select own login attempts" ON public.login_attempts
  FOR SELECT TO anon, authenticated
  USING (true);


-- ============================================================
-- MIGRATION: 20260306173454_1e8aa0b8-28df-415d-88d2-ce23cb1e2e1a.sql
-- ============================================================
-- Fix medical_exams RLS policies to use has_employee_v2_access instead of has_employee_access
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage exams" ON public.medical_exams;
DROP POLICY IF EXISTS "Users can view accessible exams" ON public.medical_exams;

CREATE POLICY "Admin RRHH and Psicologo can manage exams"
ON public.medical_exams
FOR ALL
TO authenticated
USING ((is_admin_or_rrhh() OR is_psicologo()) AND has_employee_v2_access(employee_id))
WITH CHECK ((is_admin_or_rrhh() OR is_psicologo()) AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible exams"
ON public.medical_exams
FOR SELECT
TO authenticated
USING (has_employee_v2_access(employee_id));

-- ============================================================
-- MIGRATION: 20260306174729_cf5be10b-7701-4baa-aea3-a05eca632949.sql
-- ============================================================
-- Fix recruitment hiring flow: align foreign keys with normalized employees_v2 model
-- Keep as NOT VALID to preserve legacy rows that may still reference old employees IDs.

ALTER TABLE public.medical_exams
DROP CONSTRAINT IF EXISTS medical_exams_employee_id_fkey;

ALTER TABLE public.medical_exams
ADD CONSTRAINT medical_exams_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees_v2(id)
ON DELETE CASCADE
NOT VALID;

ALTER TABLE public.candidates
DROP CONSTRAINT IF EXISTS candidates_employee_id_fkey;

ALTER TABLE public.candidates
ADD CONSTRAINT candidates_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees_v2(id)
ON DELETE SET NULL
NOT VALID;

-- ============================================================
-- MIGRATION: 20260306180510_0c3afa88-3358-4019-ada6-465b5790c29b.sql
-- ============================================================
-- Onboarding checklist table for new employees
CREATE TABLE public.employee_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  task_label TEXT NOT NULL,
  task_description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, task_key)
);

ALTER TABLE public.employee_onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view onboarding tasks for their company"
  ON public.employee_onboarding_tasks FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert onboarding tasks for their company"
  ON public.employee_onboarding_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update onboarding tasks for their company"
  ON public.employee_onboarding_tasks FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id));

-- ============================================================
-- MIGRATION: 20260307145836_b9d9277a-552a-4fc7-bedd-da6b694eedbd.sql
-- ============================================================

-- Fix FK: employee_terminations.employee_id should reference employees_v2 instead of employees
ALTER TABLE public.employee_terminations
  DROP CONSTRAINT employee_terminations_employee_id_fkey;

ALTER TABLE public.employee_terminations
  ADD CONSTRAINT employee_terminations_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees_v2(id) ON DELETE CASCADE;


-- ============================================================
-- MIGRATION: 20260308193017_0e04ac66-5880-4771-8a69-a44310035e86.sql
-- ============================================================

CREATE TABLE public.onboarding_task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  task_label TEXT NOT NULL,
  task_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, position_id, task_key)
);

ALTER TABLE public.onboarding_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view templates"
  ON public.onboarding_task_templates
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin/RRHH can manage templates"
  ON public.onboarding_task_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_rrhh())
  WITH CHECK (public.is_admin_or_rrhh());

CREATE TRIGGER update_onboarding_task_templates_updated_at
  BEFORE UPDATE ON public.onboarding_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260317202221_5b8f62bf-9774-49ed-87ec-1c947faa0a18.sql
-- ============================================================
ALTER TABLE public.vacancies ADD COLUMN position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

-- ============================================================
-- MIGRATION: 20260317205443_70421831-bda4-4cf2-9cd1-7ff1457afcfd.sql
-- ============================================================

ALTER TABLE public.personnel_requisitions
  ADD COLUMN turno_trabajo_id uuid REFERENCES public.shifts(id) DEFAULT NULL,
  ADD COLUMN incluye_alimentacion boolean DEFAULT false,
  ADD COLUMN incluye_desplazamiento boolean DEFAULT false,
  ADD COLUMN trayecto_desplazamiento text DEFAULT NULL;


-- ============================================================
-- MIGRATION: 20260317214201_80762eff-ef0e-4807-a67a-1e0c1fdc140a.sql
-- ============================================================

-- 1. Create platforms catalog
CREATE TABLE public.vacancy_publication_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.vacancy_publication_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view platforms" ON public.vacancy_publication_platforms
  FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert platforms" ON public.vacancy_publication_platforms
  FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update platforms" ON public.vacancy_publication_platforms
  FOR UPDATE TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete platforms" ON public.vacancy_publication_platforms
  FOR DELETE TO authenticated USING (public.is_company_member(company_id));

-- 2. Add platform_id to existing requisition_vacancy_codes
ALTER TABLE public.requisition_vacancy_codes
  ADD COLUMN IF NOT EXISTS platform_id UUID REFERENCES public.vacancy_publication_platforms(id) ON DELETE CASCADE;

-- 3. Add seleccion fields if not already added
ALTER TABLE public.personnel_requisitions
  ADD COLUMN IF NOT EXISTS seleccion_perfil_cargo_creado BOOLEAN,
  ADD COLUMN IF NOT EXISTS seleccion_tipo_mano_obra TEXT;

-- 4. RLS on requisition_vacancy_codes
ALTER TABLE public.requisition_vacancy_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view vacancy codes" ON public.requisition_vacancy_codes;
  DROP POLICY IF EXISTS "Users can insert vacancy codes" ON public.requisition_vacancy_codes;
  DROP POLICY IF EXISTS "Users can delete vacancy codes" ON public.requisition_vacancy_codes;
END $$;

CREATE POLICY "Users can view vacancy codes" ON public.requisition_vacancy_codes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.personnel_requisitions pr WHERE pr.id = requisition_id AND public.is_company_member(pr.company_id))
  );
CREATE POLICY "Users can insert vacancy codes" ON public.requisition_vacancy_codes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.personnel_requisitions pr WHERE pr.id = requisition_id AND public.is_company_member(pr.company_id))
  );
CREATE POLICY "Users can delete vacancy codes" ON public.requisition_vacancy_codes
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.personnel_requisitions pr WHERE pr.id = requisition_id AND public.is_company_member(pr.company_id))
  );


-- ============================================================
-- MIGRATION: 20260318130002_91665f72-26ee-440f-b9c6-0258de3ca715.sql
-- ============================================================
ALTER TABLE public.requisition_vacancy_codes
  ADD COLUMN fecha_creacion DATE,
  ADD COLUMN fecha_cierre DATE;

-- ============================================================
-- MIGRATION: 20260318134854_c9ff52db-8951-43a5-8416-a88b5c9268bb.sql
-- ============================================================
ALTER TABLE public.personnel_requisitions 
  ADD COLUMN autoriza TEXT CHECK (autoriza IN ('gerencia_administrativa', 'gerencia_operaciones'));

-- ============================================================
-- MIGRATION: 20260318150301_edb8edec-c963-4824-b6d8-7a09b1820425.sql
-- ============================================================
ALTER TABLE public.vacancies ADD COLUMN IF NOT EXISTS colocado_url text;

-- ============================================================
-- MIGRATION: 20260318155018_707524b8-1a7b-4681-905b-e2859f2cbe6a.sql
-- ============================================================
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS gender_identity text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS gender_identity_other text;

-- ============================================================
-- MIGRATION: 20260318160044_4f33f4ed-3bb4-4fb7-9a9c-dc1d2f8e2bd3.sql
-- ============================================================
ALTER TABLE public.employees_v2 ADD COLUMN gender_identity text, ADD COLUMN gender_identity_other text;

-- ============================================================
-- MIGRATION: 20260318161150_86cd9b1f-0767-4a75-8b63-d07c292fcc6a.sql
-- ============================================================

ALTER TABLE public.employees_v2
  ADD COLUMN IF NOT EXISTS is_first_job boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_head_of_household boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ethnic_group text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_conflict_victim boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_demobilized boolean DEFAULT false;


-- ============================================================
-- MIGRATION: 20260318165640_5aedfcdf-cae3-4e45-863e-f4fb319ef269.sql
-- ============================================================

-- Table for vacancy documents
CREATE TABLE public.vacancy_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'otro',
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  observations TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vacancy_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view vacancy documents for their company"
  ON public.vacancy_documents FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert vacancy documents for their company"
  ON public.vacancy_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can delete vacancy documents for their company"
  ON public.vacancy_documents FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));

-- Trigger for updated_at
CREATE TRIGGER update_vacancy_documents_updated_at
  BEFORE UPDATE ON public.vacancy_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260318170428_83af1b5c-98be-4c4d-afd3-b6adcc8eda06.sql
-- ============================================================

-- Table for self-registration tokens
CREATE TABLE public.self_registration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  target_type text NOT NULL DEFAULT 'candidate',
  vacancy_id uuid REFERENCES public.vacancies(id) ON DELETE SET NULL,
  enabled_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT self_registration_tokens_token_key UNIQUE (token),
  CONSTRAINT self_registration_tokens_target_type_check CHECK (target_type IN ('candidate', 'employee'))
);

-- Enable RLS
ALTER TABLE public.self_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated) for token validation
CREATE POLICY "Anyone can read tokens for validation"
  ON public.self_registration_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

-- Company members can insert
CREATE POLICY "Company members can insert tokens"
  ON public.self_registration_tokens FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

-- Company members can update (mark as used)
CREATE POLICY "Company members can update tokens"
  ON public.self_registration_tokens FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id));

-- Anon can update tokens (mark as used from public form)
CREATE POLICY "Anon can update tokens to mark used"
  ON public.self_registration_tokens FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Anon can insert candidates
CREATE POLICY "Anon can insert candidates via token"
  ON public.candidates FOR INSERT
  TO anon
  WITH CHECK (true);

-- RPC to submit candidate registration via token
CREATE OR REPLACE FUNCTION public.submit_candidate_registration(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_document_type text DEFAULT 'CC',
  p_document_number text DEFAULT '',
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_mobile text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_birth_date text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_gender_identity text DEFAULT NULL,
  p_gender_identity_other text DEFAULT NULL,
  p_education_level text DEFAULT NULL,
  p_profession text DEFAULT NULL,
  p_experience_years integer DEFAULT 0,
  p_current_company text DEFAULT NULL,
  p_current_position text DEFAULT NULL,
  p_salary_expectation numeric DEFAULT NULL,
  p_general_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token_row self_registration_tokens%ROWTYPE;
  v_candidate_id uuid;
BEGIN
  SELECT * INTO v_token_row FROM self_registration_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  IF v_token_row.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  IF v_token_row.target_type != 'candidate' OR v_token_row.vacancy_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido para registro de candidato');
  END IF;

  INSERT INTO candidates (
    vacancy_id, first_name, last_name, document_type, document_number,
    email, phone, mobile, address, city, department,
    birth_date, gender, gender_identity, gender_identity_other,
    education_level, profession, experience_years,
    current_company, current_position, salary_expectation,
    general_notes, source, status
  ) VALUES (
    v_token_row.vacancy_id, p_first_name, p_last_name, p_document_type::document_type, p_document_number,
    p_email, p_phone, p_mobile, p_address, p_city, p_department,
    CASE WHEN p_birth_date IS NOT NULL THEN p_birth_date::date ELSE NULL END,
    p_gender, p_gender_identity, p_gender_identity_other,
    p_education_level, p_profession, p_experience_years,
    p_current_company, p_current_position, p_salary_expectation,
    p_general_notes, 'auto_registro', 'applied'
  ) RETURNING id INTO v_candidate_id;

  UPDATE self_registration_tokens SET is_used = true, used_at = now() WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'candidate_id', v_candidate_id);
END;
$$;


-- ============================================================
-- MIGRATION: 20260318174550_2d971487-a0a9-4721-8c8e-e9b458f90b9d.sql
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;

-- ============================================================
-- MIGRATION: 20260318174952_01919e3d-bc41-4895-9ce4-e5fa045640b6.sql
-- ============================================================
CREATE POLICY "Company members can delete registration tokens"
ON public.self_registration_tokens
FOR DELETE
TO authenticated
USING (public.is_company_member(company_id));

-- ============================================================
-- MIGRATION: 20260318175824_b1e9e2ac-f2c9-4581-af79-1304b85ab919.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_employee_registration(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_middle_name text DEFAULT NULL,
  p_second_last_name text DEFAULT NULL,
  p_document_type text DEFAULT 'CC',
  p_document_number text DEFAULT '',
  p_birth_date text DEFAULT NULL,
  p_birth_city text DEFAULT NULL,
  p_birth_department text DEFAULT NULL,
  p_birth_country text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_gender_identity text DEFAULT NULL,
  p_gender_identity_other text DEFAULT NULL,
  p_marital_status text DEFAULT NULL,
  p_blood_type text DEFAULT NULL,
  p_document_issue_date text DEFAULT NULL,
  p_document_issue_city text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_personal_email text DEFAULT NULL,
  p_mobile text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_residence_address text DEFAULT NULL,
  p_residence_city text DEFAULT NULL,
  p_residence_department text DEFAULT NULL,
  p_residence_neighborhood text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL,
  p_emergency_contact_relationship text DEFAULT NULL,
  p_spouse_name text DEFAULT NULL,
  p_spouse_birth_date text DEFAULT NULL,
  p_children_count integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token_row self_registration_tokens%ROWTYPE;
  v_employee_id uuid;
BEGIN
  SELECT * INTO v_token_row FROM self_registration_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  IF v_token_row.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  IF v_token_row.target_type != 'employee' THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido para registro de empleado');
  END IF;

  -- Insert into employees_v2
  INSERT INTO employees_v2 (
    company_id, first_name, middle_name, last_name, second_last_name,
    document_type, document_number, birth_date, birth_city, birth_department, birth_country,
    gender, gender_identity, gender_identity_other, marital_status, blood_type,
    document_issue_date, document_issue_city
  ) VALUES (
    v_token_row.company_id,
    p_first_name,
    p_middle_name,
    p_last_name,
    p_second_last_name,
    p_document_type::document_type,
    p_document_number,
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
    p_birth_city,
    p_birth_department,
    p_birth_country,
    CASE WHEN p_gender IS NOT NULL AND p_gender != '' THEN p_gender::gender_type ELSE NULL END,
    p_gender_identity,
    p_gender_identity_other,
    CASE WHEN p_marital_status IS NOT NULL AND p_marital_status != '' THEN p_marital_status::marital_status_type ELSE NULL END,
    CASE WHEN p_blood_type IS NOT NULL AND p_blood_type != '' THEN p_blood_type::blood_type ELSE NULL END,
    CASE WHEN p_document_issue_date IS NOT NULL AND p_document_issue_date != '' THEN p_document_issue_date::date ELSE NULL END,
    p_document_issue_city
  ) RETURNING id INTO v_employee_id;

  -- Insert contact info if any contact field is provided
  IF COALESCE(p_email, p_personal_email, p_mobile, p_phone, p_residence_address, p_residence_city, p_residence_department, p_residence_neighborhood, p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship) IS NOT NULL THEN
    INSERT INTO employee_contact (
      employee_id, email, personal_email, mobile, phone,
      residence_address, residence_city, residence_department, residence_neighborhood,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      is_current
    ) VALUES (
      v_employee_id, p_email, p_personal_email, p_mobile, p_phone,
      p_residence_address, p_residence_city, p_residence_department, p_residence_neighborhood,
      p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship,
      true
    );
  END IF;

  -- Insert family info if any family field is provided
  IF COALESCE(p_spouse_name, p_spouse_birth_date) IS NOT NULL OR p_children_count IS NOT NULL THEN
    INSERT INTO employee_family (
      employee_id, spouse_name, spouse_birth_date, children_count, is_current
    ) VALUES (
      v_employee_id,
      p_spouse_name,
      CASE WHEN p_spouse_birth_date IS NOT NULL AND p_spouse_birth_date != '' THEN p_spouse_birth_date::date ELSE NULL END,
      COALESCE(p_children_count, 0),
      true
    );
  END IF;

  -- Mark token as used
  UPDATE self_registration_tokens SET is_used = true, used_at = now() WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'employee_id', v_employee_id);
END;
$$;

-- Enable realtime for employees_v2
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees_v2;


-- ============================================================
-- MIGRATION: 20260318183822_92d84146-4e6a-4035-b707-628a085e8cfd.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_employee_registration(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_middle_name text DEFAULT NULL,
  p_second_last_name text DEFAULT NULL,
  p_document_type text DEFAULT 'CC',
  p_document_number text DEFAULT '',
  p_birth_date text DEFAULT NULL,
  p_birth_city text DEFAULT NULL,
  p_birth_department text DEFAULT NULL,
  p_birth_country text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_gender_identity text DEFAULT NULL,
  p_gender_identity_other text DEFAULT NULL,
  p_marital_status text DEFAULT NULL,
  p_blood_type text DEFAULT NULL,
  p_document_issue_date text DEFAULT NULL,
  p_document_issue_city text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_personal_email text DEFAULT NULL,
  p_mobile text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_residence_address text DEFAULT NULL,
  p_residence_city text DEFAULT NULL,
  p_residence_department text DEFAULT NULL,
  p_residence_neighborhood text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL,
  p_emergency_contact_relationship text DEFAULT NULL,
  p_spouse_name text DEFAULT NULL,
  p_spouse_birth_date text DEFAULT NULL,
  p_children_count integer DEFAULT NULL,
  p_eps text DEFAULT NULL,
  p_afp text DEFAULT NULL,
  p_arl text DEFAULT NULL,
  p_ccf text DEFAULT NULL,
  p_afc text DEFAULT NULL,
  p_ips text DEFAULT NULL,
  p_risk_level text DEFAULT NULL,
  p_bank_name text DEFAULT NULL,
  p_account_type text DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_is_first_job boolean DEFAULT NULL,
  p_is_head_of_household boolean DEFAULT NULL,
  p_disability_type text DEFAULT NULL,
  p_ethnic_group text DEFAULT NULL,
  p_is_conflict_victim boolean DEFAULT NULL,
  p_is_demobilized boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token_row self_registration_tokens%ROWTYPE;
  v_employee_id uuid;
BEGIN
  SELECT * INTO v_token_row FROM self_registration_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  IF v_token_row.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  IF v_token_row.target_type != 'employee' THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido para registro de empleado');
  END IF;

  INSERT INTO employees_v2 (
    company_id, first_name, middle_name, last_name, second_last_name,
    document_type, document_number, birth_date, birth_city, birth_department, birth_country,
    gender, gender_identity, gender_identity_other, marital_status, blood_type,
    document_issue_date, document_issue_city,
    is_first_job, is_head_of_household, disability_type, ethnic_group, is_conflict_victim, is_demobilized
  ) VALUES (
    v_token_row.company_id,
    p_first_name, p_middle_name, p_last_name, p_second_last_name,
    p_document_type::document_type, p_document_number,
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
    p_birth_city, p_birth_department, p_birth_country,
    CASE WHEN p_gender IS NOT NULL AND p_gender != '' THEN p_gender::gender_type ELSE NULL END,
    p_gender_identity, p_gender_identity_other,
    CASE WHEN p_marital_status IS NOT NULL AND p_marital_status != '' THEN p_marital_status::marital_status_type ELSE NULL END,
    CASE WHEN p_blood_type IS NOT NULL AND p_blood_type != '' THEN p_blood_type::blood_type ELSE NULL END,
    CASE WHEN p_document_issue_date IS NOT NULL AND p_document_issue_date != '' THEN p_document_issue_date::date ELSE NULL END,
    p_document_issue_city,
    COALESCE(p_is_first_job, false),
    COALESCE(p_is_head_of_household, false),
    p_disability_type,
    p_ethnic_group,
    COALESCE(p_is_conflict_victim, false),
    COALESCE(p_is_demobilized, false)
  ) RETURNING id INTO v_employee_id;

  IF COALESCE(p_email, p_personal_email, p_mobile, p_phone, p_residence_address, p_residence_city, p_residence_department, p_residence_neighborhood, p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship) IS NOT NULL THEN
    INSERT INTO employee_contact (
      employee_id, email, personal_email, mobile, phone,
      residence_address, residence_city, residence_department, residence_neighborhood,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      is_current
    ) VALUES (
      v_employee_id, p_email, p_personal_email, p_mobile, p_phone,
      p_residence_address, p_residence_city, p_residence_department, p_residence_neighborhood,
      p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship,
      true
    );
  END IF;

  IF COALESCE(p_spouse_name, p_spouse_birth_date) IS NOT NULL OR p_children_count IS NOT NULL THEN
    INSERT INTO employee_family (
      employee_id, spouse_name, spouse_birth_date, children_count, is_current
    ) VALUES (
      v_employee_id, p_spouse_name,
      CASE WHEN p_spouse_birth_date IS NOT NULL AND p_spouse_birth_date != '' THEN p_spouse_birth_date::date ELSE NULL END,
      COALESCE(p_children_count, 0),
      true
    );
  END IF;

  IF COALESCE(p_eps, p_afp, p_arl, p_ccf, p_afc, p_ips, p_risk_level) IS NOT NULL THEN
    INSERT INTO employee_social_security (
      employee_id, eps, afp, arl, ccf, afc, ips,
      risk_level, is_current
    ) VALUES (
      v_employee_id, p_eps, p_afp, p_arl, p_ccf, p_afc, p_ips,
      CASE WHEN p_risk_level IS NOT NULL AND p_risk_level != '' THEN p_risk_level::risk_level ELSE NULL END,
      true
    );
  END IF;

  IF COALESCE(p_bank_name, p_account_type, p_account_number) IS NOT NULL THEN
    INSERT INTO employee_bank_info (
      employee_id, bank_name,
      account_type,
      account_number, is_current
    ) VALUES (
      v_employee_id, p_bank_name,
      CASE WHEN p_account_type IS NOT NULL AND p_account_type != '' THEN p_account_type::account_type ELSE NULL END,
      p_account_number, true
    );
  END IF;

  UPDATE self_registration_tokens SET is_used = true, used_at = now() WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'employee_id', v_employee_id);
END;
$$;

-- ============================================================
-- MIGRATION: 20260319174728_e0b1583c-b149-4ae2-b677-3a00ef838c86.sql
-- ============================================================
ALTER TABLE public.personnel_requisitions ADD COLUMN lider_proceso TEXT NULL;

-- ============================================================
-- MIGRATION: 20260319180814_a30fa8da-a171-460d-811d-39e6f8b48de0.sql
-- ============================================================
ALTER TABLE public.operation_centers 
  ADD COLUMN contract_commercial_date DATE DEFAULT NULL,
  ADD COLUMN notes TEXT DEFAULT NULL;

-- ============================================================
-- MIGRATION: 20260319181343_57d1a4a3-260d-426d-a967-d50bcb9cf72d.sql
-- ============================================================
ALTER TABLE public.operation_centers ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- MIGRATION: 20260322142525_0d3392fb-84b3-4193-b103-a873e2544de2.sql
-- ============================================================

-- Create candidate_documents table
CREATE TABLE public.candidate_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  observations TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view candidate documents of their company"
  ON public.candidate_documents FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert candidate documents of their company"
  ON public.candidate_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can delete candidate documents of their company"
  ON public.candidate_documents FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));


-- ============================================================
-- MIGRATION: 20260322145801_be772d56-7bf3-4dce-b817-83dcd282032f.sql
-- ============================================================

-- Fix status enum - need to drop default first
ALTER TABLE public.selection_steps ALTER COLUMN status DROP DEFAULT;
CREATE TYPE public.selection_step_status_new AS ENUM ('pending', 'scheduled', 'completed', 'passed', 'failed', 'skipped', 'not_applicable');
ALTER TABLE public.selection_steps ALTER COLUMN status TYPE text;
DROP TYPE public.selection_step_status;
ALTER TYPE public.selection_step_status_new RENAME TO selection_step_status;
ALTER TABLE public.selection_steps ALTER COLUMN status TYPE public.selection_step_status USING status::public.selection_step_status;
ALTER TABLE public.selection_steps ALTER COLUMN status SET DEFAULT 'pending';


-- ============================================================
-- MIGRATION: 20260322211535_1198e4c9-8462-42d3-9316-784c50f8baa1.sql
-- ============================================================
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS withdrawal_reason text;

-- ============================================================
-- MIGRATION: 20260324203805_678fec9f-7703-4d3e-a97f-79c613cda6e1.sql
-- ============================================================
ALTER TABLE public.candidates ADD COLUMN document_issue_date date NULL;

-- ============================================================
-- MIGRATION: 20260324204248_7e9d87e9-7940-4915-a888-87c76d7843df.sql
-- ============================================================
ALTER TABLE public.candidates ADD COLUMN document_issue_city text NULL;

-- ============================================================
-- MIGRATION: 20260324213613_53873e8d-0a18-4ee4-a78c-ca086073fe0d.sql
-- ============================================================

ALTER TABLE public.candidates 
  ADD COLUMN IF NOT EXISTS is_first_job boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_head_of_household boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ethnic_group text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_conflict_victim boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_demobilized boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blood_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marital_status text DEFAULT NULL;


-- ============================================================
-- MIGRATION: 20260324220642_d8db7f6b-007c-4b8b-bc8d-a5cf6278977a.sql
-- ============================================================
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

-- ============================================================
-- MIGRATION: 20260324221618_3be95ae4-835f-46b1-a492-51a908aee0ad.sql
-- ============================================================
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS neighborhood text;

-- ============================================================
-- MIGRATION: 20260324224352_ee03fac5-2641-49a4-aa4e-0e68f2650ece.sql
-- ============================================================

CREATE TABLE public.employee_family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible employee family members"
ON public.employee_family_members FOR SELECT TO authenticated
USING (has_employee_v2_access(employee_id));

CREATE POLICY "Admin and RRHH can manage employee family members"
ON public.employee_family_members FOR ALL TO authenticated
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));


-- ============================================================
-- MIGRATION: 20260324231824_35d12c21-310e-4c2c-9ae8-83a77ba59484.sql
-- ============================================================

CREATE TABLE public.candidate_family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view candidate family members"
  ON public.candidate_family_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.vacancies v ON c.vacancy_id = v.id
      WHERE c.id = candidate_family_members.candidate_id
        AND public.is_company_member(v.company_id)
    )
  );

CREATE POLICY "Users can insert candidate family members"
  ON public.candidate_family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.vacancies v ON c.vacancy_id = v.id
      WHERE c.id = candidate_family_members.candidate_id
        AND public.is_company_member(v.company_id)
    )
  );

CREATE POLICY "Users can delete candidate family members"
  ON public.candidate_family_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.vacancies v ON c.vacancy_id = v.id
      WHERE c.id = candidate_family_members.candidate_id
        AND public.is_company_member(v.company_id)
    )
  );


-- ============================================================
-- MIGRATION: 20260324233542_d2dcae7d-da10-47f6-a373-98df191fe3d9.sql
-- ============================================================

-- Update submit_candidate_registration to accept new fields
CREATE OR REPLACE FUNCTION public.submit_candidate_registration(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_document_type text DEFAULT 'CC'::text,
  p_document_number text DEFAULT ''::text,
  p_email text DEFAULT NULL::text,
  p_phone text DEFAULT NULL::text,
  p_mobile text DEFAULT NULL::text,
  p_address text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_department text DEFAULT NULL::text,
  p_birth_date text DEFAULT NULL::text,
  p_gender text DEFAULT NULL::text,
  p_gender_identity text DEFAULT NULL::text,
  p_gender_identity_other text DEFAULT NULL::text,
  p_education_level text DEFAULT NULL::text,
  p_profession text DEFAULT NULL::text,
  p_experience_years integer DEFAULT 0,
  p_current_company text DEFAULT NULL::text,
  p_current_position text DEFAULT NULL::text,
  p_salary_expectation numeric DEFAULT NULL::numeric,
  p_general_notes text DEFAULT NULL::text,
  p_neighborhood text DEFAULT NULL::text,
  p_document_issue_date text DEFAULT NULL::text,
  p_document_issue_city text DEFAULT NULL::text,
  p_marital_status text DEFAULT NULL::text,
  p_blood_type text DEFAULT NULL::text,
  p_emergency_contact_name text DEFAULT NULL::text,
  p_emergency_contact_phone text DEFAULT NULL::text,
  p_emergency_contact_relationship text DEFAULT NULL::text,
  p_is_first_job boolean DEFAULT NULL::boolean,
  p_is_head_of_household boolean DEFAULT NULL::boolean,
  p_disability_type text DEFAULT NULL::text,
  p_ethnic_group text DEFAULT NULL::text,
  p_is_conflict_victim boolean DEFAULT NULL::boolean,
  p_is_demobilized boolean DEFAULT NULL::boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token_row self_registration_tokens%ROWTYPE;
  v_candidate_id uuid;
BEGIN
  SELECT * INTO v_token_row FROM self_registration_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  IF v_token_row.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  IF v_token_row.target_type != 'candidate' OR v_token_row.vacancy_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido para registro de candidato');
  END IF;

  INSERT INTO candidates (
    vacancy_id, first_name, last_name, document_type, document_number,
    email, phone, mobile, address, neighborhood, city, department,
    birth_date, gender, gender_identity, gender_identity_other,
    document_issue_date, document_issue_city,
    marital_status, blood_type,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    education_level, profession, experience_years,
    current_company, current_position, salary_expectation,
    general_notes, source, status,
    is_first_job, is_head_of_household, disability_type, ethnic_group,
    is_conflict_victim, is_demobilized
  ) VALUES (
    v_token_row.vacancy_id, p_first_name, p_last_name, p_document_type::document_type, p_document_number,
    p_email, p_phone, p_mobile, p_address, p_neighborhood, p_city, p_department,
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
    p_gender, p_gender_identity, p_gender_identity_other,
    CASE WHEN p_document_issue_date IS NOT NULL AND p_document_issue_date != '' THEN p_document_issue_date::date ELSE NULL END,
    p_document_issue_city,
    p_marital_status, p_blood_type,
    p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship,
    p_education_level, p_profession, p_experience_years,
    p_current_company, p_current_position, p_salary_expectation,
    p_general_notes, 'auto_registro', 'applied',
    COALESCE(p_is_first_job, false),
    COALESCE(p_is_head_of_household, false),
    p_disability_type,
    p_ethnic_group,
    COALESCE(p_is_conflict_victim, false),
    COALESCE(p_is_demobilized, false)
  ) RETURNING id INTO v_candidate_id;

  UPDATE self_registration_tokens SET is_used = true, used_at = now() WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'candidate_id', v_candidate_id);
END;
$function$;


-- ============================================================
-- MIGRATION: 20260325001150_7844dc5d-f034-4ad6-8e84-b972c640b389.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_candidate_background(
  p_document_number text,
  p_document_type text DEFAULT 'CC',
  p_company_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
  v_employee_data json;
  v_disciplinary_data json;
  v_candidacy_data json;
  v_employee_id uuid;
BEGIN
  -- Check if was employee
  SELECT json_build_object(
    'found', true,
    'employee_id', e.id,
    'first_name', e.first_name,
    'last_name', e.last_name,
    'is_active', e.is_active,
    'hire_date', (SELECT ewi.hire_date FROM employee_work_info ewi WHERE ewi.employee_id = e.id AND ewi.is_current = true LIMIT 1),
    'termination_date', (SELECT ewi.termination_date FROM employee_work_info ewi WHERE ewi.employee_id = e.id ORDER BY ewi.created_at DESC LIMIT 1)
  ), e.id
  INTO v_employee_data, v_employee_id
  FROM employees_v2 e
  WHERE e.document_number = p_document_number
    AND (p_company_id IS NULL OR e.company_id = p_company_id)
  LIMIT 1;

  IF v_employee_data IS NULL THEN
    v_employee_data := json_build_object('found', false);
  END IF;

  -- Check disciplinary processes
  IF v_employee_id IS NOT NULL THEN
    SELECT COALESCE(json_agg(json_build_object(
      'id', dp.id,
      'case_number', dp.case_number,
      'status', dp.status,
      'fault_type', dp.fault_type,
      'opening_date', dp.opening_date,
      'sanction_type', dp.sanction_type
    )), '[]'::json)
    INTO v_disciplinary_data
    FROM disciplinary_processes dp
    WHERE dp.employee_id = v_employee_id
      AND (p_company_id IS NULL OR dp.company_id = p_company_id);
  ELSE
    v_disciplinary_data := '[]'::json;
  END IF;

  -- Check previous candidacies
  SELECT COALESCE(json_agg(json_build_object(
    'id', c.id,
    'vacancy_id', c.vacancy_id,
    'status', c.status,
    'first_name', c.first_name,
    'last_name', c.last_name,
    'email', c.email,
    'mobile', c.mobile,
    'phone', c.phone,
    'address', c.address,
    'neighborhood', c.neighborhood,
    'city', c.city,
    'department', c.department,
    'birth_date', c.birth_date,
    'gender', c.gender,
    'gender_identity', c.gender_identity,
    'education_level', c.education_level,
    'profession', c.profession,
    'experience_years', c.experience_years,
    'current_company', c.current_company,
    'current_position', c.current_position,
    'application_date', c.application_date,
    'vacancy_title', (SELECT v.position_title FROM vacancies v WHERE v.id = c.vacancy_id)
  ) ORDER BY c.application_date DESC), '[]'::json)
  INTO v_candidacy_data
  FROM candidates c
  JOIN vacancies v ON v.id = c.vacancy_id
  WHERE c.document_number = p_document_number
    AND (p_company_id IS NULL OR v.company_id = p_company_id);

  v_result := json_build_object(
    'was_employee', v_employee_data,
    'disciplinary_processes', v_disciplinary_data,
    'previous_candidacies', v_candidacy_data
  );

  RETURN v_result;
END;
$$;


-- ============================================================
-- MIGRATION: 20260325011700_f025ac25-aff2-4cc3-bf76-418b8fdbfc86.sql
-- ============================================================

ALTER TABLE public.selection_steps 
ADD COLUMN IF NOT EXISTS provider text,
ADD COLUMN IF NOT EXISTS doctor_name text,
ADD COLUMN IF NOT EXISTS medical_concept text,
ADD COLUMN IF NOT EXISTS exam_profesiograma_items jsonb;


-- ============================================================
-- MIGRATION: 20260325143404_baff538b-6be9-4305-a9f0-4dbd68d84961.sql
-- ============================================================

CREATE TABLE public.position_profile_annexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.position_profiles(id) ON DELETE CASCADE,
  operation_center_id UUID NOT NULL REFERENCES public.operation_centers(id) ON DELETE CASCADE,
  purpose TEXT,
  reports_to TEXT,
  supervises TEXT,
  num_positions INTEGER,
  education_level TEXT,
  education_detail TEXT,
  experience TEXT,
  specific_knowledge JSONB,
  skills JSONB,
  functions JSONB,
  responsibilities JSONB,
  working_conditions JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, operation_center_id)
);

ALTER TABLE public.position_profile_annexes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annexes of their company"
  ON public.position_profile_annexes FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert annexes for their company"
  ON public.position_profile_annexes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update annexes of their company"
  ON public.position_profile_annexes FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can delete annexes of their company"
  ON public.position_profile_annexes FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id));

CREATE TRIGGER update_position_profile_annexes_updated_at
  BEFORE UPDATE ON public.position_profile_annexes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260326015619_00c3a82d-d957-4694-93fb-2e9e29f37256.sql
-- ============================================================
ALTER TABLE public.candidates ADD COLUMN thanks_sent_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- MIGRATION: 20260326021120_0c12f441-de90-4efc-b140-7badf0ff7bfa.sql
-- ============================================================

-- Table: payroll_receipts
CREATE TABLE public.payroll_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  total_earnings NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  net_pay NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.payroll_receipts ENABLE ROW LEVEL SECURITY;

-- Employees can see their own receipts
CREATE POLICY "Employees can view own payroll receipts"
  ON public.payroll_receipts FOR SELECT TO authenticated
  USING (employee_id = public.get_my_employee_id());

-- Admin/RRHH can manage all receipts in their company
CREATE POLICY "Admin can manage payroll receipts"
  ON public.payroll_receipts FOR ALL TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

-- RLS: Employees can INSERT their own vacation requests
CREATE POLICY "Employees can create own vacation requests"
  ON public.vacation_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.get_my_employee_id());

-- RLS: Employees can SELECT their own vacation requests
CREATE POLICY "Employees can view own vacation requests"
  ON public.vacation_requests FOR SELECT TO authenticated
  USING (employee_id = public.get_my_employee_id());

-- RLS: Employees can INSERT their own leave requests
CREATE POLICY "Employees can create own leave requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.get_my_employee_id());

-- RLS: Employees can SELECT their own leave requests
CREATE POLICY "Employees can view own leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (employee_id = public.get_my_employee_id());


-- ============================================================
-- MIGRATION: 20260329164211_027695f8-56a1-440a-837f-62f70d3ccf7e.sql
-- ============================================================
ALTER TABLE public.operation_centers ADD COLUMN contract_start_date date;

-- ============================================================
-- MIGRATION: 20260329170105_80fd0afc-02bb-48da-8d13-e0020289e9f3.sql
-- ============================================================
ALTER TABLE public.operation_centers ADD COLUMN main_client text;

-- ============================================================
-- MIGRATION: 20260330142155_6ecbfe5d-7472-44e3-b109-43208575981e.sql
-- ============================================================

-- Enum for loan types
CREATE TYPE public.loan_type AS ENUM ('personal', 'vivienda', 'educacion', 'calamidad', 'libranza', 'anticipo', 'otro');

-- Enum for loan status
CREATE TYPE public.loan_status AS ENUM ('solicitado', 'aprobado', 'activo', 'pagado', 'cancelado', 'rechazado');

-- Enum for deduction types
CREATE TYPE public.deduction_type AS ENUM ('judicial', 'responsabilidad', 'cooperativa', 'sindicato', 'otro');

-- Enum for deduction status
CREATE TYPE public.deduction_status AS ENUM ('activo', 'pausado', 'finalizado', 'cancelado');

-- =============================================
-- EMPLOYEE LOANS TABLE
-- =============================================
CREATE TABLE public.employee_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  loan_type public.loan_type NOT NULL DEFAULT 'personal',
  description TEXT,
  total_amount NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_with_interest NUMERIC(15,2) NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  installment_amount NUMERIC(15,2) NOT NULL,
  paid_installments INTEGER NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status public.loan_status NOT NULL DEFAULT 'solicitado',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- LOAN PAYMENTS TABLE (Trazabilidad de pagos)
-- =============================================
CREATE TABLE public.employee_loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.employee_loans(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2) NOT NULL,
  payroll_period TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- EMPLOYEE DEDUCTIONS TABLE
-- =============================================
CREATE TABLE public.employee_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  deduction_type public.deduction_type NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  percentage_value NUMERIC(5,2),
  start_date DATE NOT NULL,
  end_date DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  reference_number TEXT,
  entity_name TEXT,
  status public.deduction_status NOT NULL DEFAULT 'activo',
  notes TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

-- Loans policies
CREATE POLICY "Users can view loans for their company" ON public.employee_loans
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert loans for their company" ON public.employee_loans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update loans for their company" ON public.employee_loans
  FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can delete loans for their company" ON public.employee_loans
  FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));

-- Loan payments policies
CREATE POLICY "Users can view loan payments" ON public.employee_loan_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employee_loans l 
    WHERE l.id = loan_id AND public.is_company_member(l.company_id)
  ));

CREATE POLICY "Users can insert loan payments" ON public.employee_loan_payments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employee_loans l 
    WHERE l.id = loan_id AND public.is_company_member(l.company_id)
  ));

CREATE POLICY "Users can delete loan payments" ON public.employee_loan_payments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employee_loans l 
    WHERE l.id = loan_id AND public.is_company_member(l.company_id)
  ));

-- Deductions policies
CREATE POLICY "Users can view deductions for their company" ON public.employee_deductions
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert deductions for their company" ON public.employee_deductions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update deductions for their company" ON public.employee_deductions
  FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can delete deductions for their company" ON public.employee_deductions
  FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));

-- Updated_at triggers
CREATE TRIGGER update_employee_loans_updated_at
  BEFORE UPDATE ON public.employee_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_deductions_updated_at
  BEFORE UPDATE ON public.employee_deductions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260330201236_8273b963-c29f-4e29-8dcb-f3c0058e6c21.sql
-- ============================================================

-- Loan refinancing history table
CREATE TABLE public.loan_refinancing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.employee_loans(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  refinance_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Previous terms
  previous_total_amount NUMERIC NOT NULL,
  previous_interest_rate NUMERIC NOT NULL DEFAULT 0,
  previous_total_with_interest NUMERIC NOT NULL,
  previous_installments INT NOT NULL,
  previous_installment_amount NUMERIC NOT NULL,
  previous_paid_installments INT NOT NULL DEFAULT 0,
  previous_paid_amount NUMERIC NOT NULL DEFAULT 0,
  previous_remaining_balance NUMERIC NOT NULL,
  
  -- New terms
  new_total_amount NUMERIC NOT NULL,
  new_interest_rate NUMERIC NOT NULL DEFAULT 0,
  new_total_with_interest NUMERIC NOT NULL,
  new_installments INT NOT NULL,
  new_installment_amount NUMERIC NOT NULL,
  new_start_date DATE NOT NULL,
  
  -- Metadata
  reason TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_refinancing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refinancing history for their company"
  ON public.loan_refinancing_history FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert refinancing history for their company"
  ON public.loan_refinancing_history FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));


-- ============================================================
-- MIGRATION: 20260402190750_32638385-e1c3-4db5-bc1b-5e7ed4bd5a6a.sql
-- ============================================================

-- =====================================================
-- Add company_id to 8 high-risk tables for direct multi-company isolation
-- =====================================================

-- 1. CONTRACTS
ALTER TABLE public.contracts ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.contracts c SET company_id = e.company_id FROM public.employees_v2 e WHERE c.employee_id = e.id;
ALTER TABLE public.contracts ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_contracts_company_id ON public.contracts(company_id);

-- 2. CONTRACT_EXTENSIONS
ALTER TABLE public.contract_extensions ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.contract_extensions ce SET company_id = c.company_id FROM public.contracts c WHERE ce.contract_id = c.id;
-- Some extensions may not match; set from employee
UPDATE public.contract_extensions ce SET company_id = (
  SELECT e.company_id FROM public.contracts c JOIN public.employees_v2 e ON c.employee_id = e.id WHERE c.id = ce.contract_id LIMIT 1
) WHERE ce.company_id IS NULL;
ALTER TABLE public.contract_extensions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_contract_extensions_company_id ON public.contract_extensions(company_id);

-- 3. DOTATION_DELIVERIES
ALTER TABLE public.dotation_deliveries ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.dotation_deliveries d SET company_id = e.company_id FROM public.employees_v2 e WHERE d.employee_id = e.id;
ALTER TABLE public.dotation_deliveries ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_dotation_deliveries_company_id ON public.dotation_deliveries(company_id);

-- 4. DOTATION_DELIVERY_TRANSACTIONS
ALTER TABLE public.dotation_delivery_transactions ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.dotation_delivery_transactions d SET company_id = e.company_id FROM public.employees_v2 e WHERE d.employee_id = e.id;
ALTER TABLE public.dotation_delivery_transactions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_dotation_delivery_transactions_company_id ON public.dotation_delivery_transactions(company_id);

-- 5. MEDICAL_EXAMS
ALTER TABLE public.medical_exams ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.medical_exams m SET company_id = e.company_id FROM public.employees_v2 e WHERE m.employee_id = e.id;
ALTER TABLE public.medical_exams ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_medical_exams_company_id ON public.medical_exams(company_id);

-- 6. PERFORMANCE_EVALUATIONS
ALTER TABLE public.performance_evaluations ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.performance_evaluations pe SET company_id = c.company_id FROM public.evaluation_cycles c WHERE pe.cycle_id = c.id;
ALTER TABLE public.performance_evaluations ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_performance_evaluations_company_id ON public.performance_evaluations(company_id);

-- 7. PERFORMANCE_GOALS
ALTER TABLE public.performance_goals ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.performance_goals pg SET company_id = e.company_id FROM public.employees_v2 e WHERE pg.employee_id = e.id;
ALTER TABLE public.performance_goals ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_performance_goals_company_id ON public.performance_goals(company_id);

-- 8. TERMINATION_DOCUMENTS
ALTER TABLE public.termination_documents ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.termination_documents td SET company_id = et.company_id FROM public.employee_terminations et WHERE td.termination_id = et.id;
ALTER TABLE public.termination_documents ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_termination_documents_company_id ON public.termination_documents(company_id);

-- =====================================================
-- Replace RLS policies to use direct company_id
-- =====================================================

-- CONTRACTS
DROP POLICY IF EXISTS "Users can view accessible contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admin and RRHH can manage contracts" ON public.contracts;
CREATE POLICY "Users can view accessible contracts" ON public.contracts FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage contracts" ON public.contracts FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- CONTRACT_EXTENSIONS
DROP POLICY IF EXISTS "Users can view accessible extensions" ON public.contract_extensions;
DROP POLICY IF EXISTS "Admin and RRHH can manage extensions" ON public.contract_extensions;
CREATE POLICY "Users can view accessible extensions" ON public.contract_extensions FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage extensions" ON public.contract_extensions FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- DOTATION_DELIVERIES
DROP POLICY IF EXISTS "Users can view accessible dotation" ON public.dotation_deliveries;
DROP POLICY IF EXISTS "Admin and RRHH can manage dotation" ON public.dotation_deliveries;
CREATE POLICY "Users can view accessible dotation" ON public.dotation_deliveries FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage dotation" ON public.dotation_deliveries FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- DOTATION_DELIVERY_TRANSACTIONS
DROP POLICY IF EXISTS "Users can view accessible delivery transactions" ON public.dotation_delivery_transactions;
DROP POLICY IF EXISTS "Admin and RRHH can manage delivery transactions" ON public.dotation_delivery_transactions;
CREATE POLICY "Users can view accessible delivery transactions" ON public.dotation_delivery_transactions FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage delivery transactions" ON public.dotation_delivery_transactions FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- MEDICAL_EXAMS
DROP POLICY IF EXISTS "Users can view accessible exams" ON public.medical_exams;
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage exams" ON public.medical_exams;
CREATE POLICY "Users can view accessible exams" ON public.medical_exams FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin RRHH and Psicologo can manage exams" ON public.medical_exams FOR ALL USING ((is_admin_or_rrhh() OR is_psicologo()) AND is_company_member(company_id)) WITH CHECK ((is_admin_or_rrhh() OR is_psicologo()) AND is_company_member(company_id));

-- PERFORMANCE_EVALUATIONS
DROP POLICY IF EXISTS "Users can view evaluations from their company cycles" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Admin and RRHH can manage performance evaluations" ON public.performance_evaluations;
CREATE POLICY "Users can view evaluations from their company" ON public.performance_evaluations FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage performance evaluations" ON public.performance_evaluations FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- PERFORMANCE_GOALS
DROP POLICY IF EXISTS "Users can view accessible performance goals" ON public.performance_goals;
DROP POLICY IF EXISTS "Admin and RRHH can manage performance goals" ON public.performance_goals;
CREATE POLICY "Users can view accessible performance goals" ON public.performance_goals FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage performance goals" ON public.performance_goals FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- TERMINATION_DOCUMENTS
DROP POLICY IF EXISTS "Users can view termination documents" ON public.termination_documents;
DROP POLICY IF EXISTS "Admin and RRHH can manage termination documents" ON public.termination_documents;
CREATE POLICY "Users can view termination documents" ON public.termination_documents FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage termination documents" ON public.termination_documents FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));


-- ============================================================
-- MIGRATION: 20260402192510_5cf44588-24eb-4d28-9e4c-5ca19c536a21.sql
-- ============================================================

-- =============================================
-- BATCH 1: Employee sub-tables
-- =============================================

-- 1. employee_bank_info
ALTER TABLE public.employee_bank_info ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_bank_info ebi SET company_id = e.company_id FROM public.employees_v2 e WHERE ebi.employee_id = e.id AND ebi.company_id IS NULL;
ALTER TABLE public.employee_bank_info ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_bank_info_company ON public.employee_bank_info(company_id);
DROP POLICY IF EXISTS "Users can view employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Users can insert employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Users can update employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Users can delete employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Company members can view bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Company members can insert bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Company members can update bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Company members can delete bank info" ON public.employee_bank_info;
CREATE POLICY "Company members can view bank info" ON public.employee_bank_info FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert bank info" ON public.employee_bank_info FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update bank info" ON public.employee_bank_info FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete bank info" ON public.employee_bank_info FOR DELETE USING (public.is_company_member(company_id));

-- 2. employee_contact
ALTER TABLE public.employee_contact ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_contact ec SET company_id = e.company_id FROM public.employees_v2 e WHERE ec.employee_id = e.id AND ec.company_id IS NULL;
ALTER TABLE public.employee_contact ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_contact_company ON public.employee_contact(company_id);
DROP POLICY IF EXISTS "Users can view employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Users can insert employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Users can update employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Users can delete employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Company members can view contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Company members can insert contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Company members can update contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Company members can delete contact" ON public.employee_contact;
CREATE POLICY "Company members can view contact" ON public.employee_contact FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert contact" ON public.employee_contact FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update contact" ON public.employee_contact FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete contact" ON public.employee_contact FOR DELETE USING (public.is_company_member(company_id));

-- 3. employee_family
ALTER TABLE public.employee_family ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_family ef SET company_id = e.company_id FROM public.employees_v2 e WHERE ef.employee_id = e.id AND ef.company_id IS NULL;
ALTER TABLE public.employee_family ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_family_company ON public.employee_family(company_id);
DROP POLICY IF EXISTS "Users can view employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Users can insert employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Users can update employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Users can delete employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Company members can view family" ON public.employee_family;
DROP POLICY IF EXISTS "Company members can insert family" ON public.employee_family;
DROP POLICY IF EXISTS "Company members can update family" ON public.employee_family;
DROP POLICY IF EXISTS "Company members can delete family" ON public.employee_family;
CREATE POLICY "Company members can view family" ON public.employee_family FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert family" ON public.employee_family FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update family" ON public.employee_family FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete family" ON public.employee_family FOR DELETE USING (public.is_company_member(company_id));

-- 4. employee_social_security
ALTER TABLE public.employee_social_security ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_social_security ess SET company_id = e.company_id FROM public.employees_v2 e WHERE ess.employee_id = e.id AND ess.company_id IS NULL;
ALTER TABLE public.employee_social_security ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_social_security_company ON public.employee_social_security(company_id);
DROP POLICY IF EXISTS "Users can view employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Users can insert employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Users can update employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Users can delete employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Company members can view social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Company members can insert social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Company members can update social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Company members can delete social security" ON public.employee_social_security;
CREATE POLICY "Company members can view social security" ON public.employee_social_security FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert social security" ON public.employee_social_security FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update social security" ON public.employee_social_security FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete social security" ON public.employee_social_security FOR DELETE USING (public.is_company_member(company_id));

-- 5. employee_certifications
ALTER TABLE public.employee_certifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_certifications ec SET company_id = e.company_id FROM public.employees_v2 e WHERE ec.employee_id = e.id AND ec.company_id IS NULL;
ALTER TABLE public.employee_certifications ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_certifications_company ON public.employee_certifications(company_id);
DROP POLICY IF EXISTS "Users can view certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Users can insert certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Users can update certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Users can delete certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Company members can view certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Company members can insert certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Company members can update certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Company members can delete certifications" ON public.employee_certifications;
CREATE POLICY "Company members can view certifications" ON public.employee_certifications FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert certifications" ON public.employee_certifications FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update certifications" ON public.employee_certifications FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete certifications" ON public.employee_certifications FOR DELETE USING (public.is_company_member(company_id));

-- 6. employee_vaccinations
ALTER TABLE public.employee_vaccinations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_vaccinations ev SET company_id = e.company_id FROM public.employees_v2 e WHERE ev.employee_id = e.id AND ev.company_id IS NULL;
ALTER TABLE public.employee_vaccinations ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_vaccinations_company ON public.employee_vaccinations(company_id);
DROP POLICY IF EXISTS "Users can view vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Users can insert vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Users can update vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Users can delete vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Company members can view vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Company members can insert vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Company members can update vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Company members can delete vaccinations" ON public.employee_vaccinations;
CREATE POLICY "Company members can view vaccinations" ON public.employee_vaccinations FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert vaccinations" ON public.employee_vaccinations FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update vaccinations" ON public.employee_vaccinations FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete vaccinations" ON public.employee_vaccinations FOR DELETE USING (public.is_company_member(company_id));

-- 7. employee_schedule
ALTER TABLE public.employee_schedule ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_schedule es SET company_id = e.company_id FROM public.employees_v2 e WHERE es.employee_id = e.id AND es.company_id IS NULL;
ALTER TABLE public.employee_schedule ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_schedule_company ON public.employee_schedule(company_id);
DROP POLICY IF EXISTS "Users can manage employee schedules" ON public.employee_schedule;
DROP POLICY IF EXISTS "Company members can view schedules" ON public.employee_schedule;
DROP POLICY IF EXISTS "Company members can insert schedules" ON public.employee_schedule;
DROP POLICY IF EXISTS "Company members can update schedules" ON public.employee_schedule;
DROP POLICY IF EXISTS "Company members can delete schedules" ON public.employee_schedule;
CREATE POLICY "Company members can view schedules" ON public.employee_schedule FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert schedules" ON public.employee_schedule FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update schedules" ON public.employee_schedule FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete schedules" ON public.employee_schedule FOR DELETE USING (public.is_company_member(company_id));

-- 8. employee_shift_assignments
ALTER TABLE public.employee_shift_assignments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_shift_assignments esa SET company_id = e.company_id FROM public.employees_v2 e WHERE esa.employee_id = e.id AND esa.company_id IS NULL;
ALTER TABLE public.employee_shift_assignments ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_shift_assignments_company ON public.employee_shift_assignments(company_id);
DROP POLICY IF EXISTS "Users can manage shift assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Company members can view shift assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Company members can insert shift assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Company members can update shift assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Company members can delete shift assignments" ON public.employee_shift_assignments;
CREATE POLICY "Company members can view shift assignments" ON public.employee_shift_assignments FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert shift assignments" ON public.employee_shift_assignments FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update shift assignments" ON public.employee_shift_assignments FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete shift assignments" ON public.employee_shift_assignments FOR DELETE USING (public.is_company_member(company_id));

-- 9. employee_time_config
ALTER TABLE public.employee_time_config ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_time_config etc SET company_id = e.company_id FROM public.employees_v2 e WHERE etc.employee_id = e.id AND etc.company_id IS NULL;
ALTER TABLE public.employee_time_config ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_time_config_company ON public.employee_time_config(company_id);
DROP POLICY IF EXISTS "Users can manage time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can view time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can insert time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can update time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can delete time config" ON public.employee_time_config;
CREATE POLICY "Company members can view time config" ON public.employee_time_config FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert time config" ON public.employee_time_config FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update time config" ON public.employee_time_config FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete time config" ON public.employee_time_config FOR DELETE USING (public.is_company_member(company_id));

-- 10. employee_loan_payments
ALTER TABLE public.employee_loan_payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_loan_payments elp SET company_id = el.company_id FROM public.employee_loans el WHERE elp.loan_id = el.id AND elp.company_id IS NULL;
ALTER TABLE public.employee_loan_payments ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_loan_payments_company ON public.employee_loan_payments(company_id);
DROP POLICY IF EXISTS "Users can view loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Users can insert loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Users can update loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Users can delete loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Company members can view loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Company members can insert loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Company members can update loan payments" ON public.employee_loan_payments;
DROP POLICY IF EXISTS "Company members can delete loan payments" ON public.employee_loan_payments;
CREATE POLICY "Company members can view loan payments" ON public.employee_loan_payments FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert loan payments" ON public.employee_loan_payments FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update loan payments" ON public.employee_loan_payments FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete loan payments" ON public.employee_loan_payments FOR DELETE USING (public.is_company_member(company_id));

-- =============================================
-- BATCH 2: Disciplinary sub-tables
-- =============================================

-- 11. disciplinary_defenses
ALTER TABLE public.disciplinary_defenses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.disciplinary_defenses dd SET company_id = dp.company_id FROM public.disciplinary_processes dp WHERE dd.process_id = dp.id AND dd.company_id IS NULL;
ALTER TABLE public.disciplinary_defenses ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disciplinary_defenses_company ON public.disciplinary_defenses(company_id);
DROP POLICY IF EXISTS "Users can manage defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can view defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can insert defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can update defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Company members can delete defenses" ON public.disciplinary_defenses;
CREATE POLICY "Company members can view defenses" ON public.disciplinary_defenses FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert defenses" ON public.disciplinary_defenses FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update defenses" ON public.disciplinary_defenses FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete defenses" ON public.disciplinary_defenses FOR DELETE USING (public.is_company_member(company_id));

-- 12. disciplinary_evidence
ALTER TABLE public.disciplinary_evidence ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.disciplinary_evidence de SET company_id = dp.company_id FROM public.disciplinary_processes dp WHERE de.process_id = dp.id AND de.company_id IS NULL;
ALTER TABLE public.disciplinary_evidence ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disciplinary_evidence_company ON public.disciplinary_evidence(company_id);
DROP POLICY IF EXISTS "Users can manage evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can view evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can insert evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can update evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Company members can delete evidence" ON public.disciplinary_evidence;
CREATE POLICY "Company members can view evidence" ON public.disciplinary_evidence FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert evidence" ON public.disciplinary_evidence FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update evidence" ON public.disciplinary_evidence FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete evidence" ON public.disciplinary_evidence FOR DELETE USING (public.is_company_member(company_id));

-- 13. disciplinary_timeline
ALTER TABLE public.disciplinary_timeline ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.disciplinary_timeline dt SET company_id = dp.company_id FROM public.disciplinary_processes dp WHERE dt.process_id = dp.id AND dt.company_id IS NULL;
ALTER TABLE public.disciplinary_timeline ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disciplinary_timeline_company ON public.disciplinary_timeline(company_id);
DROP POLICY IF EXISTS "Users can manage timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can view timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can insert timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can update timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Company members can delete timeline" ON public.disciplinary_timeline;
CREATE POLICY "Company members can view timeline" ON public.disciplinary_timeline FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert timeline" ON public.disciplinary_timeline FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update timeline" ON public.disciplinary_timeline FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete timeline" ON public.disciplinary_timeline FOR DELETE USING (public.is_company_member(company_id));

-- =============================================
-- BATCH 3: Candidates & Selection
-- =============================================

-- 14. candidates (FK to vacancies)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.candidates c SET company_id = v.company_id FROM public.vacancies v WHERE c.vacancy_id = v.id AND c.company_id IS NULL;
ALTER TABLE public.candidates ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_company ON public.candidates(company_id);
DROP POLICY IF EXISTS "Users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members can delete candidates" ON public.candidates;
CREATE POLICY "Company members can view candidates" ON public.candidates FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert candidates" ON public.candidates FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update candidates" ON public.candidates FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete candidates" ON public.candidates FOR DELETE USING (public.is_company_member(company_id));

-- 15. candidate_family_members (FK to candidates)
ALTER TABLE public.candidate_family_members ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.candidate_family_members cfm SET company_id = c.company_id FROM public.candidates c WHERE cfm.candidate_id = c.id AND cfm.company_id IS NULL;
-- Some orphan records may exist, allow NULL temporarily then delete orphans
DELETE FROM public.candidate_family_members WHERE company_id IS NULL;
ALTER TABLE public.candidate_family_members ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidate_family_members_company ON public.candidate_family_members(company_id);
DROP POLICY IF EXISTS "Users can manage candidate family" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Company members can view candidate family" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Company members can insert candidate family" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Company members can update candidate family" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Company members can delete candidate family" ON public.candidate_family_members;
CREATE POLICY "Company members can view candidate family" ON public.candidate_family_members FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert candidate family" ON public.candidate_family_members FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update candidate family" ON public.candidate_family_members FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete candidate family" ON public.candidate_family_members FOR DELETE USING (public.is_company_member(company_id));


-- ============================================================
-- MIGRATION: 20260402192915_54c6bc28-034c-4035-b5f2-f834a416e1ea.sql
-- ============================================================

-- 1. selection_steps (parent: candidates → now has company_id)
ALTER TABLE public.selection_steps ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.selection_steps ss SET company_id = c.company_id FROM public.candidates c WHERE ss.candidate_id = c.id AND ss.company_id IS NULL;
DELETE FROM public.selection_steps WHERE company_id IS NULL;
ALTER TABLE public.selection_steps ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_selection_steps_company ON public.selection_steps(company_id);
DROP POLICY IF EXISTS "Users can manage selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Company members can view selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Company members can insert selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Company members can update selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Company members can delete selection steps" ON public.selection_steps;
CREATE POLICY "Company members can view selection steps" ON public.selection_steps FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert selection steps" ON public.selection_steps FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update selection steps" ON public.selection_steps FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete selection steps" ON public.selection_steps FOR DELETE USING (public.is_company_member(company_id));

-- 2. evaluation_criteria (parent: evaluation_templates)
ALTER TABLE public.evaluation_criteria ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.evaluation_criteria ec SET company_id = et.company_id FROM public.evaluation_templates et WHERE ec.template_id = et.id AND ec.company_id IS NULL;
DELETE FROM public.evaluation_criteria WHERE company_id IS NULL;
ALTER TABLE public.evaluation_criteria ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_company ON public.evaluation_criteria(company_id);
DROP POLICY IF EXISTS "Users can manage evaluation criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Company members can view eval criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Company members can insert eval criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Company members can update eval criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Company members can delete eval criteria" ON public.evaluation_criteria;
CREATE POLICY "Company members can view eval criteria" ON public.evaluation_criteria FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert eval criteria" ON public.evaluation_criteria FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update eval criteria" ON public.evaluation_criteria FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete eval criteria" ON public.evaluation_criteria FOR DELETE USING (public.is_company_member(company_id));

-- 3. evaluation_scores (parent: performance_evaluations)
ALTER TABLE public.evaluation_scores ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.evaluation_scores es SET company_id = pe.company_id FROM public.performance_evaluations pe WHERE es.evaluation_id = pe.id AND es.company_id IS NULL;
DELETE FROM public.evaluation_scores WHERE company_id IS NULL;
ALTER TABLE public.evaluation_scores ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_company ON public.evaluation_scores(company_id);
DROP POLICY IF EXISTS "Users can manage evaluation scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Company members can view eval scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Company members can insert eval scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Company members can update eval scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Company members can delete eval scores" ON public.evaluation_scores;
CREATE POLICY "Company members can view eval scores" ON public.evaluation_scores FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert eval scores" ON public.evaluation_scores FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update eval scores" ON public.evaluation_scores FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete eval scores" ON public.evaluation_scores FOR DELETE USING (public.is_company_member(company_id));

-- 4. evaluation_template_positions (parent: evaluation_templates)
ALTER TABLE public.evaluation_template_positions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.evaluation_template_positions etp SET company_id = et.company_id FROM public.evaluation_templates et WHERE etp.template_id = et.id AND etp.company_id IS NULL;
DELETE FROM public.evaluation_template_positions WHERE company_id IS NULL;
ALTER TABLE public.evaluation_template_positions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_template_positions_company ON public.evaluation_template_positions(company_id);
DROP POLICY IF EXISTS "Users can manage template positions" ON public.evaluation_template_positions;
DROP POLICY IF EXISTS "Company members can view template positions" ON public.evaluation_template_positions;
DROP POLICY IF EXISTS "Company members can insert template positions" ON public.evaluation_template_positions;
DROP POLICY IF EXISTS "Company members can update template positions" ON public.evaluation_template_positions;
DROP POLICY IF EXISTS "Company members can delete template positions" ON public.evaluation_template_positions;
CREATE POLICY "Company members can view template positions" ON public.evaluation_template_positions FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert template positions" ON public.evaluation_template_positions FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update template positions" ON public.evaluation_template_positions FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete template positions" ON public.evaluation_template_positions FOR DELETE USING (public.is_company_member(company_id));

-- 5. dotation_profesiograma_items (parent: dotation_profesiograma)
ALTER TABLE public.dotation_profesiograma_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.dotation_profesiograma_items dpi SET company_id = dp.company_id FROM public.dotation_profesiograma dp WHERE dpi.profesiograma_id = dp.id AND dpi.company_id IS NULL;
DELETE FROM public.dotation_profesiograma_items WHERE company_id IS NULL;
ALTER TABLE public.dotation_profesiograma_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dotation_profesiograma_items_company ON public.dotation_profesiograma_items(company_id);
DROP POLICY IF EXISTS "Users can manage profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can view profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can insert profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can update profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Company members can delete profesiograma items" ON public.dotation_profesiograma_items;
CREATE POLICY "Company members can view profesiograma items" ON public.dotation_profesiograma_items FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert profesiograma items" ON public.dotation_profesiograma_items FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update profesiograma items" ON public.dotation_profesiograma_items FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete profesiograma items" ON public.dotation_profesiograma_items FOR DELETE USING (public.is_company_member(company_id));

-- 6. exam_profesiograma_items (parent: exam_profesiograma)
ALTER TABLE public.exam_profesiograma_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.exam_profesiograma_items epi SET company_id = ep.company_id FROM public.exam_profesiograma ep WHERE epi.profesiograma_id = ep.id AND epi.company_id IS NULL;
DELETE FROM public.exam_profesiograma_items WHERE company_id IS NULL;
ALTER TABLE public.exam_profesiograma_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_profesiograma_items_company ON public.exam_profesiograma_items(company_id);
DROP POLICY IF EXISTS "Users can manage exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can view exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can insert exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can update exam prof items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Company members can delete exam prof items" ON public.exam_profesiograma_items;
CREATE POLICY "Company members can view exam prof items" ON public.exam_profesiograma_items FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert exam prof items" ON public.exam_profesiograma_items FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update exam prof items" ON public.exam_profesiograma_items FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete exam prof items" ON public.exam_profesiograma_items FOR DELETE USING (public.is_company_member(company_id));

-- 7. exam_delivery_transactions (parent: employees_v2)
ALTER TABLE public.exam_delivery_transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.exam_delivery_transactions edt SET company_id = e.company_id FROM public.employees_v2 e WHERE edt.employee_id = e.id AND edt.company_id IS NULL;
DELETE FROM public.exam_delivery_transactions WHERE company_id IS NULL;
ALTER TABLE public.exam_delivery_transactions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_delivery_transactions_company ON public.exam_delivery_transactions(company_id);
DROP POLICY IF EXISTS "Users can manage exam delivery transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can view exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can insert exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can update exam transactions" ON public.exam_delivery_transactions;
DROP POLICY IF EXISTS "Company members can delete exam transactions" ON public.exam_delivery_transactions;
CREATE POLICY "Company members can view exam transactions" ON public.exam_delivery_transactions FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert exam transactions" ON public.exam_delivery_transactions FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update exam transactions" ON public.exam_delivery_transactions FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete exam transactions" ON public.exam_delivery_transactions FOR DELETE USING (public.is_company_member(company_id));

-- 8. exam_delivery_items (parent: exam_delivery_transactions → now has company_id)
ALTER TABLE public.exam_delivery_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.exam_delivery_items edi SET company_id = edt.company_id FROM public.exam_delivery_transactions edt WHERE edi.transaction_id = edt.id AND edi.company_id IS NULL;
DELETE FROM public.exam_delivery_items WHERE company_id IS NULL;
ALTER TABLE public.exam_delivery_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_delivery_items_company ON public.exam_delivery_items(company_id);
DROP POLICY IF EXISTS "Users can manage exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can view exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can insert exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can update exam items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Company members can delete exam items" ON public.exam_delivery_items;
CREATE POLICY "Company members can view exam items" ON public.exam_delivery_items FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert exam items" ON public.exam_delivery_items FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update exam items" ON public.exam_delivery_items FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete exam items" ON public.exam_delivery_items FOR DELETE USING (public.is_company_member(company_id));

-- 9. shift_cycle_days (parent: shift_cycles)
ALTER TABLE public.shift_cycle_days ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.shift_cycle_days scd SET company_id = sc.company_id FROM public.shift_cycles sc WHERE scd.shift_cycle_id = sc.id AND scd.company_id IS NULL;
DELETE FROM public.shift_cycle_days WHERE company_id IS NULL;
ALTER TABLE public.shift_cycle_days ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_cycle_days_company ON public.shift_cycle_days(company_id);
DROP POLICY IF EXISTS "Users can manage shift cycle days" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "Company members can view shift cycle days" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "Company members can insert shift cycle days" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "Company members can update shift cycle days" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "Company members can delete shift cycle days" ON public.shift_cycle_days;
CREATE POLICY "Company members can view shift cycle days" ON public.shift_cycle_days FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert shift cycle days" ON public.shift_cycle_days FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update shift cycle days" ON public.shift_cycle_days FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete shift cycle days" ON public.shift_cycle_days FOR DELETE USING (public.is_company_member(company_id));

-- 10. employee_shifts (parent: employees - legacy table)
ALTER TABLE public.employee_shifts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.employee_shifts es SET company_id = e.company_id FROM public.employees e WHERE es.employee_id = e.id AND es.company_id IS NULL;
DELETE FROM public.employee_shifts WHERE company_id IS NULL;
ALTER TABLE public.employee_shifts ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_shifts_company ON public.employee_shifts(company_id);
DROP POLICY IF EXISTS "Users can manage employee shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Company members can view employee shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Company members can insert employee shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Company members can update employee shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Company members can delete employee shifts" ON public.employee_shifts;
CREATE POLICY "Company members can view employee shifts" ON public.employee_shifts FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert employee shifts" ON public.employee_shifts FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update employee shifts" ON public.employee_shifts FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete employee shifts" ON public.employee_shifts FOR DELETE USING (public.is_company_member(company_id));

-- 11. training_attendance (parent: training_sessions)
ALTER TABLE public.training_attendance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.training_attendance ta SET company_id = ts.company_id FROM public.training_sessions ts WHERE ta.session_id = ts.id AND ta.company_id IS NULL;
DELETE FROM public.training_attendance WHERE company_id IS NULL;
ALTER TABLE public.training_attendance ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_attendance_company ON public.training_attendance(company_id);
DROP POLICY IF EXISTS "Users can manage training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can view training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can insert training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can update training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can delete training attendance" ON public.training_attendance;
CREATE POLICY "Company members can view training attendance" ON public.training_attendance FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert training attendance" ON public.training_attendance FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update training attendance" ON public.training_attendance FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete training attendance" ON public.training_attendance FOR DELETE USING (public.is_company_member(company_id));

-- 12. training_media (parent: training_courses)
ALTER TABLE public.training_media ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.training_media tm SET company_id = tc.company_id FROM public.training_courses tc WHERE tm.course_id = tc.id AND tm.company_id IS NULL;
DELETE FROM public.training_media WHERE company_id IS NULL;
ALTER TABLE public.training_media ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_media_company ON public.training_media(company_id);
DROP POLICY IF EXISTS "Users can manage training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can view training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can insert training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can update training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can delete training media" ON public.training_media;
CREATE POLICY "Company members can view training media" ON public.training_media FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert training media" ON public.training_media FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update training media" ON public.training_media FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete training media" ON public.training_media FOR DELETE USING (public.is_company_member(company_id));

-- 13. training_plan_items (parent: training_plans)
ALTER TABLE public.training_plan_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.training_plan_items tpi SET company_id = tp.company_id FROM public.training_plans tp WHERE tpi.plan_id = tp.id AND tpi.company_id IS NULL;
DELETE FROM public.training_plan_items WHERE company_id IS NULL;
ALTER TABLE public.training_plan_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_plan_items_company ON public.training_plan_items(company_id);
DROP POLICY IF EXISTS "Users can manage training plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can view plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can insert plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can update plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can delete plan items" ON public.training_plan_items;
CREATE POLICY "Company members can view plan items" ON public.training_plan_items FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert plan items" ON public.training_plan_items FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update plan items" ON public.training_plan_items FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete plan items" ON public.training_plan_items FOR DELETE USING (public.is_company_member(company_id));

-- 14. requisition_vacancy_codes (parent: personnel_requisitions)
ALTER TABLE public.requisition_vacancy_codes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.requisition_vacancy_codes rvc SET company_id = pr.company_id FROM public.personnel_requisitions pr WHERE rvc.requisition_id = pr.id AND rvc.company_id IS NULL;
DELETE FROM public.requisition_vacancy_codes WHERE company_id IS NULL;
ALTER TABLE public.requisition_vacancy_codes ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requisition_vacancy_codes_company ON public.requisition_vacancy_codes(company_id);
DROP POLICY IF EXISTS "Users can manage vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can view vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can insert vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can update vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Company members can delete vacancy codes" ON public.requisition_vacancy_codes;
CREATE POLICY "Company members can view vacancy codes" ON public.requisition_vacancy_codes FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert vacancy codes" ON public.requisition_vacancy_codes FOR INSERT WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update vacancy codes" ON public.requisition_vacancy_codes FOR UPDATE USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete vacancy codes" ON public.requisition_vacancy_codes FOR DELETE USING (public.is_company_member(company_id));


-- ============================================================
-- MIGRATION: 20260402201326_a489b925-bb48-49d3-b24c-e609adb90374.sql
-- ============================================================

-- =====================================================
-- Clean up legacy JOIN-based RLS policies
-- These tables now have direct company_id columns with
-- simpler is_company_member(company_id) policies
-- =====================================================

-- candidate_family_members: remove old JOIN-based policies (direct ones exist)
DROP POLICY IF EXISTS "Users can delete candidate family members" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Users can insert candidate family members" ON public.candidate_family_members;
DROP POLICY IF EXISTS "Users can view candidate family members" ON public.candidate_family_members;

-- candidates: remove old JOIN-based policies (direct ones exist)
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can view candidates from their company vacancies" ON public.candidates;

-- disciplinary_defenses
DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary defenses" ON public.disciplinary_defenses;
DROP POLICY IF EXISTS "Users can view disciplinary defenses" ON public.disciplinary_defenses;

-- disciplinary_evidence
DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary evidence" ON public.disciplinary_evidence;
DROP POLICY IF EXISTS "Users can view disciplinary evidence" ON public.disciplinary_evidence;

-- disciplinary_timeline
DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary timeline" ON public.disciplinary_timeline;
DROP POLICY IF EXISTS "Users can view disciplinary timeline" ON public.disciplinary_timeline;

-- dotation_profesiograma_items
DROP POLICY IF EXISTS "Admin/RRHH can delete profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Admin/RRHH can insert profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Admin/RRHH can update profesiograma items" ON public.dotation_profesiograma_items;
DROP POLICY IF EXISTS "Members can view profesiograma items" ON public.dotation_profesiograma_items;

-- evaluation_criteria
DROP POLICY IF EXISTS "Admin and RRHH can manage evaluation criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Users can view evaluation criteria" ON public.evaluation_criteria;

-- evaluation_scores
DROP POLICY IF EXISTS "Admin and RRHH can manage evaluation scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "Users can view evaluation scores" ON public.evaluation_scores;

-- evaluation_template_positions
DROP POLICY IF EXISTS "Users can manage template positions for their company" ON public.evaluation_template_positions;

-- exam_delivery_items
DROP POLICY IF EXISTS "Admin/RRHH can manage exam delivery items" ON public.exam_delivery_items;
DROP POLICY IF EXISTS "Users can view exam delivery items" ON public.exam_delivery_items;

-- exam_profesiograma_items
DROP POLICY IF EXISTS "Admin/RRHH can manage exam profesiograma items" ON public.exam_profesiograma_items;
DROP POLICY IF EXISTS "Users can view exam profesiograma items" ON public.exam_profesiograma_items;

-- requisition_vacancy_codes
DROP POLICY IF EXISTS "Admin and RRHH can manage vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can delete vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can insert vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can view vacancy codes" ON public.requisition_vacancy_codes;
DROP POLICY IF EXISTS "Users can view vacancy codes from their requisitions" ON public.requisition_vacancy_codes;

-- selection_steps
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage selection steps" ON public.selection_steps;
DROP POLICY IF EXISTS "Users can view selection steps from their company" ON public.selection_steps;

-- shift_cycle_days
DROP POLICY IF EXISTS "shift_cycle_days_delete" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "shift_cycle_days_insert" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "shift_cycle_days_select" ON public.shift_cycle_days;
DROP POLICY IF EXISTS "shift_cycle_days_update" ON public.shift_cycle_days;

-- training_attendance
DROP POLICY IF EXISTS "Admin and RRHH can manage training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Users can view training attendance" ON public.training_attendance;

-- training_completions: keep the public insert policy for tokens, remove JOIN-based select
DROP POLICY IF EXISTS "Public can insert completions with valid token" ON public.training_completions;

-- training_plan_items
DROP POLICY IF EXISTS "Admin and RRHH can manage training plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Users can view training plan items" ON public.training_plan_items;

-- Re-create training_completions anon insert (it's needed for token-based access)
CREATE POLICY "Anon can insert completions via token"
  ON public.training_completions FOR INSERT
  WITH CHECK (true);


-- ============================================================
-- MIGRATION: 20260402203349_59895a6d-a981-4d4b-84d8-e77ab399b792.sql
-- ============================================================
-- Table to mark super-admin users
CREATE TABLE public.super_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  )
$$;

-- RLS: only super-admins can see/manage super_admins table
CREATE POLICY "Super admins can view" ON public.super_admins
  FOR SELECT TO authenticated USING (public.is_super_admin());

CREATE POLICY "Super admins can insert" ON public.super_admins
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete" ON public.super_admins
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- Allow super-admins to see ALL companies (update existing RLS)
DROP POLICY IF EXISTS "Companies are visible to assigned users" ON public.companies;
CREATE POLICY "Companies visible to members or super admins" ON public.companies
  FOR SELECT TO authenticated USING (
    public.is_company_member(id) OR public.is_super_admin()
  );

-- Allow super-admins to create companies
DROP POLICY IF EXISTS "Companies can be created by authenticated users" ON public.companies;
CREATE POLICY "Companies can be created" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (
    public.is_company_member(id) OR public.is_super_admin()
  );

-- Allow super-admins to update any company  
DROP POLICY IF EXISTS "Companies can be updated by members" ON public.companies;
CREATE POLICY "Companies can be updated" ON public.companies
  FOR UPDATE TO authenticated USING (
    public.is_company_member(id) OR public.is_super_admin()
  );

-- Allow super-admins to manage user_company_assignments
DROP POLICY IF EXISTS "Assignments visible to company members" ON public.user_company_assignments;
CREATE POLICY "Assignments visible to members or super admins" ON public.user_company_assignments
  FOR SELECT TO authenticated USING (
    public.is_company_member(company_id) OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Assignments can be created by admins" ON public.user_company_assignments;
CREATE POLICY "Assignments can be created" ON public.user_company_assignments
  FOR INSERT TO authenticated WITH CHECK (
    public.is_company_member(company_id) OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Assignments can be deleted by admins" ON public.user_company_assignments;
CREATE POLICY "Assignments can be deleted" ON public.user_company_assignments
  FOR DELETE TO authenticated USING (
    public.is_company_member(company_id) OR public.is_super_admin()
  );

-- ============================================================
-- MIGRATION: 20260403000013_4dd903d4-804a-4a90-b184-07a492aaa800.sql
-- ============================================================

-- Create transfer status enum
CREATE TYPE public.transfer_status AS ENUM ('pending', 'completed', 'cancelled');

-- Create employee_transfers table
CREATE TABLE public.employee_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_company_id UUID NOT NULL REFERENCES public.companies(id),
  target_company_id UUID NOT NULL REFERENCES public.companies(id),
  source_employee_id UUID NOT NULL REFERENCES public.employees_v2(id),
  target_employee_id UUID REFERENCES public.employees_v2(id),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status transfer_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_transfers ENABLE ROW LEVEL SECURITY;

-- RLS: members of either company can view
CREATE POLICY "Members of source or target company can view transfers"
  ON public.employee_transfers FOR SELECT TO authenticated
  USING (
    public.is_company_member(source_company_id) OR public.is_company_member(target_company_id)
    OR public.is_super_admin()
  );

-- RLS: members of source company can create
CREATE POLICY "Members of source company can create transfers"
  ON public.employee_transfers FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_member(source_company_id) OR public.is_super_admin()
  );

-- RLS: members of source company can update
CREATE POLICY "Members of source company can update transfers"
  ON public.employee_transfers FOR UPDATE TO authenticated
  USING (
    public.is_company_member(source_company_id) OR public.is_super_admin()
  );

-- Updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.employee_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- MIGRATION: 20260403141348_a1447621-f8e0-4d04-9c2b-32a8b40d8d88.sql
-- ============================================================

ALTER FUNCTION public.insert_default_holidays() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.insert_default_leave_types() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.insert_default_admin_role() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.insert_default_company_config() SECURITY DEFINER SET search_path = public;


-- ============================================================
-- MIGRATION: 20260410234046_acb968fc-ada5-4ad3-8467-a880a6c44a91.sql
-- ============================================================
-- Drop existing ALL policy
DROP POLICY IF EXISTS "Admin and RRHH can manage areas" ON public.areas;

-- Create updated policy that also checks super_admin and custom system roles
CREATE POLICY "Admin and RRHH can manage areas" ON public.areas
FOR ALL TO authenticated
USING (
  is_company_member(company_id) AND (
    is_admin_or_rrhh()
    OR is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_custom_roles ucr
      JOIN public.custom_roles cr ON ucr.role_id = cr.id
      WHERE ucr.user_id = auth.uid() AND cr.is_active = true AND cr.is_system = true
    )
  )
)
WITH CHECK (
  is_company_member(company_id) AND (
    is_admin_or_rrhh()
    OR is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_custom_roles ucr
      JOIN public.custom_roles cr ON ucr.role_id = cr.id
      WHERE ucr.user_id = auth.uid() AND cr.is_active = true AND cr.is_system = true
    )
  )
);

-- ============================================================
-- MIGRATION: 20260410234341_cb09d4db-6fc4-4876-83ea-2a6bf8a7baa9.sql
-- ============================================================
-- Drop and recreate the areas management policy
DROP POLICY IF EXISTS "Admin and RRHH can manage areas" ON public.areas;

CREATE POLICY "Admin and RRHH can manage areas" ON public.areas
FOR ALL TO authenticated
USING (
  is_super_admin()
  OR (
    is_company_member(company_id) AND (
      is_admin_or_rrhh()
      OR EXISTS (
        SELECT 1 FROM public.user_custom_roles ucr
        JOIN public.custom_roles cr ON ucr.role_id = cr.id
        WHERE ucr.user_id = auth.uid() AND cr.is_active = true AND cr.is_system = true
      )
    )
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    is_company_member(company_id) AND (
      is_admin_or_rrhh()
      OR EXISTS (
        SELECT 1 FROM public.user_custom_roles ucr
        JOIN public.custom_roles cr ON ucr.role_id = cr.id
        WHERE ucr.user_id = auth.uid() AND cr.is_active = true AND cr.is_system = true
      )
    )
  )
);

-- Also update the SELECT policy to allow super admins
DROP POLICY IF EXISTS "Users can view company areas" ON public.areas;

CREATE POLICY "Users can view company areas" ON public.areas
FOR SELECT TO authenticated
USING (
  is_super_admin()
  OR is_company_member(company_id)
  OR is_admin()
);

-- ============================================================
-- MIGRATION: 20260410235332_6630f606-499b-46b9-954c-21d5fd484d20.sql
-- ============================================================
-- Add parent_position_id for position hierarchy
ALTER TABLE public.positions
ADD COLUMN parent_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;

-- Index for hierarchy queries
CREATE INDEX idx_positions_parent_position_id ON public.positions(parent_position_id);


-- ============================================================
-- MIGRATION: 20260425233659_73eacc59-fd1d-4efb-9582-eb6e954f6737.sql
-- ============================================================
CREATE TABLE public.notification_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notification_id UUID NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
  recipient_user_id UUID NULL,
  recipient_email TEXT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  provider TEXT NULL,
  template_name TEXT NULL,
  subject TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  triggered_by_user_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notification_delivery_logs_company_created
  ON public.notification_delivery_logs(company_id, created_at DESC);

CREATE INDEX idx_notification_delivery_logs_recipient_user_created
  ON public.notification_delivery_logs(recipient_user_id, created_at DESC);

CREATE INDEX idx_notification_delivery_logs_channel_status
  ON public.notification_delivery_logs(channel, status);

CREATE POLICY "Company members can view delivery logs"
ON public.notification_delivery_logs
FOR SELECT
TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR (company_id IS NOT NULL AND public.is_company_member(company_id))
  OR public.is_admin_or_rrhh()
);

CREATE POLICY "Admins and HR can create delivery logs"
ON public.notification_delivery_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_rrhh()
  AND (company_id IS NULL OR public.is_company_member(company_id))
);

CREATE POLICY "Admins and HR can update delivery logs"
ON public.notification_delivery_logs
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_rrhh()
  AND (company_id IS NULL OR public.is_company_member(company_id))
)
WITH CHECK (
  public.is_admin_or_rrhh()
  AND (company_id IS NULL OR public.is_company_member(company_id))
);

CREATE TRIGGER update_notification_delivery_logs_updated_at
BEFORE UPDATE ON public.notification_delivery_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MIGRATION: 20260425233804_07096e53-1f33-474c-b318-b403589ce9d3.sql
-- ============================================================
CREATE POLICY "Admins and HR can view company notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_rrhh()
  AND (
    company_id IS NULL
    OR public.is_company_member(company_id)
  )
);

-- ============================================================
-- MIGRATION: 20260426000356_bf1d250f-df54-41e5-9962-f79e3faed1d9.sql
-- ============================================================
CREATE TABLE public.ai_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'app_help',
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_provider TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_chat_conversations_company_user_last
  ON public.ai_chat_conversations(company_id, user_id, last_message_at DESC);

CREATE INDEX idx_ai_chat_messages_conversation_created
  ON public.ai_chat_messages(conversation_id, created_at);

CREATE POLICY "Users can view own ai conversations"
ON public.ai_chat_conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can create own ai conversations"
ON public.ai_chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can update own ai conversations"
ON public.ai_chat_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND public.is_company_member(company_id))
WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can delete own ai conversations"
ON public.ai_chat_conversations
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can view own ai messages"
ON public.ai_chat_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE POLICY "Users can create own ai messages"
ON public.ai_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id));

CREATE TRIGGER update_ai_chat_conversations_updated_at
BEFORE UPDATE ON public.ai_chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.modules (code, name, icon, sort_order)
VALUES ('asistente_ia', 'Asistente IA', 'Bot', 28)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, a.action, m.name || ' - ' ||
  CASE a.action
    WHEN 'view' THEN 'Ver'
    WHEN 'create' THEN 'Crear'
    WHEN 'update' THEN 'Modificar'
    WHEN 'delete' THEN 'Eliminar'
  END
FROM public.modules m
CROSS JOIN (VALUES ('view'::permission_action), ('create'::permission_action), ('update'::permission_action), ('delete'::permission_action)) AS a(action)
WHERE m.code = 'asistente_ia'
ON CONFLICT (module_id, action) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'asistente_ia'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- MIGRATION: 20260426000442_0cb2a64e-ae95-4dce-a668-f1523fadf5a7.sql
-- ============================================================
DROP POLICY IF EXISTS "Users can view own ai conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can create own ai conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can update own ai conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can delete own ai conversations" ON public.ai_chat_conversations;
DROP POLICY IF EXISTS "Users can view own ai messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can create own ai messages" ON public.ai_chat_messages;

CREATE POLICY "Users can view own ai conversations"
ON public.ai_chat_conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can create own ai conversations"
ON public.ai_chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can update own ai conversations"
ON public.ai_chat_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()))
WITH CHECK (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can delete own ai conversations"
ON public.ai_chat_conversations
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can view own ai messages"
ON public.ai_chat_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

CREATE POLICY "Users can create own ai messages"
ON public.ai_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND (public.is_company_member(company_id) OR public.is_super_admin()));

-- ============================================================
-- MIGRATION: 20260427210214_261dd566-6e6f-47cc-8c32-049808cdf557.sql
-- ============================================================
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'certificados_laborales_academicos';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'proceso_seleccion';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'certificados_residencia';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'afiliaciones';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'examenes_ocupacionales';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'carne_vacunas';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'consulta_antecedentes';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'dotacion';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'contratos_otrosi';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'certificados_bancarios';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'documentos_retiro';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'inducciones_cursos';
ALTER TYPE public.employee_document_type ADD VALUE IF NOT EXISTS 'licencia_cursos';

-- ============================================================
-- MIGRATION: 20260427210956_06f14b80-58b8-4eb4-bc69-bc1ccf63604c.sql
-- ============================================================
CREATE TYPE public.document_expiry_alert_status AS ENUM ('pendiente', 'notificada', 'cerrada');

CREATE TABLE public.document_expiry_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  expires_at DATE NOT NULL,
  status public.document_expiry_alert_status NOT NULL DEFAULT 'pendiente',
  notification_id UUID NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
  notified_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,
  closed_by UUID NULL,
  close_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id)
);

ALTER TABLE public.document_expiry_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_document_expiry_alerts_company_status
  ON public.document_expiry_alerts(company_id, status, expires_at);

CREATE INDEX idx_document_expiry_alerts_employee
  ON public.document_expiry_alerts(employee_id, expires_at);

CREATE POLICY "Company members can view document expiry alerts"
ON public.document_expiry_alerts
FOR SELECT
USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Admin and HR can manage document expiry alerts"
ON public.document_expiry_alerts
FOR ALL
USING (public.is_super_admin() OR (public.is_admin_or_rrhh() AND public.is_company_member(company_id)))
WITH CHECK (public.is_super_admin() OR (public.is_admin_or_rrhh() AND public.is_company_member(company_id)));

CREATE OR REPLACE FUNCTION public.sync_document_expiry_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_valid = true AND NEW.expiry_date IS NOT NULL THEN
    INSERT INTO public.document_expiry_alerts (
      company_id,
      employee_id,
      document_id,
      expires_at,
      status,
      closed_at,
      closed_by,
      close_reason
    ) VALUES (
      NEW.company_id,
      NEW.employee_id,
      NEW.id,
      NEW.expiry_date,
      'pendiente',
      NULL,
      NULL,
      NULL
    )
    ON CONFLICT (document_id)
    DO UPDATE SET
      company_id = EXCLUDED.company_id,
      employee_id = EXCLUDED.employee_id,
      expires_at = EXCLUDED.expires_at,
      status = CASE
        WHEN public.document_expiry_alerts.status = 'cerrada' THEN 'pendiente'::public.document_expiry_alert_status
        ELSE public.document_expiry_alerts.status
      END,
      closed_at = CASE
        WHEN public.document_expiry_alerts.status = 'cerrada' THEN NULL
        ELSE public.document_expiry_alerts.closed_at
      END,
      closed_by = CASE
        WHEN public.document_expiry_alerts.status = 'cerrada' THEN NULL
        ELSE public.document_expiry_alerts.closed_by
      END,
      close_reason = CASE
        WHEN public.document_expiry_alerts.status = 'cerrada' THEN NULL
        ELSE public.document_expiry_alerts.close_reason
      END,
      updated_at = now();
  ELSE
    UPDATE public.document_expiry_alerts
    SET
      status = 'cerrada',
      closed_at = COALESCE(closed_at, now()),
      close_reason = COALESCE(close_reason, 'Documento sin vencimiento o invalidado'),
      updated_at = now()
    WHERE document_id = NEW.id
      AND status <> 'cerrada';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_employee_document_expiry_alert
AFTER INSERT OR UPDATE OF expiry_date, is_valid, company_id, employee_id ON public.employee_documents
FOR EACH ROW
EXECUTE FUNCTION public.sync_document_expiry_alert();

CREATE TRIGGER update_document_expiry_alerts_updated_at
BEFORE UPDATE ON public.document_expiry_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TYPE public.vacancy_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.vacancy_status ADD VALUE IF NOT EXISTS 'pending_placed';
