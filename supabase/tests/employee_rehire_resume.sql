begin;

set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'rehire-test@example.com', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.super_admins (user_id)
values ('10000000-0000-0000-0000-000000000001');

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"rehire-test@example.com","role":"authenticated"}',
  true
);

insert into public.companies (id, name, nit)
values ('20000000-0000-0000-0000-000000000001', 'Empresa prueba reingreso', '900000001');

insert into public.operation_centers (id, company_id, name, city, address)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Centro nuevo', 'BogotÃ¡', 'Calle 1'
);

insert into public.vacancies (
  id, company_id, position_title, operation_center_id, status, salary_type, includes_transport
) values (
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Analista de reingreso',
  '30000000-0000-0000-0000-000000000001',
  'open', 'mensual', true
);

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name,
  is_active, status, created_by
) values (
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'CC', '1234567890', 'Ana', 'HistÃ³rica', false, 'retired',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.employee_employment_cycles (
  id, company_id, employee_id, cycle_number, status, source, start_date, end_date, created_by
) values (
  '60000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  1, 'terminated', 'backfill', date '2020-01-01', date '2022-12-31',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.employee_contact (
  employee_id, company_id, employment_cycle_id, email, mobile,
  residence_city, is_current, valid_from, valid_to
) values (
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'ana@example.com', '3000000000', 'BogotÃ¡', false,
  date '2020-01-01', date '2022-12-31'
);


insert into public.candidates (id, company_id, vacancy_id, first_name, last_name, document_type, document_number, status, is_selected, source)
values ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Ana', 'Historica', 'CC', '1234567890 ', 'selected', true, 'auto_registro');
-- Simulate a registration that was updated to the retired employee identity.
update public.candidates set rehire_employee_id=null, source='auto_registro' where id='70000000-0000-0000-0000-000000000001';
insert into public.selection_steps(candidate_id, company_id, step_type, step_order, status)
values ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'prefiltro', 1, 'passed');

set local role authenticated;
create temp table resumed as select public.start_employee_rehire('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001') result;
reset role;
select is((select result->>'existing' from resumed), 'true', 'resumes rather than creating a duplicate');
select is((select result->>'candidate_id' from resumed), '70000000-0000-0000-0000-000000000001', 'matches identity with surrounding document whitespace');
select is((select rehire_employee_id::text from public.candidates where id='70000000-0000-0000-0000-000000000001'), '50000000-0000-0000-0000-000000000001', 'links the retired employee identity');
select is((select source from public.candidates where id='70000000-0000-0000-0000-000000000001'), 'reingreso', 'marks the existing application as rehire');
select is((select status::text from public.candidates where id='70000000-0000-0000-0000-000000000001'), 'selected', 'preserves selected status');
select ok((select is_selected from public.candidates where id='70000000-0000-0000-0000-000000000001'), 'preserves the selection decision');
select is((select count(*) from public.selection_steps where candidate_id='70000000-0000-0000-0000-000000000001'), 1::bigint, 'preserves selection stages');
select is((select status::text from public.selection_steps where candidate_id='70000000-0000-0000-0000-000000000001'), 'passed', 'preserves stage progress');
select is((select status::text from public.employees_v2 where id='50000000-0000-0000-0000-000000000001'), 'retired', 'employee remains retired until hiring is completed');
select is((select count(*) from public.employee_employment_cycles where employee_id='50000000-0000-0000-0000-000000000001'), 1::bigint, 'does not create an employment cycle prematurely');
select is((select count(*) from public.candidates where vacancy_id='40000000-0000-0000-0000-000000000001'), 1::bigint, 'keeps one application for the vacancy');
select is((select count(*) from public.audit_logs where entity_id='70000000-0000-0000-0000-000000000001' and action='link_existing_employee_rehire'), 1::bigint, 'audits the identity repair');
select is(public.start_employee_rehire('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001')->>'candidate_id', '70000000-0000-0000-0000-000000000001', 'retries reuse the same application');
select is((select count(*) from public.audit_logs where entity_id='70000000-0000-0000-0000-000000000001' and action='link_existing_employee_rehire'), 1::bigint, 'does not repeat the repair audit');
select throws_ok($sql$insert into public.candidates(company_id,vacancy_id,first_name,last_name,document_type,document_number,status) values ('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Ana','Duplicada','CC','1234567890','applied')$sql$, 'P0001', NULL, 'duplicate protection remains enabled');

reset role;
insert into public.employees_v2(id,company_id,document_type,document_number,first_name,last_name,is_active,status)
values ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','CC','other-identity','Otra','Persona',false,'retired');
update public.candidates set rehire_employee_id='50000000-0000-0000-0000-000000000002' where id='70000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($sql$select public.start_employee_rehire('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001')$sql$, 'P0001', 'La postulación activa ya está vinculada a otro proceso laboral. Revise su vínculo antes de iniciar el reingreso.', 'does not take over an application linked to another employee');
reset role;
update public.candidates set rehire_employee_id='50000000-0000-0000-0000-000000000001', employee_id='50000000-0000-0000-0000-000000000001' where id='70000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($sql$select public.start_employee_rehire('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001')$sql$, 'P0001', 'La postulación activa ya está vinculada a otro proceso laboral. Revise su vínculo antes de iniciar el reingreso.', 'does not reuse an application already linked to employment');
reset role;
update public.employees_v2 set is_active=true,status='active' where id='50000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($sql$select public.start_employee_rehire('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001')$sql$, 'P0001', 'El empleado todavía está activo. Use el proceso de traslado interno.', 'active employees still cannot be rehired');
select * from finish();
rollback;
