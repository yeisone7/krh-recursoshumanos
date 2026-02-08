-- Function to delete shift assignments for an absence period
-- Excludes rest days (is_rest_day = true)
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
  -- Delete work shift assignments (not rest days) in the given date range
  DELETE FROM employee_shift_assignments esa
  WHERE esa.employee_id = p_employee_id
    AND esa.assignment_date BETWEEN p_start_date AND p_end_date
    AND EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = esa.shift_id
        AND s.is_rest_day = false
    );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;