-- Allow users with selection permissions to manage candidate document metadata.

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
      AND public.is_company_member(c.company_id)
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
      AND public.is_company_member(c.company_id)
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
      AND public.is_company_member(c.company_id)
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.is_psicologo()
    OR public.check_user_permission(auth.uid(), 'seleccion', 'delete')
    OR public.check_user_permission(auth.uid(), 'seleccion', 'update')
  )
);
