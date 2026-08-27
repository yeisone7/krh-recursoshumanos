begin;

select plan(33);

create temp table public_leave_test_state (
  key text primary key,
  value text not null
);
grant select, insert, update, delete on public_leave_test_state to authenticated, service_role;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'public-leave-admin@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'public-leave-user@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.companies (id, name, nit)
values ('d2000000-0000-0000-0000-000000000001', 'Empresa enlace público', '900000093');

insert into public.user_company_assignments (user_id, company_id) values
  ('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000001');

insert into public.user_roles (user_id, role)
values ('d1000000-0000-0000-0000-000000000001', 'admin');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name,
  birth_date, is_active, status
) values (
  'd3000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  'CC', '10101010', 'Luisa', 'Pruebas', '1992-04-15', true, 'active'
);

insert into public.employee_employment_cycles (
  id, company_id, employee_id, cycle_number, status, source, start_date
) values (
  'd4000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  'd3000000-0000-0000-0000-000000000001',
  1, 'active', 'manual', current_date - 365
);

update public.leave_type_config
set requires_document = false, max_days_per_year = null, min_days_advance = 0
where company_id = 'd2000000-0000-0000-0000-000000000001'
  and leave_type = 'permiso_personal';

insert into public_leave_test_state (key, value)
select 'request_date', min(day_value)::date::text
from generate_series(current_date + 20, current_date + 30, interval '1 day') day_value
where extract(dow from day_value) between 1 and 6;

delete from public.company_holidays
where company_id = 'd2000000-0000-0000-0000-000000000001'
  and holiday_date = (select value::date from public_leave_test_state where key = 'request_date');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000002","email":"public-leave-user@example.com","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.rotate_leave_public_link('d2000000-0000-0000-0000-000000000001', now() + interval '1 year')$$,
  '42501',
  'No tienes permiso para administrar el enlace público.',
  'a company member without the dedicated permission cannot create a public link'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","email":"public-leave-admin@example.com","role":"authenticated"}',
  true
);

insert into public_leave_test_state (key, value)
select 'token_one', public.rotate_leave_public_link(
  'd2000000-0000-0000-0000-000000000001', now() + interval '1 year'
)->>'token';

select ok(
  (public.get_leave_public_link_status('d2000000-0000-0000-0000-000000000001')->>'active')::boolean,
  'an administrator can create and inspect the active link'
);
select throws_ok(
  $$insert into public.leave_requests (
      employee_id, company_id, leave_type, start_date, end_date, total_days, reason
    ) values (
      'd3000000-0000-0000-0000-000000000001',
      'd2000000-0000-0000-0000-000000000001',
      'permiso_personal', current_date + 20, current_date + 20, 1, 'Intento directo de prueba'
    )$$,
  '42501',
  'Las solicitudes de permisos deben crearse mediante el flujo autorizado.',
  'even an administrator cannot bypass the shared request-creation workflow'
);
select hasnt_column(
  'public', 'leave_public_access_tokens', 'token',
  'the raw token is never stored in the token table'
);

reset role;
select is(
  (select octet_length(token_hash) from public.leave_public_access_tokens where is_active),
  32,
  'only a 256-bit SHA-256 token hash is stored'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","email":"public-leave-admin@example.com","role":"authenticated"}',
  true
);
insert into public_leave_test_state (key, value)
select 'token_two', public.rotate_leave_public_link(
  'd2000000-0000-0000-0000-000000000001', null
)->>'token';

reset role;
select is(
  (select count(*)::integer from public.leave_public_access_tokens where company_id = 'd2000000-0000-0000-0000-000000000001' and is_active),
  1,
  'regeneration keeps exactly one active link per company'
);

set local role service_role;

select is(
  public.resolve_leave_public_context((select value from public_leave_test_state where key = 'token_one'))->>'valid',
  'false',
  'regeneration invalidates the previous token immediately'
);
select is(
  public.resolve_leave_public_context((select value from public_leave_test_state where key = 'token_two'))->>'valid',
  'true',
  'the regenerated token resolves to a valid company context'
);

select is(
  public.identify_leave_public_employee(
    (select value from public_leave_test_state where key = 'token_two'),
    'CC', '10101010', '1990-01-01', repeat('a', 64)
  )->>'code',
  'invalid_identity',
  'an incorrect birth date returns only a generic identity failure'
);

