CREATE SEQUENCE IF NOT EXISTS public.personnel_requisition_code_seq;

ALTER TABLE public.personnel_requisitions
  ADD COLUMN IF NOT EXISTS requisition_code TEXT;

WITH current_max AS (
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(requisition_code, '^RQ-', ''), '')::integer),
    0
  ) AS value
  FROM public.personnel_requisitions
  WHERE requisition_code ~ '^RQ-[0-9]+$'
),
missing_codes AS (
  SELECT
    pr.id,
    current_max.value + ROW_NUMBER() OVER (ORDER BY pr.created_at, pr.id) AS next_number
  FROM public.personnel_requisitions pr
  CROSS JOIN current_max
  WHERE pr.requisition_code IS NULL
     OR btrim(pr.requisition_code) = ''
)
UPDATE public.personnel_requisitions pr
SET requisition_code = 'RQ-' || LPAD(missing_codes.next_number::text, 5, '0')
FROM missing_codes
WHERE pr.id = missing_codes.id;

SELECT setval(
  'public.personnel_requisition_code_seq',
  GREATEST(
    COALESCE((
      SELECT MAX(NULLIF(regexp_replace(requisition_code, '^RQ-', ''), '')::integer)
      FROM public.personnel_requisitions
      WHERE requisition_code ~ '^RQ-[0-9]+$'
    ), 0),
    1
  ),
  COALESCE((
    SELECT MAX(NULLIF(regexp_replace(requisition_code, '^RQ-', ''), '')::integer)
    FROM public.personnel_requisitions
    WHERE requisition_code ~ '^RQ-[0-9]+$'
  ), 0) > 0
);

ALTER TABLE public.personnel_requisitions
  ALTER COLUMN requisition_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_personnel_requisitions_requisition_code
  ON public.personnel_requisitions (requisition_code);

CREATE OR REPLACE FUNCTION public.assign_personnel_requisition_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.requisition_code IS NULL OR btrim(NEW.requisition_code) = '' THEN
    NEW.requisition_code := 'RQ-' || LPAD(nextval('public.personnel_requisition_code_seq')::text, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_personnel_requisition_code ON public.personnel_requisitions;

CREATE TRIGGER set_personnel_requisition_code
  BEFORE INSERT ON public.personnel_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_personnel_requisition_code();
