begin;

select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'da100000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'dotation-scope@example.com', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.companies (id, name, nit)
values ('da200000-0000-0000-0000-000000000001', 'Empresa alcance dotación', '900000093');

insert into public.operation_centers (id, company_id, name, code) values
  ('da300000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001', 'Centro permitido', 'DOT-P'),
  ('da300000-0000-0000-0000-000000000002', 'da200000-0000-0000-0000-000000000001', 'Centro bloqueado', 'DOT-B');

insert into public.positions (id, company_id, name, code) values
  ('da400000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001', 'Cargo permitido', 'DOT-CP'),
  ('da400000-0000-0000-0000-000000000002', 'da200000-0000-0000-0000-000000000001', 'Cargo bloqueado', 'DOT-CB');

insert into public.dotation_item_types (
  id, company_id, name, code, category, requires_size
) values (
  'da500000-0000-0000-0000-000000000001',
  'da200000-0000-0000-0000-000000000001',
  'Camisa prueba alcance', 'DOT-CAM', 'uniforme', true
);

insert into public.user_company_assignments (user_id, company_id)
values ('da100000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001');

insert into public.user_center_assignments (user_id, operation_center_id)
values ('da100000-0000-0000-0000-000000000001', 'da300000-0000-0000-0000-000000000001');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name, is_active, status
) values
  ('da600000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001', 'CC', '930000001', 'Empleado', 'Permitido', true, 'active'),
  ('da600000-0000-0000-0000-000000000002', 'da200000-0000-0000-0000-000000000001', 'CC', '930000002', 'Empleado', 'Bloqueado', true, 'active');

insert into public.employee_work_info (
  employee_id, company_id, operation_center_id, position_id, position_name, hire_date, is_current
) values
  ('da600000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001', 'da300000-0000-0000-0000-000000000001', 'da400000-0000-0000-0000-000000000001', 'Cargo permitido', date '2026-01-01', true),
  ('da600000-0000-0000-0000-000000000002', 'da200000-0000-0000-0000-000000000001', 'da300000-0000-0000-0000-000000000002', 'da400000-0000-0000-0000-000000000002', 'Cargo bloqueado', date '2026-01-01', true);

insert into public.dotation_delivery_transactions (
  id, employee_id, company_id, delivery_date, delivered_by
) values
  ('da700000-0000-0000-0000-000000000001', 'da600000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001', date '2026-09-01', 'Prueba'),
  ('da700000-0000-0000-0000-000000000002', 'da600000-0000-0000-0000-000000000002', 'da200000-0000-0000-0000-000000000001', date '2026-09-01', 'Prueba');

alter table public.dotation_deliveries disable trigger apply_dotation_delivery_inventory_trigger;
insert into public.dotation_deliveries (
  id, employee_id, company_id, transaction_id, item_type, item_name,
  quantity, delivery_date, expiration_date, delivered_by
) values
  ('da800000-0000-0000-0000-000000000001', 'da600000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001', 'da700000-0000-0000-0000-000000000001', 'uniforme_camisa', 'Camisa prueba alcance', 1, date '2026-09-01', date '2027-09-01', 'Prueba'),
  ('da800000-0000-0000-0000-000000000002', 'da600000-0000-0000-0000-000000000002', 'da200000-0000-0000-0000-000000000001', 'da700000-0000-0000-0000-000000000002', 'uniforme_camisa', 'Camisa prueba alcance', 1, date '2026-09-01', date '2027-09-01', 'Prueba');
alter table public.dotation_deliveries enable trigger apply_dotation_delivery_inventory_trigger;

insert into public.dotation_profesiograma (
  id, company_id, operation_center_id, position_id
) values
  ('da900000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001', 'da300000-0000-0000-0000-000000000001', 'da400000-0000-0000-0000-000000000001'),
  ('da900000-0000-0000-0000-000000000002', 'da200000-0000-0000-0000-000000000001', 'da300000-0000-0000-0000-000000000002', 'da400000-0000-0000-0000-000000000002');

insert into public.dotation_profesiograma_items (
  id, company_id, profesiograma_id, dotation_item_type_id, quantity
) values
  ('daa00000-0000-0000-0000-000000000001', 'da200000-0000-0000-0000-000000000001', 'da900000-0000-0000-0000-000000000001', 'da500000-0000-0000-0000-000000000001', 1),
  ('daa00000-0000-0000-0000-000000000002', 'da200000-0000-0000-0000-000000000001', 'da900000-0000-0000-0000-000000000002', 'da500000-0000-0000-0000-000000000001', 1);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"da100000-0000-0000-0000-000000000001","email":"dotation-scope@example.com","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.dotation_delivery_transactions), 1,
  'delivery transactions are limited to assigned centers'
);
select is(
  (select count(*)::integer from public.dotation_deliveries), 1,
  'delivery items are limited to assigned centers'
);
select is(
  (select count(*)::integer from public.dotation_profesiograma), 1,
  'profesiogramas are limited to assigned centers'
);
select is(
  (select count(*)::integer from public.dotation_profesiograma_items), 1,
  'profesiograma items inherit the assigned center scope'
);
select is(
  json_array_length(public.get_profesiogramas_with_items('da200000-0000-0000-0000-000000000001')),
  1,
  'the profesiograma RPC respects assigned centers'
);

reset role;
delete from public.user_center_assignments
where user_id = 'da100000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"da100000-0000-0000-0000-000000000001","email":"dotation-scope@example.com","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.dotation_delivery_transactions), 2,
  'no center assignments preserves full company transaction scope'
);
select is(
  (select count(*)::integer from public.dotation_profesiograma), 2,
  'no center assignments preserves full company profesiograma scope'
);
select is(
  json_array_length(public.get_profesiogramas_with_items('da200000-0000-0000-0000-000000000001')),
  2,
  'the RPC preserves full company scope when no centers are assigned'
);

select * from finish();
rollback;
