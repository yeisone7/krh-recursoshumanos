-- Update function to delete ALL shift assignments (including rest days) for an absence period
CREATE OR REPLACE FUNCTION public.delete_shift_assignments_for_absence(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete ALL shift assignments (including rest days) in the given date range
  DELETE FROM employee_shift_assignments esa
  WHERE esa.employee_id = p_employee_id
    AND esa.assignment_date BETWEEN p_start_date AND p_end_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;