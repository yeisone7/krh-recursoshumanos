BEGIN;
-- A revoked center assignment must not make an attached image look orphaned
-- through RLS. Check ownership and references with a narrowly scoped helper.
CREATE FUNCTION public.can_delete_own_unattached_dotation_signature(p_path text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='dotation-signatures'
    AND name=p_path AND owner_id=auth.uid()::text)
    AND NOT EXISTS (SELECT 1 FROM public.dotation_delivery_transactions WHERE signature_path=p_path);
END $$;
REVOKE ALL ON FUNCTION public.can_delete_own_unattached_dotation_signature(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_delete_own_unattached_dotation_signature(text) TO authenticated;
DROP POLICY "Clean unattached local dotation signatures" ON storage.objects;
CREATE POLICY "Clean unattached local dotation signatures" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='dotation-signatures' AND public.can_delete_own_unattached_dotation_signature(name)
);
COMMIT;
