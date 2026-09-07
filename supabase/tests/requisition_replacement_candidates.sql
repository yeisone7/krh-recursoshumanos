begin;

select plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'requisition-scope@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'requisition-denied@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.companies (id, name, nit)
values ('a2000000-0000-0000-0000-000000000001', 'Empresa candidatos reemplazo', '900000093');

insert into public.operation_centers (id, company_id, name, code) values
  ('a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Centro permitido', 'CRP'),
  ('a3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'Centro bloqueado', 'CRB');

insert into public.user_company_assignments (user_id, company_id) values
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001');

insert into public.user_center_assignments (user_id, operation_center_id)
values ('a1000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001');

insert into public.custom_roles (id, company_id, name)
values ('a4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Creador de requisiciones');

insert into public.role_permissions (role_id, permission_id)
select 'a4000000-0000-0000-0000-000000000001', permission.id
from public.permissions permission
join public.modules module on module.id = permission.module_id
where module.code = 'requisiciones' and permission.action = 'create';

insert into public.user_custom_roles (user_id, role_id)
values ('a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name, is_active, status
) values
  ('a5000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'CC', '500000001', 'Ana', 'Activa', true, 'active'),
  ('a5000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'CC', '500000002', 'Iván', 'Inactivo', false, 'retired'),
  ('a5000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'CC', '500000003', 'Celia', 'Bloqueada', false, 'retired'),
  ('a5000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'CC', '500000004', 'Tomás', 'Trasladado', true, 'active'),
  ('a5000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000001', 'CC', '500000005', 'Laura', 'Asignación', false, 'retired');

insert into public.employee_employment_cycles (
  id, company_id, employee_id, cycle_number, status, source, start_date, end_date
) values
  ('a6000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000004', 1, 'terminated', 'backfill', '2020-01-01', '2023-12-31'),
  ('a6000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000004', 2, 'active', 'backfill', '2024-01-01', null),
  ('a6000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000005', 1, 'terminated', 'backfill', '2021-01-01', '2022-12-31');

insert into public.employee_operation_center_assignments (
  employee_id, company_id, operation_center_id, employment_cycle_id
) values (
  'a5000000-0000-0000-0000-000000000005',
  'a2000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001',
  'a6000000-0000-0000-0000-000000000003'
);

insert into public.employee_work_info (
  employee_id, company_id, operation_center_id, position_name, hire_date, is_current
) values
  ('a5000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'Analista', '2025-01-01', true),
  ('a5000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'Analista', '2020-01-01', false),
  ('a5000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 'Analista', '2020-01-01', false),
  ('a5000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'Analista', '2020-01-01', false),
  ('a5000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 'Analista', '2024-01-01', true);

update public.employee_work_info
set employment_cycle_id = 'a6000000-0000-0000-0000-000000000001'
where employee_id = 'a5000000-0000-0000-0000-000000000004'
  and operation_center_id = 'a3000000-0000-0000-0000-000000000001';

update public.employee_work_info
set employment_cycle_id = 'a6000000-0000-0000-0000-000000000002'
where employee_id = 'a5000000-0000-0000-0000-000000000004'
  and operation_center_id = 'a3000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","email":"requisition-scope@example.com","role":"authenticated"}', true);

select is(
  (select count(*)::integer from public.get_requisition_replacement_candidates('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001')),
  3,
  'the selected assigned center returns active and inactive employees'
);
select ok(
  exists (
    select 1 from public.get_requisition_replacement_candidates('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001')
    where id = 'a5000000-0000-0000-0000-000000000002' and not is_active
  ),
  'an inactive employee remains selectable'
);
select is(
  (select count(*)::integer from public.get_requisition_replacement_candidates('a2000000-0000-0000-0000-000000000001', null)),
  3,
  'an omitted center still restricts results to assigned historical centers'
);
select is(
  (select count(*)::integer from public.get_requisition_replacement_candidates('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002')),
  0,
  'an unassigned center cannot be queried explicitly'
);
select ok(
  not exists (
    select 1 from public.get_requisition_replacement_candidates('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001')
    where id = 'a5000000-0000-0000-0000-000000000004'
  ),
  'a transferred employee is hidden from the former center once a newer active cycle exists'
);
select ok(
  exists (
    select 1 from public.get_requisition_replacement_candidates('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001')
    where id = 'a5000000-0000-0000-0000-000000000005' and not is_active
  ),
  'the latest terminated cycle can grant access through an additional center assignment'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000002","email":"requisition-denied@example.com","role":"authenticated"}', true);
select throws_ok(
  $$select public.get_requisition_replacement_candidates('a2000000-0000-0000-0000-000000000001', null)$$,
  '42501',
  'Insufficient requisition permissions',
  'company membership without requisition permission is denied'
);

select * from finish();
rollback;
