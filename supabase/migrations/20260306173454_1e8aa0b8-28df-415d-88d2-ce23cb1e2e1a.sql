-- Fix medical_exams RLS policies to use has_employee_v2_access instead of has_employee_access
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage exams" ON public.medical_exams;
DROP POLICY IF EXISTS "Users can view accessible exams" ON public.medical_exams;

CREATE POLICY "Admin RRHH and Psicologo can manage exams"
ON public.medical_exams
FOR ALL
TO authenticated
USING ((is_admin_or_rrhh() OR is_psicologo()) AND has_employee_v2_access(employee_id))
WITH CHECK ((is_admin_or_rrhh() OR is_psicologo()) AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible exams"
ON public.medical_exams
FOR SELECT
TO authenticated
USING (has_employee_v2_access(employee_id));