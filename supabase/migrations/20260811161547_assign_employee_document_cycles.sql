-- Keep employee documents visible in the employment cycle shown by the UI.

BEGIN;

CREATE OR REPLACE FUNCTION public.assign_employee_document_employment_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  document_date date := COALESCE(NEW.upload_date, NEW.created_at::date, current_date);
  matching_cycle_id uuid;
  matching_cycle_count integer;
BEGIN
  IF NEW.employment_cycle_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    count(*),
    (array_agg(cycle.id ORDER BY cycle.start_date DESC))[1]
  INTO matching_cycle_count, matching_cycle_id
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = NEW.employee_id
    AND cycle.company_id = NEW.company_id
    AND cycle.start_date <= document_date
    AND (cycle.end_date IS NULL OR cycle.end_date >= document_date);

  IF matching_cycle_count = 1 THEN
    NEW.employment_cycle_id := matching_cycle_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_employee_document_employment_cycle
ON public.employee_documents;

CREATE TRIGGER assign_employee_document_employment_cycle
BEFORE INSERT OR UPDATE OF employee_id, company_id, upload_date, employment_cycle_id
ON public.employee_documents
FOR EACH ROW
EXECUTE FUNCTION public.assign_employee_document_employment_cycle();

-- Repair only rows that map to exactly one temporal cycle. Ambiguous legacy
-- documents remain untouched rather than being assigned to the wrong rehire.
WITH matches AS (
  SELECT
    document.id AS document_id,
    (array_agg(cycle.id ORDER BY cycle.start_date DESC))[1] AS cycle_id
  FROM public.employee_documents document
  JOIN public.employee_employment_cycles cycle
    ON cycle.employee_id = document.employee_id
   AND cycle.company_id = document.company_id
   AND cycle.start_date <= COALESCE(document.upload_date, document.created_at::date)
   AND (
     cycle.end_date IS NULL
     OR cycle.end_date >= COALESCE(document.upload_date, document.created_at::date)
   )
  WHERE document.employment_cycle_id IS NULL
  GROUP BY document.id
  HAVING count(*) = 1
)
UPDATE public.employee_documents document
SET employment_cycle_id = matches.cycle_id
FROM matches
WHERE document.id = matches.document_id;

COMMIT;
