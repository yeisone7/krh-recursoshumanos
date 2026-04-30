-- Drop existing policies for contract_extensions
DROP POLICY IF EXISTS "Admin and RRHH can manage extensions" ON public.contract_extensions;
DROP POLICY IF EXISTS "Users can view accessible extensions" ON public.contract_extensions;

-- Create updated policies using has_employee_v2_access for employees_v2 schema
CREATE POLICY "Users can view accessible extensions" 
ON public.contract_extensions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.id = contract_extensions.contract_id 
    AND has_employee_v2_access(c.employee_id)
  )
);

CREATE POLICY "Admin and RRHH can manage extensions" 
ON public.contract_extensions 
FOR ALL 
USING (
  is_admin_or_rrhh() AND EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.id = contract_extensions.contract_id 
    AND has_employee_v2_access(c.employee_id)
  )
)
WITH CHECK (
  is_admin_or_rrhh() AND EXISTS (
    SELECT 1 FROM contracts c 
    WHERE c.id = contract_extensions.contract_id 
    AND has_employee_v2_access(c.employee_id)
  )
);