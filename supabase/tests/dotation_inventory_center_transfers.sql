begin;

select plan(21);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'd1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'inventory-test@example.com', '', now(), '{}', '{}', now(), now()
);

insert into public.companies (id, name, nit) values
  ('d2000000-0000-0000-0000-000000000001', 'Empresa inventario', '900000093'),
  ('d2000000-0000-0000-0000-000000000002', 'Otra empresa inventario', '900000094');

insert into public.operation_centers (id, company_id, name, code) values
  ('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'Centro Norte', 'NORTE'),
  ('d3000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 'Centro ajeno', 'AJENO');

insert into public.dotation_item_types (id, company_id, name, category) values
  ('d4000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'CAMISA DE PRUEBA', 'uniforme');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name, is_active, status
) values (
  'd5000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
  'CC', '400000001', 'Elena', 'Inventario', true, 'active'
);

insert into public.employee_work_info (
  employee_id, company_id, operation_center_id, position_name, hire_date, is_current
) values (
  'd5000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
  'd3000000-0000-0000-0000-000000000001', 'Auxiliar', '2026-01-01', true
);

insert into public.user_company_assignments (user_id, company_id)
values ('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001');
insert into public.user_roles (user_id, role)
values ('d1000000-0000-0000-0000-000000000001', 'admin');

insert into public.system_config (company_id, config_key, config_value) values
  ('d2000000-0000-0000-0000-000000000001', 'dotation_inventory_enabled', '{"enabled":true}'),
  ('d2000000-0000-0000-0000-000000000001', 'dotation_auto_deduct', '{"enabled":true}'),
  ('d2000000-0000-0000-0000-000000000001', 'dotation_block_no_stock', '{"enabled":true}');

insert into public.dotation_inventory (
  id, company_id, operation_center_id, item_type, item_name, size, quantity_available, minimum_stock
) values (
  'd6000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
  null, 'd4000000-0000-0000-0000-000000000001', 'CAMISA DE PRUEBA', 'M', 10, 2
);

select throws_ok(
  $$insert into public.dotation_inventory (
      company_id, operation_center_id, item_type, item_name, size, quantity_available
    ) values (
      'd2000000-0000-0000-0000-000000000001', null,
      'd4000000-0000-0000-0000-000000000001', 'CAMISA DE PRUEBA', 'M', 1
    )$$,
  '23505', null,
  'general inventory cannot contain duplicate rows when nullable keys match'
);

select throws_ok(
  $$insert into public.dotation_inventory (
      company_id, operation_center_id, item_type, item_name, quantity_available
    ) values (
      'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000002',
      'd4000000-0000-0000-0000-000000000001', 'CAMISA DE PRUEBA', 1
    )$$,
  '23503', null,
  'an inventory row cannot reference a center from another company'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","email":"inventory-test@example.com","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.transfer_dotation_inventory(
      'd6000000-0000-0000-0000-000000000001',
      'd3000000-0000-0000-0000-000000000001', 4, 'Apertura del centro'
    )$$,
  'inventory can be transferred atomically from General to a center'
);
select is(
  (select quantity_available from public.dotation_inventory where id = 'd6000000-0000-0000-0000-000000000001'),
  6,
  'the transfer subtracts stock from General'
);
select is(
  (select quantity_available from public.dotation_inventory where operation_center_id = 'd3000000-0000-0000-0000-000000000001'),
  4,
  'the transfer creates and credits the destination inventory row'
);
select is(
  (select count(*)::integer from public.dotation_inventory_movements where movement_type like 'traslado_%'),
  2,
  'the transfer records paired source and destination movements'
);
select throws_ok(
  $$select public.transfer_dotation_inventory(
      'd6000000-0000-0000-0000-000000000001',
      'd3000000-0000-0000-0000-000000000001', 7, null
    )$$,
  '23514', 'Stock insuficiente en General. Disponible: 6, solicitado: 7.',
  'a transfer cannot overdraw its source center'
);
select is(
  (select quantity_available from public.dotation_inventory where id = 'd6000000-0000-0000-0000-000000000001'),
  6,
  'a rejected transfer leaves source stock unchanged'
);

select lives_ok(
  $$select public.create_dotation_delivery_batch(
      'd5000000-0000-0000-0000-000000000001', '2026-09-08', '2027-01-08',
      'Responsable de prueba', 'Entrega transaccional',
      '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"M"}]'
    )$$,
  'a delivery batch and its inventory deduction commit together'
);
select is(
  (select quantity_available from public.dotation_inventory where operation_center_id = 'd3000000-0000-0000-0000-000000000001'),
  2,
  'delivery deducts from the employee center when that row exists'
);
select is(
  (select quantity_available from public.dotation_inventory where id = 'd6000000-0000-0000-0000-000000000001'),
  6,
  'delivery does not consume General while the employee center owns the SKU'
);
select is((select count(*)::integer from public.dotation_deliveries), 1, 'the batch creates its delivery row');

select lives_ok(
  $$delete from public.dotation_delivery_transactions$$,
  'deleting the delivery transaction reverses applied stock'
);
select is(
  (select quantity_available from public.dotation_inventory where operation_center_id = 'd3000000-0000-0000-0000-000000000001'),
  4,
  'delivery cancellation restores stock to the exact center used'
);

select throws_ok(
  $$select public.create_dotation_delivery_batch(
      'd5000000-0000-0000-0000-000000000001', '2026-09-08', '2027-01-08',
      'Responsable de prueba', null,
      '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":5,"size":"M"}]'
    )$$,
  '23514', 'Stock insuficiente para CAMISA DE PRUEBA. Disponible: 4, solicitado: 5.',
  'insufficient center stock rolls back the full delivery batch'
);
select is((select count(*)::integer from public.dotation_delivery_transactions), 0, 'a rejected batch leaves no transaction header');
select is((select count(*)::integer from public.dotation_deliveries), 0, 'a rejected batch leaves no delivery rows');
select is(
  (select quantity_available from public.dotation_inventory where operation_center_id = 'd3000000-0000-0000-0000-000000000001'),
  4,
  'a rejected batch leaves center stock unchanged'
);

select throws_ok(
  $$select public.adjust_dotation_inventory(
      (select id from public.dotation_inventory where operation_center_id = 'd3000000-0000-0000-0000-000000000001'),
      -5, 'ajuste'
    )$$,
  '23514', null,
  'a manual adjustment cannot create negative stock'
);
select is(
  (select quantity_available from public.dotation_inventory where operation_center_id = 'd3000000-0000-0000-0000-000000000001'),
  4,
  'a rejected adjustment leaves stock unchanged'
);
select is(
  (select count(*)::integer from public.dotation_inventory_movements where movement_type = 'devolucion'),
  1,
  'delivery cancellation leaves an auditable reversal movement'
);

select * from finish();
rollback;
