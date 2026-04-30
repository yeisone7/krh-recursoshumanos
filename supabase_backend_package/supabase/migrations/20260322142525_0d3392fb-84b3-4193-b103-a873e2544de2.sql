
-- Create candidate_documents table
CREATE TABLE public.candidate_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  observations TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view candidate documents of their company"
  ON public.candidate_documents FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert candidate documents of their company"
  ON public.candidate_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can delete candidate documents of their company"
  ON public.candidate_documents FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));
