-- Update contracts RLS policies to use has_employee_v2_access instead of has_employee_access

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and RRHH can manage contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view accessible contracts" ON public.contracts;

-- Create updated policies using has_employee_v2_access
CREATE POLICY "Admin and RRHH can manage contracts"
ON public.contracts
FOR ALL
TO authenticated
USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible contracts"
ON public.contracts
FOR SELECT
TO authenticated
USING (has_employee_v2_access(employee_id));