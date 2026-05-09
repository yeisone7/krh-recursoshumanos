-- Create professions table
CREATE TABLE IF NOT EXISTS public.professions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view professions of their company" 
ON public.professions FOR SELECT 
USING (company_id = auth.get_user_company_id());

CREATE POLICY "Users can insert professions of their company" 
ON public.professions FOR INSERT 
WITH CHECK (company_id = auth.get_user_company_id());

CREATE POLICY "Users can update professions of their company" 
ON public.professions FOR UPDATE 
USING (company_id = auth.get_user_company_id());

CREATE POLICY "Users can delete professions of their company" 
ON public.professions FOR DELETE 
USING (company_id = auth.get_user_company_id());

-- Add profession_id to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS profession_id UUID REFERENCES public.professions(id);

-- Add profession_id to candidates
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS profession_id UUID REFERENCES public.professions(id);

-- Trigger for updated_at
CREATE TRIGGER update_professions_updated_at
    BEFORE UPDATE ON public.professions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
