-- Integration checks against a linked database. All fixtures and changes roll back.
BEGIN;
SELECT set_config('request.jwt.claim.sub', (SELECT user_id::text FROM public.super_admins LIMIT 1), true);
SELECT set_config('test.period_company', (SELECT id::text FROM public.companies WHERE name = 'Petrocasinos S.A.' LIMIT 1), true);
INSERT INTO public.training_courses(id, company_id, name, category, status, is_active)
VALUES ('d98b22a0-30b3-46a2-9c21-0c4d81a6a001', current_setting('test.period_company')::uuid,
        'TEST atomic training periods (rolled back)', 'HSEQ', 'borrador', true);

CREATE FUNCTION pg_temp.reject_test_period_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('test.reject_period_insert', true) = 'on' THEN
    RAISE EXCEPTION 'Simulated insert failure' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER test_atomic_period_insert BEFORE INSERT ON public.training_course_periods
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_period_insert();

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  company uuid := current_setting('test.period_company')::uuid;
  course uuid := 'd98b22a0-30b3-46a2-9c21-0c4d81a6a001';
  rows_saved integer;
BEGIN
  SELECT count(*) INTO rows_saved FROM public.save_training_course_periods(company, course,
    '[{"year":2026,"month":11},{"year":2026,"month":11}]');
  IF rows_saved <> 1 THEN RAISE EXCEPTION 'Create/dedup failed'; END IF;
  SELECT count(*) INTO rows_saved FROM public.save_training_course_periods(company, course,
    '[{"year":2026,"month":10},{"year":2026,"month":12}]');
  IF rows_saved <> 2 OR EXISTS (SELECT 1 FROM public.training_course_periods WHERE course_id = course AND month = 11)
  THEN RAISE EXCEPTION 'Replace failed'; END IF;

  PERFORM set_config('test.reject_period_insert', 'on', true);
  BEGIN
    PERFORM public.save_training_course_periods(company, course, '[{"year":2026,"month":11}]');
    RAISE EXCEPTION 'Expected insert failure';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  PERFORM set_config('test.reject_period_insert', 'off', true);
  IF (SELECT count(*) FROM public.training_course_periods WHERE course_id = course AND month IN (10,12)) <> 2
  THEN RAISE EXCEPTION 'Existing periods lost after insert failure'; END IF;

  BEGIN
    PERFORM public.save_training_course_periods(company, course, '[{"year":2026,"month":13}]');
    RAISE EXCEPTION 'Invalid month accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.save_training_course_periods(company, course, '[{"month":11}]');
    RAISE EXCEPTION 'Missing year accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.save_training_course_periods('00000000-0000-0000-0000-000000000000', course, '[]');
    RAISE EXCEPTION 'Company mismatch accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT count(*) INTO rows_saved FROM public.save_training_course_periods(company, course, '[]');
  IF rows_saved <> 0 OR EXISTS (SELECT 1 FROM public.training_course_periods WHERE course_id = course)
  THEN RAISE EXCEPTION 'Explicit removal failed'; END IF;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  BEGIN
    PERFORM public.save_training_course_periods(company, course, '[{"year":2026,"month":11}]');
    RAISE EXCEPTION 'Unauthorized user accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  BEGIN
    PERFORM public.save_training_course_periods(company, course, '[]');
    RAISE EXCEPTION 'Unauthenticated request accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF has_function_privilege('anon', 'public.save_training_course_periods(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous execution granted';
  END IF;
END;
$$;
ROLLBACK;
SELECT 'Atomic period checks passed; all test changes rolled back' AS result;
