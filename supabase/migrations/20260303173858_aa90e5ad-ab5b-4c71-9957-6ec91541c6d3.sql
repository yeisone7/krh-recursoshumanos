
-- Fix RLS policies on dotation_deliveries to use employees_v2
DROP POLICY IF EXISTS "Admin and RRHH can manage dotation" ON public.dotation_deliveries;
DROP POLICY IF EXISTS "Users can view accessible dotation" ON public.dotation_deliveries;

CREATE POLICY "Admin and RRHH can manage dotation"
ON public.dotation_deliveries
FOR ALL
TO authenticated
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible dotation"
ON public.dotation_deliveries
FOR SELECT
TO authenticated
USING (has_employee_v2_access(employee_id));
