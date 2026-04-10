-- Drop existing ALL policy
DROP POLICY IF EXISTS "Admin and RRHH can manage areas" ON public.areas;

-- Create updated policy that also checks super_admin and custom system roles
CREATE POLICY "Admin and RRHH can manage areas" ON public.areas
FOR ALL TO authenticated
USING (
  is_company_member(company_id) AND (
    is_admin_or_rrhh()
    OR is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_custom_roles ucr
      JOIN public.custom_roles cr ON ucr.role_id = cr.id
      WHERE ucr.user_id = auth.uid() AND cr.is_active = true AND cr.is_system = true
    )
  )
)
WITH CHECK (
  is_company_member(company_id) AND (
    is_admin_or_rrhh()
    OR is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_custom_roles ucr
      JOIN public.custom_roles cr ON ucr.role_id = cr.id
      WHERE ucr.user_id = auth.uid() AND cr.is_active = true AND cr.is_system = true
    )
  )
);