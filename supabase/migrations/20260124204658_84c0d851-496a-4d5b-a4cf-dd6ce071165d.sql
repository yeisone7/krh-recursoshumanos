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