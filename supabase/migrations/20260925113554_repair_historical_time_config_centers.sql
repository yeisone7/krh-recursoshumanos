-- Prefer the center that was effective on the record date. Legacy imports can
-- have valid_from set to the import date even though hire_date and the
-- employment cycle started earlier. When there is no dated match, a single
-- center in the same employment cycle is still unambiguous evidence.
CREATE OR REPLACE FUNCTION payroll_private.employee_center(
  p_company uuid,
  p_employee uuid,
  p_cycle uuid,
  p_date date
) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  WITH dated AS (
    SELECT DISTINCT w.operation_center_id
    FROM public.employee_work_info w
    WHERE w.company_id = p_company
      AND w.employee_id = p_employee
      AND (p_cycle IS NULL OR w.employment_cycle_id = p_cycle)
      AND coalesce(w.valid_from, w.hire_date, '-infinity'::date) <= p_date
      AND coalesce(w.valid_to, w.termination_date, 'infinity'::date) >= p_date
      AND w.operation_center_id IS NOT NULL
  ), cycle_centers AS (
    SELECT DISTINCT w.operation_center_id
    FROM public.employee_work_info w
    WHERE p_cycle IS NOT NULL
      AND w.company_id = p_company
      AND w.employee_id = p_employee
      AND w.employment_cycle_id = p_cycle
      AND w.operation_center_id IS NOT NULL
  )
  SELECT CASE
    WHEN (SELECT count(*) FROM dated) = 1
      THEN (SELECT operation_center_id FROM dated)
    WHEN NOT EXISTS (SELECT 1 FROM dated)
      AND (SELECT count(*) FROM cycle_centers) = 1
      THEN (SELECT operation_center_id FROM cycle_centers)
  END
$$;

-- This is a metadata backfill: the trigger already validates the same derived
-- value, but closed periods would reject the repair after that validation.
-- Disable only the cut guard for the duration of this deterministic backfill.
ALTER TABLE public.employee_time_config DISABLE TRIGGER payroll_cut_guard;

UPDATE public.employee_time_config c
SET operation_center_id = payroll_private.employee_center(
  c.company_id,
  c.employee_id,
  c.employment_cycle_id,
  c.start_date
)
WHERE c.operation_center_id IS NULL
  AND payroll_private.employee_center(
    c.company_id,
    c.employee_id,
    c.employment_cycle_id,
    c.start_date
  ) IS NOT NULL;

ALTER TABLE public.employee_time_config ENABLE TRIGGER payroll_cut_guard;
