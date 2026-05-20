-- Allow admins and super admins to update any user profile
DROP POLICY IF EXISTS "Admins and super admins can update any profile" ON public.user_profiles;

CREATE POLICY "Admins and super admins can update any profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin() OR public.is_admin())
  WITH CHECK (public.is_super_admin() OR public.is_admin());
