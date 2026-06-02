-- Use a definer helper so candidate document RLS can validate candidate/company
-- ownership without being blocked by the candidates table RLS itself.

CREATE OR REPLACE FUNCTION public.can_manage_candidate_document(
  _candidate_id TEXT,
  _company_id TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _candidate_id IS NULL
        OR _company_id IS NULL
        OR _candidate_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        OR _company_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN false
      ELSE
        EXISTS (
          SELECT 1
          FROM public.candidates c
          WHERE c.id = _candidate_id::uuid
            AND c.company_id = _company_id::uuid
        )
        AND (
          public.is_admin_or_rrhh()
          OR public.is_psicologo()
          OR (
            _action = 'view'
            AND (
              public.check_user_permission(auth.uid(), 'seleccion', 'view')
              OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
              OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
            )
          )
          OR (
            _action = 'write'
            AND (
              public.check_user_permission(auth.uid(), 'seleccion', 'create')
              OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
            )
          )
          OR (
            _action = 'delete'
            AND (
              public.check_user_permission(auth.uid(), 'seleccion', 'delete')
              OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
            )
          )
        )
    END
$$;

DROP POLICY IF EXISTS "Selection permissions can upload candidate documents" ON storage.objects;
CREATE POLICY "Selection permissions can upload candidate documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'candidates'
  AND public.can_manage_candidate_document(
    (storage.foldername(name))[3],
    (storage.foldername(name))[1],
    'write'
  )
);

DROP POLICY IF EXISTS "Selection permissions can update candidate documents" ON storage.objects;
CREATE POLICY "Selection permissions can update candidate documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'candidates'
  AND public.can_manage_candidate_document(
    (storage.foldername(name))[3],
    (storage.foldername(name))[1],
    'write'
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'candidates'
  AND public.can_manage_candidate_document(
    (storage.foldername(name))[3],
    (storage.foldername(name))[1],
    'write'
  )
);

DROP POLICY IF EXISTS "Selection permissions can view candidate documents" ON public.candidate_documents;
CREATE POLICY "Selection permissions can view candidate documents"
ON public.candidate_documents
FOR SELECT
TO authenticated
USING (
  public.can_manage_candidate_document(candidate_id::text, company_id::text, 'view')
);

DROP POLICY IF EXISTS "Selection permissions can insert candidate documents" ON public.candidate_documents;
CREATE POLICY "Selection permissions can insert candidate documents"
ON public.candidate_documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_candidate_document(candidate_id::text, company_id::text, 'write')
);

DROP POLICY IF EXISTS "Selection permissions can delete candidate documents" ON public.candidate_documents;
CREATE POLICY "Selection permissions can delete candidate documents"
ON public.candidate_documents
FOR DELETE
TO authenticated
USING (
  public.can_manage_candidate_document(candidate_id::text, company_id::text, 'delete')
);
