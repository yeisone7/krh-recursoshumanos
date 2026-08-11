begin;

select plan(12);

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

create temp table rehire_start as
select public.start_employee_rehire(
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001'
) result;

select is((select result ->> 'existing' from rehire_start), 'false', 'a new rehire application is created');
select is(
  (select rehire_employee_id from public.candidates where id = (select (result ->> 'candidate_id')::uuid from rehire_start)),
  '50000000-0000-0000-0000-000000000001'::uuid,
  'the application points to the historical employee identity'
);
select is(
  (select count(*)::bigint from public.selection_steps where candidate_id = (select (result ->> 'candidate_id')::uuid from rehire_start)),
  0::bigint,
  'selection stages start empty'
);
select is(
  (select count(*)::bigint from public.candidate_family_members where candidate_id = (select (result ->> 'candidate_id')::uuid from rehire_start)),
  0::bigint,
  'family starts empty'
);

update public.candidates
set status = 'selected', is_selected = true
where id = (select (result ->> 'candidate_id')::uuid from rehire_start);

insert into public.selection_steps (
  candidate_id, company_id, step_type, step_order, status,
  completed_date, result, medical_concept, provider, doctor_name
)
select
  (select (result ->> 'candidate_id')::uuid from rehire_start),
  '20000000-0000-0000-0000-000000000001',
  step_type::public.selection_step_type,
  ordinal,
  'passed',
  now(),
  case when step_type = 'examenes_medicos' then 'apto' else null end,
  case when step_type = 'examenes_medicos' then 'Apto para el cargo' else null end,
  case when step_type = 'examenes_medicos' then 'IPS prueba' else null end,
  case when step_type = 'examenes_medicos' then 'MÃ©dico prueba' else null end
from unnest(array[
  'prefiltro', 'entrevista_seleccion', 'entrevista_jefe',
  'validacion_antecedentes', 'pruebas_psicotecnicas', 'pruebas_conocimiento',
  'validacion_academica', 'validacion_referencias', 'examenes_medicos'
]) with ordinality as required_steps(step_type, ordinal);

create temp table hiring_result as
select public.complete_candidate_hiring(
  (select (result ->> 'candidate_id')::uuid from rehire_start),
  jsonb_build_object(
    'hire_date', '2026-08-10',
    'operation_center_id', '30000000-0000-0000-0000-000000000001',
    'position_name', 'Analista de reingreso',
    'contract_type', 'indefinido',
    'link_type', 'indefinido',
    'salary', 2000000,
    'salary_type', 'mensual',
    'transport_allowance', 200000,
    'onboarding_tasks', jsonb_build_array(jsonb_build_object(
      'task_key', 'documentos_personales',
      'task_label', 'Documentos personales',
      'task_description', 'RevisiÃ³n nueva',
      'sort_order', 1
    ))
  )
) result;

select is((select result ->> 'employee_id' from hiring_result), '50000000-0000-0000-0000-000000000001', 'rehire reuses the employee identity');
select is((select count(*)::bigint from public.employee_employment_cycles where employee_id = '50000000-0000-0000-0000-000000000001'), 2::bigint, 'two separate employment cycles exist');
select is((select count(*)::bigint from public.employee_employment_cycles where employee_id = '50000000-0000-0000-0000-000000000001' and status = 'active'), 1::bigint, 'only one cycle is active');
select is((select count(*)::bigint from public.employee_onboarding_tasks where employment_cycle_id = (select (result ->> 'employment_cycle_id')::uuid from hiring_result)), 1::bigint, 'onboarding is reset for the new cycle');
select is((select count(*)::bigint from public.leave_balances where employment_cycle_id = (select (result ->> 'employment_cycle_id')::uuid from hiring_result)), 10::bigint, 'leave balances are reset for every leave type');
select is((select count(*)::bigint from public.employee_bank_info where employment_cycle_id = (select (result ->> 'employment_cycle_id')::uuid from hiring_result)), 0::bigint, 'bank information remains pending');
select is((select count(*)::bigint from public.employee_social_security where employment_cycle_id = (select (result ->> 'employment_cycle_id')::uuid from hiring_result)), 0::bigint, 'social security remains pending');

create temp table hiring_retry as
select public.complete_candidate_hiring(
  (select (result ->> 'candidate_id')::uuid from rehire_start),
  '{}'::jsonb
) result;

select is((select result ->> 'existing' from hiring_retry), 'true', 'hiring retries are idempotent');

select * from finish();
rollback;
