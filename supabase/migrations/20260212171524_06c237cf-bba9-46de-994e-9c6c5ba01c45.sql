
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
