DROP POLICY IF EXISTS "Roles can insert legal signature config" ON public.system_config;
CREATE POLICY "Roles can insert legal signature config"
ON public.system_config
FOR INSERT
TO authenticated
WITH CHECK (
  config_key = 'legal_signature_config'
  AND (
    public.is_super_admin()
    OR public.is_company_member(company_id)
  )
);

DROP POLICY IF EXISTS "Roles can update legal signature config" ON public.system_config;
CREATE POLICY "Roles can update legal signature config"
ON public.system_config
FOR UPDATE
TO authenticated
USING (
  config_key = 'legal_signature_config'
  AND (
    public.is_super_admin()
    OR public.is_company_member(company_id)
  )
)
WITH CHECK (
  config_key = 'legal_signature_config'
  AND (
    public.is_super_admin()
    OR public.is_company_member(company_id)
  )
);
