-- Keep Selection/Vacancies document uploads permissioned as candidate writes,
-- even after a candidate has been linked to an employee. The trigger mirrors
-- candidate documents into the employee file without requiring the uploader to
-- have employee-module write permissions.

CREATE OR REPLACE FUNCTION public.sync_candidate_document_to_employee_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_company_id uuid;
  v_document_type public.employee_document_type;
BEGIN
  SELECT c.employee_id, c.company_id
  INTO v_employee_id, v_company_id
  FROM public.candidates c
  WHERE c.id = NEW.candidate_id;

  IF v_employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_document_type := COALESCE(NULLIF(NEW.document_type::text, '')::public.employee_document_type, 'proceso_seleccion'::public.employee_document_type);
  EXCEPTION WHEN invalid_text_representation THEN
    v_document_type := 'proceso_seleccion'::public.employee_document_type;
  END;

  UPDATE public.employee_documents
  SET
    company_id = COALESCE(NEW.company_id, v_company_id),
    document_type = v_document_type,
    document_name = COALESCE(NULLIF(NEW.document_name, ''), NEW.file_name, 'Documento de seleccion'),
    file_name = NEW.file_name,
    file_size = NEW.file_size,
    mime_type = NEW.mime_type,
    expiry_date = NEW.expiry_date,
    observations = NEW.observations,
    uploaded_by = NEW.uploaded_by
  WHERE employee_id = v_employee_id
    AND file_url = NEW.file_url;

  IF NOT FOUND THEN
    INSERT INTO public.employee_documents (
      employee_id,
      company_id,
      document_type,
      document_name,
      file_url,
      file_name,
      file_size,
      mime_type,
      upload_date,
      expiry_date,
      is_valid,
      observations,
      uploaded_by
    )
    VALUES (
      v_employee_id,
      COALESCE(NEW.company_id, v_company_id),
      v_document_type,
      COALESCE(NULLIF(NEW.document_name, ''), NEW.file_name, 'Documento de seleccion'),
      NEW.file_url,
      NEW.file_name,
      NEW.file_size,
      NEW.mime_type,
      COALESCE(NEW.created_at::date, CURRENT_DATE),
      NEW.expiry_date,
      true,
      NEW.observations,
      NEW.uploaded_by
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_candidate_document_to_employee_document() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_candidate_document_to_employee_document() FROM anon;
REVOKE ALL ON FUNCTION public.sync_candidate_document_to_employee_document() FROM authenticated;

DROP TRIGGER IF EXISTS trg_sync_candidate_document_to_employee_document ON public.candidate_documents;
CREATE TRIGGER trg_sync_candidate_document_to_employee_document
AFTER INSERT OR UPDATE OF
  document_type,
  document_name,
  file_url,
  file_name,
  file_size,
  mime_type,
  expiry_date,
  observations,
  uploaded_by
ON public.candidate_documents
FOR EACH ROW
EXECUTE FUNCTION public.sync_candidate_document_to_employee_document();

INSERT INTO public.employee_documents (
  employee_id,
  company_id,
  document_type,
  document_name,
  file_url,
  file_name,
  file_size,
  mime_type,
  upload_date,
  expiry_date,
  is_valid,
  observations,
  uploaded_by
)
SELECT
  c.employee_id,
  COALESCE(cd.company_id, c.company_id),
  CASE
    WHEN cd.document_type::text = ANY(enum_range(NULL::public.employee_document_type)::text[])
      THEN cd.document_type::public.employee_document_type
    ELSE 'proceso_seleccion'::public.employee_document_type
  END,
  COALESCE(NULLIF(cd.document_name, ''), cd.file_name, 'Documento de seleccion'),
  cd.file_url,
  cd.file_name,
  cd.file_size,
  cd.mime_type,
  COALESCE(cd.created_at::date, CURRENT_DATE),
  cd.expiry_date,
  true,
  cd.observations,
  cd.uploaded_by
FROM public.candidate_documents cd
JOIN public.candidates c ON c.id = cd.candidate_id
WHERE c.employee_id IS NOT NULL
  AND cd.file_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_documents ed
    WHERE ed.employee_id = c.employee_id
      AND ed.file_url = cd.file_url
  );

DROP POLICY IF EXISTS "Employee module can view hired candidate storage documents" ON storage.objects;
CREATE POLICY "Employee module can view hired candidate storage documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'candidates'
  AND EXISTS (
    SELECT 1
    FROM public.candidate_documents cd
    JOIN public.candidates c ON c.id = cd.candidate_id
    JOIN public.employee_documents ed ON ed.employee_id = c.employee_id
    WHERE cd.company_id::text = (storage.foldername(name))[1]
      AND cd.candidate_id::text = (storage.foldername(name))[3]
      AND c.employee_id IS NOT NULL
      AND ed.file_url = cd.file_url
      AND (cd.file_url = name OR cd.file_url LIKE '%' || name)
      AND public.is_company_member(ed.company_id)
  )
);
