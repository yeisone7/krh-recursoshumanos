-- Allow selection users to read candidate document storage objects.
--
-- Storage uploads can perform INSERT ... RETURNING / follow-up reads. Without a
-- SELECT policy for the uploaded object, non-admin selection users can pass the
-- INSERT policy but still receive an RLS error from the storage API.

DROP POLICY IF EXISTS "Selection permissions can view candidate storage documents" ON storage.objects;
CREATE POLICY "Selection permissions can view candidate storage documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'candidates'
  AND public.can_manage_candidate_document(
    (storage.foldername(name))[3],
    (storage.foldername(name))[1],
    'view'
  )
);
