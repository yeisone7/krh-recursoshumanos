-- Table to mark super-admin users
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  )
$$;

-- RLS: only super-admins can see/manage super_admins table
DROP POLICY IF EXISTS "Super admins can view" ON public.super_admins;
CREATE POLICY "Super admins can view" ON public.super_admins
  FOR SELECT TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can insert" ON public.super_admins;
CREATE POLICY "Super admins can insert" ON public.super_admins
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete" ON public.super_admins;
CREATE POLICY "Super admins can delete" ON public.super_admins
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- Allow super-admins to see ALL companies (update existing RLS)
DROP POLICY IF EXISTS "Companies are visible to assigned users" ON public.companies;
DROP POLICY IF EXISTS "Companies visible to members or super admins" ON public.companies;
CREATE POLICY "Companies visible to members or super admins" ON public.companies
  FOR SELECT TO authenticated USING (
    public.is_company_member(id) OR public.is_super_admin()
  );

-- Allow super-admins to create companies
DROP POLICY IF EXISTS "Companies can be created by authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Companies can be created" ON public.companies;
CREATE POLICY "Companies can be created" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (
    public.is_company_member(id) OR public.is_super_admin()
  );

-- Allow super-admins to update any company  
DROP POLICY IF EXISTS "Companies can be updated by members" ON public.companies;
DROP POLICY IF EXISTS "Companies can be updated" ON public.companies;
CREATE POLICY "Companies can be updated" ON public.companies
  FOR UPDATE TO authenticated USING (
    public.is_company_member(id) OR public.is_super_admin()
  );

-- Allow super-admins to manage user_company_assignments
DROP POLICY IF EXISTS "Assignments visible to company members" ON public.user_company_assignments;
DROP POLICY IF EXISTS "Assignments visible to members or super admins" ON public.user_company_assignments;
CREATE POLICY "Assignments visible to members or super admins" ON public.user_company_assignments
  FOR SELECT TO authenticated USING (
    public.is_company_member(company_id) OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Assignments can be created by admins" ON public.user_company_assignments;
DROP POLICY IF EXISTS "Assignments can be created" ON public.user_company_assignments;
CREATE POLICY "Assignments can be created" ON public.user_company_assignments
  FOR INSERT TO authenticated WITH CHECK (
    public.is_company_member(company_id) OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Assignments can be deleted by admins" ON public.user_company_assignments;
DROP POLICY IF EXISTS "Assignments can be deleted" ON public.user_company_assignments;
CREATE POLICY "Assignments can be deleted" ON public.user_company_assignments
  FOR DELETE TO authenticated USING (
    public.is_company_member(company_id) OR public.is_super_admin()
  );