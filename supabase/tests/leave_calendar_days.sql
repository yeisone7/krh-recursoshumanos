-- Run after the leave_calendar_days migration. All fixtures are rolled back.
BEGIN;
DO $test$
DECLARE
  v_company uuid := gen_random_uuid();
  v_employee uuid := gen_random_uuid();
  v_cycle uuid := gen_random_uuid();
  v_token uuid := gen_random_uuid();
  v_request public.leave_requests;
  v_case record;
  v_pending numeric;
BEGIN
  INSERT INTO public.companies (id, name, nit)
  VALUES (v_company, 'Calendar leave regression', 'test-' || v_company::text);
  INSERT INTO public.employees_v2 (
    id, company_id, document_type, document_number, first_name, last_name,
    birth_date, is_active, status
  ) VALUES (v_employee, v_company, 'CC', 'test-' || v_employee::text,
    'Calendar', 'Regression', '1992-04-15', true, 'active');
  INSERT INTO public.employee_employment_cycles (
    id, company_id, employee_id, cycle_number, status, source, start_date
  ) VALUES (v_cycle, v_company, v_employee, 1, 'active', 'manual', '2026-01-01');
  UPDATE public.leave_type_config
  SET requires_document = false, max_days_per_year = null, min_days_advance = 0,
      allows_half_day = true, allows_hours = true
  WHERE company_id = v_company AND leave_type::text = 'permiso_personal';

  INSERT INTO public.leave_balances (
    company_id, employee_id, employment_cycle_id, leave_type, year, entitled_days
  ) VALUES (v_company, v_employee, v_cycle, 'permiso_personal', 2099, 100);
  INSERT INTO public.company_holidays (company_id, holiday_date, name, is_national)
  VALUES (v_company, '2099-12-25', 'Test holiday', true);
  INSERT INTO public.leave_public_access_tokens (id, company_id, token_hash)
  VALUES (v_token, v_company, convert_to(v_token::text, 'UTF8'));

  -- 2099-10-25 is a Sunday, just like the reported 2026-10-25.
  FOR v_case IN SELECT * FROM (VALUES
    ('2099-10-22', '2099-10-26', 'dias_completos', null::text, null::text, 5::numeric, 'internal'),
    ('2099-11-01', '2099-11-01', 'dias_completos', null, null, 1, 'employee_portal'),
    ('2099-12-25', '2099-12-25', 'dias_completos', null, null, 1, 'public_link'),
    ('2099-11-02', '2099-11-02', 'medio_dia', null, null, 0.5, 'internal'),
    ('2099-11-03', '2099-11-03', 'horas', '08:00', '12:00', 0.5, 'internal')
  ) AS cases(start_date, end_date, duration_type, start_time, end_time, expected_days, source)
  LOOP
    v_request := private.create_leave_request_core(v_company, v_employee,
      jsonb_build_object('leave_type', 'permiso_personal',
        'duration_type', v_case.duration_type, 'start_date', v_case.start_date,
        'end_date', v_case.end_date, 'start_time', v_case.start_time,
        'end_time', v_case.end_time, 'reason', 'Calendar duration regression test'),
      null, v_case.source, CASE WHEN v_case.source = 'public_link' THEN v_token ELSE null END);
    IF v_request.total_days <> v_case.expected_days THEN
      RAISE EXCEPTION 'Expected % days, got % for %',
        v_case.expected_days, v_request.total_days, v_case.start_date;
    END IF;
    IF v_case.duration_type = 'horas' AND v_request.total_hours <> 4 THEN
      RAISE EXCEPTION 'Hourly leave duration changed';
    END IF;
  END LOOP;

  SELECT pending_days INTO v_pending FROM public.leave_balances
  WHERE employee_id = v_employee AND year = 2099;
  IF v_pending <> 8 THEN
    RAISE EXCEPTION 'Expected 8 pending days, got %', v_pending;
  END IF;

  BEGIN
    PERFORM private.create_leave_request_core(v_company, v_employee,
      '{"leave_type":"permiso_personal","start_date":"2099-10-26","end_date":"2099-10-22","reason":"Invalid date range test"}',
      null, 'internal');
    RAISE EXCEPTION 'Reversed dates must be rejected';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  UPDATE public.leave_type_config SET max_days_per_year = 8
  WHERE company_id = v_company AND leave_type::text = 'permiso_personal';
  BEGIN
    PERFORM private.create_leave_request_core(v_company, v_employee,
      '{"leave_type":"permiso_personal","start_date":"2099-12-26","end_date":"2099-12-26","reason":"Annual limit regression test"}',
      null, 'internal');
    RAISE EXCEPTION 'Annual limit must include all calendar days';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
END;
$test$;
SELECT 'Calendar leave regression checks passed' AS result;
ROLLBACK;
