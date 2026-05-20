-- Migration: Fix RLS for professions and education_levels tables
-- Allows any authenticated company member to manage their company's professions and education levels

-- =============================================
-- 1. POLÍTICAS PARA LA TABLA professions
-- =============================================

-- Eliminar políticas restrictivas que limitaban la edición a Admin/RRHH
DROP POLICY IF EXISTS "Admin/RRHH can insert professions" ON public.professions;
DROP POLICY IF EXISTS "Admin/RRHH can update professions" ON public.professions;
DROP POLICY IF EXISTS "Admin/RRHH can delete professions" ON public.professions;
DROP POLICY IF EXISTS "Users can insert professions of their company" ON public.professions;
DROP POLICY IF EXISTS "Users can update professions of their company" ON public.professions;
DROP POLICY IF EXISTS "Users can delete professions of their company" ON public.professions;

-- Crear nuevas políticas para permitir a cualquier miembro autenticado de la empresa realizar CRUD
CREATE POLICY "Company members can insert professions" 
ON public.professions FOR INSERT 
TO authenticated 
WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Company members can update professions" 
ON public.professions FOR UPDATE 
TO authenticated 
USING (public.is_company_member(company_id))
WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Company members can delete professions" 
ON public.professions FOR DELETE 
TO authenticated 
USING (public.is_company_member(company_id));


-- =============================================
-- 2. POLÍTICAS PARA LA TABLA education_levels
-- =============================================

-- Eliminar políticas restrictivas que limitaban la edición a Admin/RRHH
DROP POLICY IF EXISTS "Admin/RRHH can insert education levels" ON public.education_levels;
DROP POLICY IF EXISTS "Admin/RRHH can update education levels" ON public.education_levels;
DROP POLICY IF EXISTS "Admin/RRHH can delete education levels" ON public.education_levels;
DROP POLICY IF EXISTS "Users can insert education levels of their company" ON public.education_levels;
DROP POLICY IF EXISTS "Users can update education levels of their company" ON public.education_levels;
DROP POLICY IF EXISTS "Users can delete education levels of their company" ON public.education_levels;

-- Crear nuevas políticas para permitir a cualquier miembro autenticado de la empresa realizar CRUD
CREATE POLICY "Company members can insert education levels" 
ON public.education_levels FOR INSERT 
TO authenticated 
WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Company members can update education levels" 
ON public.education_levels FOR UPDATE 
TO authenticated 
USING (public.is_company_member(company_id))
WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Company members can delete education levels" 
ON public.education_levels FOR DELETE 
TO authenticated 
USING (public.is_company_member(company_id));
