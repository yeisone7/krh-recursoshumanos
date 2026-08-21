-- Match the company filter and sort order used by the selection catalog list queries.
-- These indexes keep the first database response fast as the catalogs grow.
CREATE INDEX IF NOT EXISTS selection_vacancy_information_company_created_idx
  ON public.selection_vacancy_information (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS selection_medical_exam_information_company_created_idx
  ON public.selection_medical_exam_information (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS selection_pink_list_company_date_created_idx
  ON public.selection_pink_list (company_id, reference_date DESC, created_at DESC);
