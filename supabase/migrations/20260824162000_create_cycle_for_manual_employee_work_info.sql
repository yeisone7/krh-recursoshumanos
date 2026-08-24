-- Protect manual and import-based employee creation flows.  The application
-- creates a cycle itself, but records inserted outside that flow can otherwise
-- be left unable to receive a contract.
CREATE OR REPLACE FUNCTION public.ensure_active_cycle_for_current_work_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_cycle_id uuid;
BEGIN
  -- A work-information record from the normal flow is already scoped. Only
  -- recover currently-employed active people that arrive without that scope.
  IF NOT NEW.is_current OR NEW.employment_cycle_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.employees_v2 employee
    WHERE employee.id = NEW.employee_id
      AND employee.company_id = NEW.company_id
      AND employee.is_active
      AND employee.status = 'active'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT cycle.id
  INTO new_cycle_id
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = NEW.employee_id
    AND cycle.company_id = NEW.company_id
    AND cycle.status = 'active'
  LIMIT 1;

  IF new_cycle_id IS NULL THEN
    INSERT INTO public.employee_employment_cycles (
      company_id,
      employee_id,
      cycle_number,
      status,
      source,
      start_date
    )
    VALUES (
      NEW.company_id,
      NEW.employee_id,
      COALESCE((
        SELECT max(cycle.cycle_number)
        FROM public.employee_employment_cycles cycle
        WHERE cycle.employee_id = NEW.employee_id
      ), 0) + 1,
      'active',
      'manual',
      NEW.hire_date
    )
    RETURNING id INTO new_cycle_id;
  END IF;

  UPDATE public.employee_work_info
  SET employment_cycle_id = new_cycle_id
  WHERE id = NEW.id
    AND employment_cycle_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_active_cycle_for_current_work_info ON public.employee_work_info;
CREATE TRIGGER ensure_active_cycle_for_current_work_info
AFTER INSERT OR UPDATE OF is_current, employment_cycle_id, hire_date
ON public.employee_work_info
FOR EACH ROW
EXECUTE FUNCTION public.ensure_active_cycle_for_current_work_info();
