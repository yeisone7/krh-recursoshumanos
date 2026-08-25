-- employee_work_info is the source of truth for an employee's primary center.
-- employee_operation_center_assignments also stores additional centers, but
-- older/manual imports did not always create or cycle-scope the duplicated
-- primary-center row. Keep both sources valid for authorization and repair the
-- compatibility rows used by older frontend builds.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.ensure_active_cycle_for_current_work_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  active_cycle_id uuid;
BEGIN
  IF NOT NEW.is_current THEN
    RETURN NEW;
  END IF;

  IF NEW.employment_cycle_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.employee_employment_cycles cycle
    WHERE cycle.id = NEW.employment_cycle_id
      AND cycle.employee_id = NEW.employee_id
      AND cycle.company_id = NEW.company_id
      AND cycle.status = 'active'
  ) THEN
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
  INTO active_cycle_id
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = NEW.employee_id
    AND cycle.company_id = NEW.company_id
    AND cycle.status = 'active'
  ORDER BY cycle.cycle_number DESC
  LIMIT 1;

  IF active_cycle_id IS NULL THEN
    INSERT INTO public.employee_employment_cycles (
      company_id,
      employee_id,
      cycle_number,
      status,
      source,
      start_date,
      created_by
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
      COALESCE(NEW.hire_date, CURRENT_DATE),
      NEW.created_by
    )
    RETURNING id INTO active_cycle_id;
  END IF;

  UPDATE public.employee_work_info
  SET employment_cycle_id = active_cycle_id
  WHERE id = NEW.id
    AND employment_cycle_id IS DISTINCT FROM active_cycle_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.ensure_active_cycle_for_current_work_info() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ensure_active_cycle_for_current_work_info ON public.employee_work_info;
CREATE TRIGGER ensure_active_cycle_for_current_work_info
AFTER INSERT OR UPDATE OF is_current, employment_cycle_id, hire_date
ON public.employee_work_info
FOR EACH ROW
EXECUTE FUNCTION private.ensure_active_cycle_for_current_work_info();

-- A previous local-only migration used a public SECURITY DEFINER function.
-- Remove it when present after the trigger has been replaced by the private one.
DROP FUNCTION IF EXISTS public.ensure_active_cycle_for_current_work_info();

-- Fire the recovery trigger for current work-info rows that lack an active
-- cycle or point at a historical one. The nested update is idempotent.
UPDATE public.employee_work_info work_info
SET is_current = work_info.is_current
WHERE work_info.is_current
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_employment_cycles cycle
    WHERE cycle.id = work_info.employment_cycle_id
      AND cycle.employee_id = work_info.employee_id
      AND cycle.company_id = work_info.company_id
      AND cycle.status = 'active'
  );

-- Reattach legacy primary-center assignments that exist without a cycle.
UPDATE public.employee_operation_center_assignments assignment
SET employment_cycle_id = work_info.employment_cycle_id,
    updated_at = now()
FROM public.employee_work_info work_info
JOIN public.employee_employment_cycles cycle
  ON cycle.id = work_info.employment_cycle_id
 AND cycle.status = 'active'
WHERE assignment.employee_id = work_info.employee_id
  AND assignment.company_id = work_info.company_id
  AND assignment.operation_center_id = work_info.operation_center_id
  AND assignment.employment_cycle_id IS NULL
  AND work_info.is_current
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_operation_center_assignments existing
    WHERE existing.employment_cycle_id = work_info.employment_cycle_id
      AND existing.operation_center_id = work_info.operation_center_id
  );

-- Backfill the current primary center for compatibility with frontend builds
-- that still read only employee_operation_center_assignments.
INSERT INTO public.employee_operation_center_assignments (
  employee_id,
  company_id,
  operation_center_id,
  employment_cycle_id,
  created_by
)
SELECT
  work_info.employee_id,
  work_info.company_id,
  work_info.operation_center_id,
  work_info.employment_cycle_id,
  work_info.created_by
FROM public.employee_work_info work_info
JOIN public.employee_employment_cycles cycle
  ON cycle.id = work_info.employment_cycle_id
 AND cycle.status = 'active'
WHERE work_info.is_current
  AND work_info.operation_center_id IS NOT NULL
ON CONFLICT (employment_cycle_id, operation_center_id)
WHERE employment_cycle_id IS NOT NULL
DO NOTHING;

-- Primary-center access comes from current work info. Additional-center access
-- continues to come from the assignment table. Both must belong to the active
-- employment cycle so historical centers never grant access.
CREATE OR REPLACE FUNCTION public.has_employee_v2_access(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees_v2 employee
    WHERE employee.id = _employee_id
      AND (
        public.is_super_admin()
        OR public.is_admin()
        OR (
          public.is_company_member(employee.company_id)
          AND (
            NOT public.has_company_center_assignments((SELECT auth.uid()), employee.company_id)
            OR EXISTS (
              SELECT 1
              FROM public.employee_work_info work_info
              JOIN public.employee_employment_cycles cycle
                ON cycle.id = work_info.employment_cycle_id
               AND cycle.status = 'active'
              JOIN public.user_center_assignments user_assignment
                ON user_assignment.operation_center_id = work_info.operation_center_id
              WHERE work_info.employee_id = employee.id
                AND work_info.company_id = employee.company_id
                AND work_info.is_current
                AND user_assignment.user_id = (SELECT auth.uid())
            )
            OR EXISTS (
              SELECT 1
              FROM public.employee_operation_center_assignments assignment
              JOIN public.employee_employment_cycles cycle
                ON cycle.id = assignment.employment_cycle_id
               AND cycle.status = 'active'
              JOIN public.user_center_assignments user_assignment
                ON user_assignment.operation_center_id = assignment.operation_center_id
              WHERE assignment.employee_id = employee.id
                AND assignment.company_id = employee.company_id
                AND user_assignment.user_id = (SELECT auth.uid())
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_employee_v2_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_employee_v2_access(uuid) TO authenticated;
