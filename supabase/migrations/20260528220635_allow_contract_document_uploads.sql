-- Allow company members to upload versioned contract documents.
-- Document paths follow: {company_id}/{entity_type}/{entity_id}/{filename}
-- Scope is limited to entity_type folders: contract and contract_extension.

BEGIN;

DROP POLICY IF EXISTS "Company members can upload contract documents" ON storage.objects;
CREATE POLICY "Company members can upload contract documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] IN ('contract', 'contract_extension')
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Company members can update contract documents" ON storage.objects;
CREATE POLICY "Company members can update contract documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] IN ('contract', 'contract_extension')
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] IN ('contract', 'contract_extension')
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Company members can insert contract document versions" ON public.document_versions;
CREATE POLICY "Company members can insert contract document versions"
ON public.document_versions
FOR INSERT
TO authenticated
WITH CHECK (
  entity_type IN ('contract', 'contract_extension')
  AND uploaded_by = auth.uid()
  AND public.is_company_member(company_id)
);

DROP POLICY IF EXISTS "Company members can update contract document versions" ON public.document_versions;
CREATE POLICY "Company members can update contract document versions"
ON public.document_versions
FOR UPDATE
TO authenticated
USING (
  entity_type IN ('contract', 'contract_extension')
  AND public.is_company_member(company_id)
)
WITH CHECK (
  entity_type IN ('contract', 'contract_extension')
  AND public.is_company_member(company_id)
);

COMMIT;
