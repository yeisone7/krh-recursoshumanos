begin;

select plan(15);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('81000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'direct-no-permission@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('81000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'direct-authorized@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.companies (id, name, nit)
values ('82000000-0000-0000-0000-000000000001', 'Empresa recontratacion directa', '900000081');

insert into public.user_company_assignments (user_id, company_id) values
  ('81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001'),
  ('81000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001');

insert into public.operation_centers (id, company_id, name, city, address)
values ('83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'Centro directo', 'Bogota', 'Calle 1');

insert into public.areas (id, company_id, name)
values ('84000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'Area directa');

insert into public.positions (id, company_id, area_id, name)
values ('85000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'Cargo directo');

insert into public.contract_type_config (company_id, contract_type, display_name, requires_end_date)
values ('82000000-0000-0000-0000-000000000001', 'fijo', 'Termino fijo', true);

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name, is_active, status
) values (
  '86000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001',
  'CC', '810000001', 'Ana', 'Directa', false, 'retired'
);

insert into public.employee_employment_cycles (
  id, company_id, employee_id, cycle_number, status, source, start_date, end_date
) values (
  '87000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001',
  '86000000-0000-0000-0000-000000000001', 1, 'terminated', 'backfill', date '2020-01-01', date '2024-12-31'
);

insert into public.employee_contact (
  employee_id, company_id, employment_cycle_id, email, mobile, is_current, valid_from, valid_to
) values (
  '86000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001',
  '87000000-0000-0000-0000-000000000001', 'ana@example.com', '3000000000', false, date '2020-01-01', date '2024-12-31'
);

insert into public.custom_roles (id, company_id, name)
values ('88000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'Recontratador directo');

insert into public.role_permissions (role_id, permission_id)
select '88000000-0000-0000-0000-000000000001', permission.id
from public.permissions permission
join public.modules module on module.id = permission.module_id
where module.code = 'recontratacion_directa' and permission.action = 'create';

insert into public.user_custom_roles (user_id, role_id)
values ('81000000-0000-0000-0000-000000000002', '88000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","email":"direct-no-permission@example.com","role":"authenticated"}', true);

select throws_ok(
  $$ select public.complete_direct_employee_rehire(
    '86000000-0000-0000-0000-000000000001',
    '{"request_id":"89000000-0000-0000-0000-000000000001"}'::jsonb
  ) $$,
  'P0001',
  'No tiene permisos para ejecutar una recontratacion directa',
  'a company member without the explicit permission cannot direct rehire'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000002","email":"direct-authorized@example.com","role":"authenticated"}', true);

create temp table direct_result as
select public.complete_direct_employee_rehire(
  '86000000-0000-0000-0000-000000000001',
  jsonb_build_object(
    'request_id', '89000000-0000-0000-0000-000000000001',
    'hire_date', '2026-08-13',
    'end_date', '2027-08-12',
    'operation_center_id', '83000000-0000-0000-0000-000000000001',
    'area_id', '84000000-0000-0000-0000-000000000001',
    'position_id', '85000000-0000-0000-0000-000000000001',
    'contract_type', 'fijo',
    'salary', 2500000,
    'salary_type', 'mensual',
    'transport_allowance', 0,
    'trial_period_days', 30,
    'rest_day', 'domingo',
    'reason', 'Retorno directo aprobado por necesidad operativa',
    'onboarding_tasks', jsonb_build_array(jsonb_build_object(
      'task_key', 'documentos_personales', 'task_label', 'Documentos personales',
      'task_description', 'Actualizar documentos', 'sort_order', 1
    ))
  )
) result;

reset role;

select is((select result ->> 'existing' from direct_result), 'false', 'the first direct request creates a cycle');
select is((select is_active from public.employees_v2 where id = '86000000-0000-0000-0000-000000000001'), true, 'the employee is active');
select is((select status::text from public.employees_v2 where id = '86000000-0000-0000-0000-000000000001'), 'active', 'the employee status is active');
select is((select count(*)::bigint from public.employee_employment_cycles where employee_id = '86000000-0000-0000-0000-000000000001'), 2::bigint, 'the historical cycle is preserved');
select is((select source::text from public.employee_employment_cycles where id = (select (result ->> 'employment_cycle_id')::uuid from direct_result)), 'direct_rehire', 'the new cycle records its origin');
select is((select candidate_id from public.employee_employment_cycles where id = (select (result ->> 'employment_cycle_id')::uuid from direct_result)), null::uuid, 'the direct cycle has no candidate');
select is((select count(*)::bigint from public.candidates where rehire_employee_id = '86000000-0000-0000-0000-000000000001'), 0::bigint, 'no selection application is created');
select is((select result::text from public.medical_exams where id = (select (result ->> 'entry_exam_id')::uuid from direct_result)), 'pendiente', 'the entry exam is pending');
select is((select count(*)::bigint from public.employee_onboarding_tasks where employment_cycle_id = (select (result ->> 'employment_cycle_id')::uuid from direct_result)), 2::bigint, 'position and medical onboarding tasks are created');
select is((select email from public.employee_contact where employment_cycle_id = (select (result ->> 'employment_cycle_id')::uuid from direct_result)), 'ana@example.com', 'the latest contact is copied');
select is((select count(*)::bigint from public.vacation_balances where employment_cycle_id = (select (result ->> 'employment_cycle_id')::uuid from direct_result)), 1::bigint, 'a fresh vacation balance is created');
select is((select count(*)::bigint from public.leave_balances where employment_cycle_id = (select (result ->> 'employment_cycle_id')::uuid from direct_result)), 10::bigint, 'fresh leave balances are created');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000002","email":"direct-authorized@example.com","role":"authenticated"}', true);

create temp table retry_result as
select public.complete_direct_employee_rehire(
  '86000000-0000-0000-0000-000000000001',
  '{"request_id":"89000000-0000-0000-0000-000000000001"}'::jsonb
) result;

reset role;

select is((select result ->> 'existing' from retry_result), 'true', 'the same request is idempotent');
select is((select count(*)::bigint from public.employee_employment_cycles where employee_id = '86000000-0000-0000-0000-000000000001'), 2::bigint, 'an idempotent retry does not duplicate cycles');

select * from finish();
rollback;
