BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT no_plan();

INSERT INTO public.companies(id, name, nit)
VALUES ('a9300000-0000-0000-0000-000000000001', 'Prueba fechas de familiares', '991100223');

INSERT INTO auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
VALUES ('a9300000-0000-0000-0000-000000000010', 'family-dates-test@example.com', 'authenticated', 'authenticated', '{}', '{}');
INSERT INTO public.super_admins (user_id) VALUES ('a9300000-0000-0000-0000-000000000010');
INSERT INTO public.user_company_assignments (user_id, company_id)
VALUES ('a9300000-0000-0000-0000-000000000010', 'a9300000-0000-0000-0000-000000000001');

INSERT INTO public.operation_centers(id, company_id, name)
VALUES ('a9300000-0000-0000-0000-000000000002', 'a9300000-0000-0000-0000-000000000001', 'Centro de prueba');

INSERT INTO public.vacancies(id, company_id, operation_center_id, position_title, status)
VALUES ('a9300000-0000-0000-0000-000000000003', 'a9300000-0000-0000-0000-000000000001',
  'a9300000-0000-0000-0000-000000000002', 'Vacante de prueba', 'open');

INSERT INTO public.self_registration_tokens (token, target_type, company_id, vacancy_id, enabled_fields, expires_at, is_reusable)
SELECT token, target_type, 'a9300000-0000-0000-0000-000000000001',
  CASE WHEN target_type = 'candidate' THEN 'a9300000-0000-0000-0000-000000000003'::uuid END,
  enabled_fields::jsonb, now() + interval '1 day', is_reusable
FROM (VALUES
  ('test-family-new', 'employee', '["familyMembers"]', false),
  ('test-family-update', 'employee', '["familyMembers"]', true),
  ('test-family-disabled', 'employee', '[]', true),
  ('test-family-candidate', 'candidate', '["familyMembers"]', true),
  ('test-family-rehire', 'candidate', '["familyMembers"]', true)
) AS tokens(token, target_type, enabled_fields, is_reusable);

CREATE FUNCTION pg_temp.new_employee(p_members jsonb) RETURNS json LANGUAGE sql AS $$
  SELECT public.submit_employee_registration_with_family(
    p_token => 'test-family-new', p_first_name => 'Ana', p_last_name => 'Prueba',
    p_document_number => '593001', p_family_members => p_members
  );
$$;
CREATE FUNCTION pg_temp.update_employee(p_token text, p_members jsonb, p_doc text DEFAULT '593001')
RETURNS json LANGUAGE sql AS $$
  SELECT public.update_employee_from_registration(
    p_token => p_token, p_employee_id => (current_setting('test.family_employee_id'))::uuid,
    p_first_name => 'Ana', p_last_name => 'Prueba',
    p_document_number => p_doc, p_family_members => p_members
  );
$$;

SET LOCAL ROLE anon;
SELECT throws_like($$SELECT pg_temp.new_employee('[{"full_name":"Persona","relationship":"Hija","birth_date":"2025-02-29"}]')$$,
  '%date/time field value out of range%', 'a non-existent date rejects the entire public registration');
RESET ROLE;
SELECT is((SELECT is_used FROM public.self_registration_tokens WHERE token = 'test-family-new'), false, 'invalid date leaves the link available');
SELECT is((SELECT count(*) FROM public.employees_v2 WHERE document_number = '593001'), 0::bigint, 'invalid registration leaves no employee');

SET LOCAL ROLE anon;
SELECT is(pg_temp.new_employee('[{"full_name":"Persona","relationship":"Hija","birth_date":"2024-02-29"}]')->>'success',
  'true', 'a single-use link saves a family member during registration');
SELECT is(public.get_employee_by_token_and_document('test-family-update', '593001')->'family_members'->0->>'birth_date',
  '2024-02-29', 'an enabled existing link prefills the saved date');
SELECT is(public.get_employee_by_token_and_document('test-family-disabled', '593001')->>'family_members',
  NULL::text, 'the family section must be enabled to prefill data');