select is(
  public.identify_leave_public_employee(
    (select value from public_leave_test_state where key = 'token_two'),
    'CC', '00000001', '1990-01-01', repeat('b', 64)
  )->>'code',
  'invalid_identity',
  'an unknown document returns the same generic identity failure'
);

select is(
  public.identify_leave_public_employee(
    (select value from public_leave_test_state where key = 'token_two'),
    'CC', '00000002', '1990-01-01', repeat('c', 64)
  )->>'code',
  'invalid_identity',
  'failed identities are recorded without revealing employee existence'
);

select public.identify_leave_public_employee(
  (select value from public_leave_test_state where key = 'token_two'),
  'CC', '00000003', '1990-01-01', repeat('c', 64)
);
select public.identify_leave_public_employee(
  (select value from public_leave_test_state where key = 'token_two'),
  'CC', '00000004', '1990-01-01', repeat('c', 64)
);
select public.identify_leave_public_employee(
  (select value from public_leave_test_state where key = 'token_two'),
  'CC', '00000005', '1990-01-01', repeat('c', 64)
);
select public.identify_leave_public_employee(
  (select value from public_leave_test_state where key = 'token_two'),
  'CC', '00000006', '1990-01-01', repeat('c', 64)
);

select is(
  public.identify_leave_public_employee(
    (select value from public_leave_test_state where key = 'token_two'),
    'CC', '00000007', '1990-01-01', repeat('c', 64)
  )->>'code',
  'rate_limited',
  'five failures in fifteen minutes rate-limit the link and IP hash'
);

insert into public_leave_test_state (key, value)
select 'session', public.identify_leave_public_employee(
  (select value from public_leave_test_state where key = 'token_two'),
  'CC', '10101010', '1992-04-15', repeat('d', 64)
)->>'session';

select ok(
  length((select value from public_leave_test_state where key = 'session')) = 64,
  'a valid active employee receives a random ten-minute verification session'
);
select is(
  (select octet_length(session_hash) from public.leave_public_identity_sessions limit 1),
  32,
  'only the verification-session hash is stored'
);

reset role;
update public.leave_type_config
set requires_document = true
where company_id = 'd2000000-0000-0000-0000-000000000001'
  and leave_type = 'permiso_personal';
set local role service_role;
select throws_ok(
  format(
    'select public.submit_leave_public_request(%L, %L::jsonb)',
    (select value from public_leave_test_state where key = 'session'),
    jsonb_build_object(
      'leave_type', 'permiso_personal',
      'duration_type', 'dias_completos',
      'start_date', (select value from public_leave_test_state where key = 'request_date'),
      'end_date', (select value from public_leave_test_state where key = 'request_date'),
      'reason', 'Diligencia personal de prueba'
    )::text
  ),
  '22023',
  'Este tipo de permiso requiere un soporte.',
  'a leave type that requires evidence cannot be submitted without a private file path'
);
reset role;
update public.leave_type_config
set requires_document = false
where company_id = 'd2000000-0000-0000-0000-000000000001'
  and leave_type = 'permiso_personal';
set local role service_role;

insert into public_leave_test_state (key, value)
select 'reference', public.submit_leave_public_request(
  (select value from public_leave_test_state where key = 'session'),
  jsonb_build_object(
    'leave_type', 'permiso_personal',
    'duration_type', 'dias_completos',
    'start_date', (select value from public_leave_test_state where key = 'request_date'),
    'end_date', (select value from public_leave_test_state where key = 'request_date'),
    'reason', 'Diligencia personal de prueba'
  ),
  'd2000000-0000-0000-0000-000000000001/leaves/public/11111111-1111-1111-1111-111111111111/soporte.pdf',
  'soporte.pdf'
)->>'reference';

select matches(
  (select value from public_leave_test_state where key = 'reference'),
  '^PER-[0-9]{8}-[A-F0-9]{8}$',
  'public submissions receive the expected unique filing-number format'
);

reset role;
select is(
  (select submission_source from public.leave_requests where public_reference = (select value from public_leave_test_state where key = 'reference')),
  'public_link',
  'the request is marked as originating from the public link'
);
select is(
  (select created_by from public.leave_requests where public_reference = (select value from public_leave_test_state where key = 'reference')),
  null::uuid,
  'a public request does not impersonate an authenticated creator'
);
select is(
  (select approval_stage from public.leave_requests where public_reference = (select value from public_leave_test_state where key = 'reference')),
  'pending_manager',
  'the public request enters the immediate-manager approval stage'
);

