
-- Table for vacancy documents
CREATE TABLE public.vacancy_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'otro',
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  observations TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vacancy_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view vacancy documents for their company"
  ON public.vacancy_documents FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert vacancy documents for their company"
  ON public.vacancy_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can delete vacancy documents for their company"
  ON public.vacancy_documents FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));

-- Trigger for updated_at
CREATE TRIGGER update_vacancy_documents_updated_at
  BEFORE UPDATE ON public.vacancy_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