RESET ROLE;

SELECT is((SELECT is_used FROM public.self_registration_tokens WHERE token = 'test-family-new'), true, 'successful registration consumes the link');
SELECT set_config('test.family_employee_id',
  (SELECT id::text FROM public.employees_v2 WHERE document_number = '593001'), true);
SELECT is((SELECT birth_date FROM public.employee_family_members WHERE employee_id = current_setting('test.family_employee_id')::uuid),
  DATE '2024-02-29', 'Postgres persists the calendar date');

INSERT INTO public.employee_employment_cycles (
  id, company_id, employee_id, cycle_number, status, source, start_date, end_date
) VALUES
  ('a9300000-0000-0000-0000-000000000004', 'a9300000-0000-0000-0000-000000000001',
   current_setting('test.family_employee_id')::uuid, 1, 'terminated', 'backfill', DATE '2022-01-01', DATE '2023-12-31'),
  ('a9300000-0000-0000-0000-000000000005', 'a9300000-0000-0000-0000-000000000001',
   current_setting('test.family_employee_id')::uuid, 2, 'active', 'backfill', DATE '2024-01-01', NULL);

UPDATE public.employee_family_members SET employment_cycle_id = 'a9300000-0000-0000-0000-000000000005'
WHERE employee_id = current_setting('test.family_employee_id')::uuid;
INSERT INTO public.employee_family_members(id, company_id, employee_id, employment_cycle_id, relationship, full_name, age)
VALUES
  ('a9300000-0000-0000-0000-000000000006', 'a9300000-0000-0000-0000-000000000001',
   current_setting('test.family_employee_id')::uuid, 'a9300000-0000-0000-0000-000000000005', 'Hijo', 'Edad original', 0),
  ('a9300000-0000-0000-0000-000000000007', 'a9300000-0000-0000-0000-000000000001',
   current_setting('test.family_employee_id')::uuid, 'a9300000-0000-0000-0000-000000000004', 'Hija', 'Histórica', 3);

SET LOCAL ROLE anon;
SELECT is(json_array_length((public.get_employee_by_token_and_document('test-family-update', '593001')->'family_members')), 2,
  'prefill excludes relatives from a past employment cycle');
SELECT is(pg_temp.update_employee('test-family-update', '[]')->>'success', 'true', 'an older client can omit family');
SELECT throws_like($$SELECT pg_temp.update_employee('test-family-update', '{"members":[]}', '593099')$$,
  '%documento no corresponde%', 'a different document cannot change the family');
SELECT throws_like($$SELECT pg_temp.update_employee('test-family-update', '{"members":[
  {"id":"a9300000-0000-0000-0000-000000000006","full_name":"Intento de cambio","relationship":"Hijo"},
  {"full_name":"Fecha futura","relationship":"Hija","birth_date":"2999-01-01"}
]}')$$, '%employee_family_member_birth_date_valid%', 'a future birth date rejects the complete family edit');
SELECT is(pg_temp.update_employee('test-family-disabled', '{"members":[]}')->>'success', 'true', 'a disabled section ignores the family list');
RESET ROLE;
SELECT is((SELECT full_name FROM public.employee_family_members WHERE id = 'a9300000-0000-0000-0000-000000000006'),
  'Edad original', 'a rejected edit rolls back earlier changes to the list');

SET LOCAL ROLE anon;
SELECT is(pg_temp.update_employee('test-family-update', '{"members":[
  {"id":"a9300000-0000-0000-0000-000000000006","full_name":"Edad corregida","relationship":"Hijo","birth_date":null}
]}')->>'success', 'true', 'a legacy family member can be edited with no birth date');
RESET ROLE;
SELECT is((SELECT age FROM public.employee_family_members WHERE id = 'a9300000-0000-0000-0000-000000000006'),
  0, 'legacy age zero remains unchanged');

