
-- 1. Create platforms catalog
CREATE TABLE public.vacancy_publication_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.vacancy_publication_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view platforms" ON public.vacancy_publication_platforms
  FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "Company members can insert platforms" ON public.vacancy_publication_platforms
  FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "Company members can update platforms" ON public.vacancy_publication_platforms
  FOR UPDATE TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "Company members can delete platforms" ON public.vacancy_publication_platforms
  FOR DELETE TO authenticated USING (public.is_company_member(company_id));

-- 2. Add platform_id to existing requisition_vacancy_codes
ALTER TABLE public.requisition_vacancy_codes
  ADD COLUMN IF NOT EXISTS platform_id UUID REFERENCES public.vacancy_publication_platforms(id) ON DELETE CASCADE;

-- 3. Add seleccion fields if not already added
ALTER TABLE public.personnel_requisitions
  ADD COLUMN IF NOT EXISTS seleccion_perfil_cargo_creado BOOLEAN,
  ADD COLUMN IF NOT EXISTS seleccion_tipo_mano_obra TEXT;

-- 4. RLS on requisition_vacancy_codes
ALTER TABLE public.requisition_vacancy_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view vacancy codes" ON public.requisition_vacancy_codes;
  DROP POLICY IF EXISTS "Users can insert vacancy codes" ON public.requisition_vacancy_codes;
  DROP POLICY IF EXISTS "Users can delete vacancy codes" ON public.requisition_vacancy_codes;
END $$;

CREATE POLICY "Users can view vacancy codes" ON public.requisition_vacancy_codes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.personnel_requisitions pr WHERE pr.id = requisition_id AND public.is_company_member(pr.company_id))
  );
CREATE POLICY "Users can insert vacancy codes" ON public.requisition_vacancy_codes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.personnel_requisitions pr WHERE pr.id = requisition_id AND public.is_company_member(pr.company_id))
  );
CREATE POLICY "Users can delete vacancy codes" ON public.requisition_vacancy_codes
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.personnel_requisitions pr WHERE pr.id = requisition_id AND public.is_company_member(pr.company_id))
  );
