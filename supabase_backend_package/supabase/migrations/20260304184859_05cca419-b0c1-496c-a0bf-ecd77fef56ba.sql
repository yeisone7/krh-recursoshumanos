
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
