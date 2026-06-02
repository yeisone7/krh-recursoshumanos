-- Fix candidate document uploads for non-admin users with selection permissions.
--
-- The previous policies still required a direct row in user_company_assignments.
-- Users with dynamic selection roles can reach candidates through permission-based
-- policies, but the storage and metadata inserts were still failing RLS.

DROP POLICY IF EXISTS "Selection permissions can upload candidate documents" ON storage.objects;
CREATE POLICY "Selection permissions can upload candidate documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'candidates'
  AND EXISTS (
    SELECT 1
    FROM public.candidates c
    WHERE c.id::text = (storage.foldername(name))[3]
      AND c.company_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
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
  AND EXISTS (
    SELECT 1
    FROM public.candidates c
    WHERE c.id::text = (storage.foldername(name))[3]
      AND c.company_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'candidates'
  AND EXISTS (
    SELECT 1
    FROM public.candidates c
    WHERE c.id::text = (storage.foldername(name))[3]
      AND c.company_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);

DROP POLICY IF EXISTS "Selection permissions can view candidate documents" ON public.candidate_documents;
CREATE POLICY "Selection permissions can view candidate documents"
ON public.candidate_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidates c
    WHERE c.id = candidate_documents.candidate_id
      AND c.company_id = candidate_documents.company_id
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'view')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);

DROP POLICY IF EXISTS "Selection permissions can insert candidate documents" ON public.candidate_documents;
CREATE POLICY "Selection permissions can insert candidate documents"
ON public.candidate_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.candidates c
    WHERE c.id = candidate_documents.candidate_id
      AND c.company_id = candidate_documents.company_id
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);

DROP POLICY IF EXISTS "Selection permissions can delete candidate documents" ON public.candidate_documents;
CREATE POLICY "Selection permissions can delete candidate documents"
ON public.candidate_documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidates c
    WHERE c.id = candidate_documents.candidate_id
      AND c.company_id = candidate_documents.company_id
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'delete')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);
