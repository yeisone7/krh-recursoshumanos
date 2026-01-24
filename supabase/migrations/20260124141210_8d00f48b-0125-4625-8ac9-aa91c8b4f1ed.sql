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