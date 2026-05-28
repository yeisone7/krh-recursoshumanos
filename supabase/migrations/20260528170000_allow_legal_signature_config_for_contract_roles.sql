-- Allow contract/catalog/config roles to manage only legal signature config rows.
-- Fixes RLS error when saving "Firma Digital Legal" from Tipos de Contrato.

BEGIN;

DROP POLICY IF EXISTS "Roles can insert legal signature config" ON public.system_config;
CREATE POLICY "Roles can insert legal signature config"
ON public.system_config
FOR INSERT
TO authenticated
WITH CHECK (
  config_key = 'legal_signature_config'
  AND (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'contratos', 'create')
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'catalogos', 'create')
        OR public.check_user_permission(auth.uid(), 'catalogos', 'update')
        OR public.check_user_permission(auth.uid(), 'configuracion', 'create')
        OR public.check_user_permission(auth.uid(), 'configuracion', 'update')
      )
    )
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
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'catalogos', 'update')
        OR public.check_user_permission(auth.uid(), 'configuracion', 'update')
      )
    )
  )
)
WITH CHECK (
  config_key = 'legal_signature_config'
  AND (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'catalogos', 'update')
        OR public.check_user_permission(auth.uid(), 'configuracion', 'update')
      )
    )
  )
);

COMMIT;
