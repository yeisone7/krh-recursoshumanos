
CREATE TABLE public.candidate_family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view candidate family members"
  ON public.candidate_family_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.vacancies v ON c.vacancy_id = v.id
      WHERE c.id = candidate_family_members.candidate_id
        AND public.is_company_member(v.company_id)
    )
  );

CREATE POLICY "Users can insert candidate family members"
  ON public.candidate_family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.vacancies v ON c.vacancy_id = v.id
      WHERE c.id = candidate_family_members.candidate_id
        AND public.is_company_member(v.company_id)
    )
  );

CREATE POLICY "Users can delete candidate family members"
  ON public.candidate_family_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.vacancies v ON c.vacancy_id = v.id
      WHERE c.id = candidate_family_members.candidate_id
        AND public.is_company_member(v.company_id)
    )
  );
