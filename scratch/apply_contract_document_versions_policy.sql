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
