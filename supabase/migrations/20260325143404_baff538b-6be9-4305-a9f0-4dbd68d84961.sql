
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
