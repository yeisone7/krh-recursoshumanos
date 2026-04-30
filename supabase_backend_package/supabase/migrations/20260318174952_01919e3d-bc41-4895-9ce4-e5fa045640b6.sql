CREATE POLICY "Company members can delete registration tokens"
ON public.self_registration_tokens
FOR DELETE
TO authenticated
USING (public.is_company_member(company_id));