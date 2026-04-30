-- Drop and recreate the areas management policy
DROP POLICY IF EXISTS "Admin and RRHH can manage areas" ON public.areas;

CREATE POLICY "Admin and RRHH can manage areas" ON public.areas
FOR ALL TO authenticated
USING (
  is_super_admin()
  OR (
    is_company_member(company_id) AND (
      is_admin_or_rrhh()
      OR EXISTS (
        SELECT 1 FROM public.user_custom_roles ucr
        JOIN public.custom_roles cr ON ucr.role_id = cr.id
        WHERE ucr.user_id = auth.uid() AND cr.is_active = true AND cr.is_system = true
      )
    )
  )
)
WITH CHECK (
  is_super_admin()
  OR (
    is_company_member(company_id) AND (
      is_admin_or_rrhh()
      OR EXISTS (
        SELECT 1 FROM public.user_custom_roles ucr
        JOIN public.custom_roles cr ON ucr.role_id = cr.id
        WHERE ucr.user_id = auth.uid() AND cr.is_active = true AND cr.is_system = true
      )
    )
  )
);

-- Also update the SELECT policy to allow super admins
DROP POLICY IF EXISTS "Users can view company areas" ON public.areas;

CREATE POLICY "Users can view company areas" ON public.areas
FOR SELECT TO authenticated
USING (
  is_super_admin()
  OR is_company_member(company_id)
  OR is_admin()
);