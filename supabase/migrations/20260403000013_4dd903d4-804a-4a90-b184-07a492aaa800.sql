
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
