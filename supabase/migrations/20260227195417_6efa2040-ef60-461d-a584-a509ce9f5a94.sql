
CREATE OR REPLACE FUNCTION public.verify_employee_cedula(p_cedula text, p_company_id uuid)
RETURNS TABLE(employee_id uuid, employee_name text) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, first_name || ' ' || COALESCE(last_name, '')
  FROM public.employees_v2 
  WHERE document_number = p_cedula AND company_id = p_company_id AND is_active = true
  LIMIT 1;
$$;
