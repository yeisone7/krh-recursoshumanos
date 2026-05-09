-- Create education_levels table
CREATE TABLE IF NOT EXISTS public.education_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view education levels of their company" 
ON public.education_levels FOR SELECT 
USING (company_id = auth.get_user_company_id());

CREATE POLICY "Users can insert education levels of their company" 
ON public.education_levels FOR INSERT 
WITH CHECK (company_id = auth.get_user_company_id());

CREATE POLICY "Users can update education levels of their company" 
ON public.education_levels FOR UPDATE 
USING (company_id = auth.get_user_company_id());

CREATE POLICY "Users can delete education levels of their company" 
ON public.education_levels FOR DELETE 
USING (company_id = auth.get_user_company_id());

-- Add education_level_id to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS education_level_id UUID REFERENCES public.education_levels(id);

-- Add education_level_id to candidates
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS education_level_id UUID REFERENCES public.education_levels(id);

-- Add education_level_id to position_profiles
ALTER TABLE public.position_profiles ADD COLUMN IF NOT EXISTS education_level_id UUID REFERENCES public.education_levels(id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_education_levels_updated_at
    BEFORE UPDATE ON public.education_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
