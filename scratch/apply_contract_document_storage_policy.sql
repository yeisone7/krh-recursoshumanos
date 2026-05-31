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
