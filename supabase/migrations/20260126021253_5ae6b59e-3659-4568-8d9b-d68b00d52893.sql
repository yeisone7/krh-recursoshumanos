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