-- Allow selection roles to upload candidate documents into the shared documents bucket.

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
    FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
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
    FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
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
    FROM public.user_company_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.company_id::text = (storage.foldername(name))[1]
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'create')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);