insert into storage.objects (bucket_id, name)
values (
  'documents',
  'd2000000-0000-0000-0000-000000000001/leaves/public/11111111-1111-1111-1111-111111111111/soporte.pdf'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000002","email":"public-leave-user@example.com","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'documents' and name like '%/leaves/public/%'),
  0,
  'a company member without leave-request visibility cannot read public leave evidence'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","email":"public-leave-admin@example.com","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'documents' and name like '%/leaves/public/%'),
  1,
  'an administrator who can read the leave request can read its public evidence'
);

reset role;
set local role service_role;
select is(
  public.submit_leave_public_request(
    (select value from public_leave_test_state where key = 'session'), '{}'::jsonb
  )->>'reference',
  (select value from public_leave_test_state where key = 'reference'),
  'reusing a consumed session returns the same filing number idempotently'
);

reset role;
select is(
  (select count(*)::integer from public.leave_requests where submission_source = 'public_link'),
  1,
  'an idempotent retry never duplicates the leave request'
);

set local role service_role;
insert into public_leave_test_state (key, value)
select 'expired_session', public.identify_leave_public_employee(
  (select value from public_leave_test_state where key = 'token_two'),
  'CC', '10101010', '1992-04-15', repeat('e', 64)
)->>'session';
update public.leave_public_identity_sessions
set expires_at = now() - interval '1 minute'
where session_hash = extensions.digest((select value from public_leave_test_state where key = 'expired_session'), 'sha256');

select throws_ok(
  format(
    'select public.submit_leave_public_request(%L, %L::jsonb)',
    (select value from public_leave_test_state where key = 'expired_session'),
    '{}'
  ),
  '42501',
  'La sesión de verificación expiró.',
  'an expired verification session cannot submit'
);

reset role;
update public.leave_public_access_tokens
set created_at = now() - interval '2 minutes', expires_at = now() - interval '1 minute'
where company_id = 'd2000000-0000-0000-0000-000000000001' and is_active;
set local role service_role;
select is(
  public.resolve_leave_public_context((select value from public_leave_test_state where key = 'token_two'))->>'valid',
  'false',
  'an expired company link is rejected even while its record remains active'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","email":"public-leave-admin@example.com","role":"authenticated"}',
  true
);
insert into public_leave_test_state (key, value)
select 'token_three', public.rotate_leave_public_link(
  'd2000000-0000-0000-0000-000000000001', null
)->>'token';

reset role;
set local role service_role;
insert into public_leave_test_state (key, value)
select 'revoked_session', public.identify_leave_public_employee(
  (select value from public_leave_test_state where key = 'token_three'),
  'CC', '10101010', '1992-04-15', repeat('f', 64)
)->>'session';

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","email":"public-leave-admin@example.com","role":"authenticated"}',
  true
);
select ok(
  public.revoke_leave_public_link('d2000000-0000-0000-0000-000000000001'),
  'an administrator can revoke the current public link'
);

reset role;
set local role service_role;
select is(
  public.resolve_leave_public_context((select value from public_leave_test_state where key = 'token_three'))->>'valid',
  'false',
  'a revoked token stops resolving immediately'
);
select throws_ok(
  format(
    'select public.submit_leave_public_request(%L, %L::jsonb)',
    (select value from public_leave_test_state where key = 'revoked_session'),
    '{}'
  ),
  '42501',
  'La sesión de verificación no es válida.',
  'revoking a link invalidates verification sessions issued from it'
);

reset role;
set local role anon;
select throws_ok(
  'select * from public.leave_public_access_tokens',
  '42501',
  'permission denied for table leave_public_access_tokens',
  'anonymous users cannot query link records directly'
);
select throws_ok(
  'select * from public.leave_public_identity_sessions',
  '42501',
  'permission denied for table leave_public_identity_sessions',
  'anonymous users cannot query verification sessions directly'
);
select throws_ok(
  'select * from public.leave_public_access_attempts',
  '42501',
  'permission denied for table leave_public_access_attempts',
  'anonymous users cannot query rate-limit attempts directly'
);
select is(
  has_function_privilege('anon', 'public.resolve_leave_public_context(text)', 'execute'),
  false,
  'anonymous users have no execute privilege on service-only public-link RPCs'
);
reset role;
select is(
  (select public from storage.buckets where id = 'documents'),
  false,
  'leave evidence remains in the existing private documents bucket'
);

select * from finish();
rollback;