SELECT set_config('request.jwt.claims', '{"sub":"a9300000-0000-0000-0000-000000000010","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.replace_employee_family_members(current_setting('test.family_employee_id')::uuid, '[
  {"id":"a9300000-0000-0000-0000-000000000006","full_name":"Edición interna","relationship":"Hijo","birth_date":"2020-02-29"}
]')$$, 'the employee form can save a birth date on an existing relative');
SELECT is((SELECT birth_date FROM public.employee_family_members WHERE id = 'a9300000-0000-0000-0000-000000000006'),
  DATE '2020-02-29', 'the employee form can reload the saved date');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{}', true);

SET LOCAL ROLE anon;
SELECT is(pg_temp.update_employee('test-family-update', '{"members":[]}')->>'success', 'true', 'a new client can explicitly empty the current list');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.employee_family_members WHERE employee_id = current_setting('test.family_employee_id')::uuid),
  1::bigint, 'only the historical relative remains');

CREATE FUNCTION pg_temp.submit_candidate(p_members jsonb) RETURNS json LANGUAGE sql AS $$
  SELECT public.submit_candidate_registration(
    p_token => 'test-family-candidate', p_first_name => 'Sofía', p_last_name => 'Prueba',
    p_document_number => '593002', p_family_members => p_members
  );
$$;

SET LOCAL ROLE anon;
SELECT is(pg_temp.submit_candidate('[{"full_name":"Familiar selección","relationship":"Hija","birth_date":"2020-11-11"}]')->>'success',
  'true', 'a candidate link saves a family birth date');
SELECT is(public.get_candidate_by_token_and_document('test-family-candidate', '593002', 'CC')->'family_members'->0->>'birth_date',
  '2020-11-11', 'a candidate can reopen the date');
SELECT is(pg_temp.submit_candidate(NULL)->>'success', 'true', 'an omitted candidate family list keeps existing relatives');
SELECT is(public.get_candidate_by_token_and_document('test-family-candidate', '593002', 'CC')->'family_members'->0->>'birth_date',
  '2020-11-11', 'the date survives another submission');
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"a9300000-0000-0000-0000-000000000010","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.replace_candidate_family_members(member.candidate_id, jsonb_build_array(jsonb_build_object(
  'id', member.id, 'full_name', member.full_name, 'relationship', member.relationship, 'birth_date', '2020-11-12'
))) FROM public.candidate_family_members member WHERE member.company_id = 'a9300000-0000-0000-0000-000000000001'$$,
  'the internal candidate form updates a previously submitted family date');
SELECT is((SELECT birth_date FROM public.candidate_family_members WHERE company_id = 'a9300000-0000-0000-0000-000000000001'),
  DATE '2020-11-12', 'the internal candidate form can reload the edited date');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{}', true);

SET LOCAL ROLE anon;
SELECT is(pg_temp.submit_candidate('[]')->>'success', 'true', 'a candidate can explicitly clear the family list');
SELECT is(public.get_candidate_by_token_and_document('test-family-candidate', '593002', 'CC')->>'family_members',
  '[]', 'the candidate list remains empty after reopening');
RESET ROLE;

UPDATE public.employees_v2 SET is_active = false, status = 'retired'
WHERE id = current_setting('test.family_employee_id')::uuid;
UPDATE public.employee_employment_cycles SET status = 'terminated', end_date = DATE '2025-01-01'
WHERE id = 'a9300000-0000-0000-0000-000000000005';
SET LOCAL ROLE anon;
SELECT is(public.submit_employee_rehire_registration('test-family-rehire', '{
  "first_name":"Ana","last_name":"Prueba","document_type":"CC","document_number":"593001",
  "family_members":[{"full_name":"Familiar reingreso","relationship":"Hija","birth_date":"2024-02-29"}]
}')->>'success', 'true', 'the rehire link accepts a family birth date');
SELECT is(public.get_candidate_by_token_and_document('test-family-rehire', '593001', 'CC')->'family_members'->0->>'birth_date',
  '2024-02-29', 'rehire lookup returns the saved family birth date');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
