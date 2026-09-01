begin;

select plan(12);

insert into public.companies (id, name, nit)
values ('e2000000-0000-0000-0000-000000000001', 'Empresa disciplinarios', '900000094');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name,
  birth_date, is_active, status
) values (
  'e3000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  'CC', '1007558327', 'Empleado', 'Prueba', '1990-01-01', true, 'active'
);

insert into public.disciplinary_processes (
  id, company_id, employee_id, case_number, status, fault_type, fault_date,
  facts_description, report_facts, hearing_questions, hearing_date
) values (
  'e4000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  'e3000000-0000-0000-0000-000000000001',
  'PD-2026-TEST', 'citacion_descargos', 'grave', current_date,
  'Descripción suficiente para probar el flujo disciplinario.',
  '[{"title":"Hecho de prueba","description":"Descripción suficiente del hecho reportado."}]'::jsonb,
  '[{"id":"q1","question":"Explique su versión","required":true}]'::jsonb,
  now() + interval '1 day'
);

insert into public.disciplinary_defense_tokens (
  id, process_id, company_id, employee_id, token, expires_at
) values (
  'e5000000-0000-0000-0000-000000000001',
  'e4000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  'e3000000-0000-0000-0000-000000000001',
  'disciplinary-test-token', now() + interval '1 day'
);

set local role anon;

select ok(
  not has_table_privilege('anon', 'public.disciplinary_defense_tokens', 'select'),
  'anonymous callers cannot enumerate defense tokens'
);

select is(
  public.get_disciplinary_defense_form('disciplinary-test-token')->>'success',
  'true',
  'a valid token resolves the public form'
);

select is(
  public.get_disciplinary_defense_form('disciplinary-test-token')->>'employee_document',
  '1007558327',
  'the token resolves only its intended employee context'
);

select is(
  public.get_disciplinary_defense_form('invalid-token')->>'success',
  'false',
  'an invalid token returns a generic failure'
);

select is(
  public.submit_defense_via_token(
    'disciplinary-test-token',
    'Esta es la versión completa del trabajador para la prueba.',
    'escrito',
    '[{"question_id":"q1","question":"Explique su versión","answer":"Respuesta de prueba"}]'::jsonb,
    'data:image/png;base64,dGVzdA==',
    true,
    'empleado@example.com',
    'Testigo Prueba',
    '123456'
  )->>'success',
  'true',
  'the worker can submit a signed structured defense once'
);

select is(
  public.submit_defense_via_token(
    'disciplinary-test-token', 'Segundo intento no permitido', 'escrito',
    '[]'::jsonb, 'data:image/png;base64,dGVzdA==', true, null, null, null
  )->>'success',
  'false',
  'the same link cannot be reused'
);

reset role;

select ok(
  (select is_used from public.disciplinary_defense_tokens where id = 'e5000000-0000-0000-0000-000000000001'),
  'successful submission consumes the token'
);

select is(
  (select count(*)::integer from public.disciplinary_defenses where process_id = 'e4000000-0000-0000-0000-000000000001'),
  1,
  'exactly one defense is stored'
);

select ok(
  (select rights_acknowledged from public.disciplinary_defenses where process_id = 'e4000000-0000-0000-0000-000000000001'),
  'rights acknowledgement is persisted'
);

select is(
  (select answers->0->>'answer' from public.disciplinary_defenses where process_id = 'e4000000-0000-0000-0000-000000000001'),
  'Respuesta de prueba',
  'structured question answers are persisted'
);

select is(
  (select status::text from public.disciplinary_processes where id = 'e4000000-0000-0000-0000-000000000001'),
  'descargos',
  'submission advances the process to descargos'
);

select is(
  (select count(*)::integer from public.disciplinary_timeline where process_id = 'e4000000-0000-0000-0000-000000000001' and action_type = 'descargos_via_enlace'),
  1,
  'submission records an audit timeline event'
);

select * from finish();
rollback;
