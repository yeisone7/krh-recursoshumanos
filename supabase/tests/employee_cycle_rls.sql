begin;

select plan(9);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '71000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'center-test@example.com', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '71000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'selection-test@example.com', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.companies (id, name, nit) values
  ('72000000-0000-0000-0000-000000000001', 'Empresa RLS A', '900000011'),
  ('72000000-0000-0000-0000-000000000002', 'Empresa RLS B', '900000012');

insert into public.operation_centers (id, company_id, name, city, address) values
  ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'Centro A anterior', 'Bogota', 'Calle 1'),
  ('73000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 'Centro A actual', 'Bogota', 'Calle 2'),
  ('73000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', 'Centro B', 'Medellin', 'Calle 3');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name,
  is_active, status
) values
  ('74000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'CC', '710000001', 'Visible', 'Actual', true, 'active'),
  ('74000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 'CC', '710000002', 'Oculto', 'Cambio Centro', true, 'active'),
  ('74000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', 'CC', '710000003', 'Oculto', 'Otra Empresa', true, 'active'),
  ('74000000-0000-0000-0000-000000000004', '72000000-0000-0000-0000-000000000001', 'CC', '710000004', 'Retirado', 'Seleccion', false, 'retired'),
  ('74000000-0000-0000-0000-000000000005', '72000000-0000-0000-0000-000000000001', 'CC', '710000005', 'Visible', 'Centro Primario', true, 'active');

insert into public.employee_employment_cycles (
  id, company_id, employee_id, cycle_number, status, source, start_date, end_date
) values
  ('75000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 1, 'active', 'backfill', date '2025-01-01', null),
  ('75000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000002', 1, 'terminated', 'backfill', date '2020-01-01', date '2022-12-31'),
  ('75000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000002', 2, 'active', 'backfill', date '2024-01-01', null),
  ('75000000-0000-0000-0000-000000000004', '72000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000003', 1, 'active', 'backfill', date '2025-01-01', null),
  ('75000000-0000-0000-0000-000000000005', '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000004', 1, 'terminated', 'backfill', date '2019-01-01', date '2023-12-31'),
  ('75000000-0000-0000-0000-000000000006', '72000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000005', 1, 'active', 'backfill', date '2025-02-01', null);

insert into public.employee_work_info (
  employee_id, company_id, operation_center_id, position_name, hire_date,
  is_current, employment_cycle_id
) values (
  '74000000-0000-0000-0000-000000000005',
  '72000000-0000-0000-0000-000000000001',
  '73000000-0000-0000-0000-000000000001',
  'Cargo centro primario',
  date '2025-02-01',
  true,
  '75000000-0000-0000-0000-000000000006'
);

insert into public.employee_operation_center_assignments (
  employee_id, company_id, operation_center_id, employment_cycle_id
) values
  ('74000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001'),
  ('74000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000002'),
  ('74000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000003'),
  ('74000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000003', '75000000-0000-0000-0000-000000000004');

insert into public.user_company_assignments (user_id, company_id) values
  ('71000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001'),
  ('71000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001');

insert into public.user_center_assignments (user_id, operation_center_id)
values ('71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001');

insert into public.vacancies (
  id, company_id, position_title, operation_center_id, status, salary_type, includes_transport
) values (
  '76000000-0000-0000-0000-000000000001',
  '72000000-0000-0000-0000-000000000001',
  'Vacante RLS',
  '73000000-0000-0000-0000-000000000001',
  'open', 'mensual', true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000001","email":"center-test@example.com","role":"authenticated"}',
  true
);

select is(
  (select count(*)::bigint from public.employees_v2 where id in (
    '74000000-0000-0000-0000-000000000001',
    '74000000-0000-0000-0000-000000000002',
    '74000000-0000-0000-0000-000000000003'
  )),
  2::bigint,
  'employee visibility accepts an active-cycle assignment or current primary work info'
);
select ok(public.has_employee_v2_access('74000000-0000-0000-0000-000000000001'), 'current assigned center grants access');
select ok(not public.has_employee_v2_access('74000000-0000-0000-0000-000000000002'), 'historical center no longer grants access');
select ok(public.has_employee_v2_access('74000000-0000-0000-0000-000000000005'), 'current primary work-info center grants access without an assignment row');
select is(
  (select count(*)::bigint from public.employee_operation_center_assignments where employee_id = '74000000-0000-0000-0000-000000000005'),
  0::bigint,
  'primary-center access does not require a duplicated assignment row'
);
select is(
  (select count(*)::bigint from public.employee_employment_cycles),
  1::bigint,
  'cycle RLS excludes inaccessible centers and other companies'
);
select is(
  (select count(*)::bigint from public.employee_employment_cycles where company_id = '72000000-0000-0000-0000-000000000002'),
  0::bigint,
  'cycle RLS isolates companies'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000002","email":"selection-test@example.com","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.start_employee_rehire(
    '74000000-0000-0000-0000-000000000004',
    '76000000-0000-0000-0000-000000000001'
  ) $$,
  'P0001',
  'No tiene permisos para iniciar el proceso de reingreso',
  'company membership alone cannot start a rehire'
);

reset role;
insert into public.user_roles (user_id, role)
values ('71000000-0000-0000-0000-000000000002', 'psicologo');
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000002","email":"selection-test@example.com","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.start_employee_rehire(
    '74000000-0000-0000-0000-000000000004',
    '76000000-0000-0000-0000-000000000001'
  ) $$,
  'selection role can start a clean rehire application'
);

select * from finish();
rollback;
