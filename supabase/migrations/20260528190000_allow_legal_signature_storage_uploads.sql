-- Allow authenticated company users to upload legal signature images.
-- Existing training-media policies only allow paths tied to training_courses.

BEGIN;

DROP POLICY IF EXISTS "Company members can upload legal signatures" ON storage.objects;
CREATE POLICY "Company members can upload legal signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-media'
  AND (storage.foldername(name))[1] = 'legal-signatures'
  AND (
    public.is_super_admin()
    OR public.is_company_member(((storage.foldername(name))[2])::uuid)
  )
);

DROP POLICY IF EXISTS "Company members can update legal signatures" ON storage.objects;
CREATE POLICY "Company members can update legal signatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-media'
  AND (storage.foldername(name))[1] = 'legal-signatures'
  AND (
    public.is_super_admin()
    OR public.is_company_member(((storage.foldername(name))[2])::uuid)
  )
)
WITH CHECK (
  bucket_id = 'training-media'
  AND (storage.foldername(name))[1] = 'legal-signatures'
  AND (
    public.is_super_admin()
    OR public.is_company_member(((storage.foldername(name))[2])::uuid)
  )
);

COMMIT;
