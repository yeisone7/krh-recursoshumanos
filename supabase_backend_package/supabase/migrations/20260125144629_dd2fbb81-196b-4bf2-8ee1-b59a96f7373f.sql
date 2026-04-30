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