begin;

set local search_path = public, extensions;

select plan(22);

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

insert into public.operation_centers (id, company_id, name, code) values ('d3000000-0000-0000-0000-000000000003','d2000000-0000-0000-0000-000000000001','Bodega Norte','BODEGA');
insert into public.dotation_inventory (company_id, operation_center_id, item_type, item_name, size, quantity_available) values
('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','CAMISA DE PRUEBA','M',0),
('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000003','d4000000-0000-0000-0000-000000000001','CAMISA DE PRUEBA','M',8);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"M","source_operation_center_id":null}]'::jsonb)$$, 'General can supply an employee whose own center is empty');
select is((select quantity_available from public.dotation_inventory where company_id='d2000000-0000-0000-0000-000000000001' and operation_center_id is not distinct from null::uuid), 8, 'General stock is deducted');
select is((select quantity_available from public.dotation_inventory where company_id='d2000000-0000-0000-0000-000000000001' and operation_center_id is not distinct from 'd3000000-0000-0000-0000-000000000001'::uuid), 0, 'Employee center stays unchanged');
select is((select inventory_source_selected from public.dotation_deliveries where company_id='d2000000-0000-0000-0000-000000000001'), true, 'General selection is persisted explicitly');
select lives_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"M","source_operation_center_id":"d3000000-0000-0000-0000-000000000003"}]'::jsonb)$$, 'Another center can supply the delivery');
select is((select quantity_available from public.dotation_inventory where company_id='d2000000-0000-0000-0000-000000000001' and operation_center_id is not distinct from 'd3000000-0000-0000-0000-000000000003'::uuid), 6, 'Selected center stock is deducted');
select is((select quantity_available from public.dotation_inventory where company_id='d2000000-0000-0000-0000-000000000001' and operation_center_id is not distinct from null::uuid), 8, 'General is unchanged by a delivery from another center');
select throws_ok($$update public.dotation_deliveries set source_operation_center_id='d3000000-0000-0000-0000-000000000001' where company_id='d2000000-0000-0000-0000-000000000001'$$, '23514', null, 'Applied inventory source cannot be edited');
select lives_ok($$delete from public.dotation_delivery_transactions where company_id='d2000000-0000-0000-0000-000000000001'$$, 'Cancellation returns goods to the original source');
select is((select quantity_available from public.dotation_inventory where company_id='d2000000-0000-0000-0000-000000000001' and operation_center_id is not distinct from 'd3000000-0000-0000-0000-000000000003'::uuid), 8, 'Cancellation restores the other center');
select is((select quantity_available from public.dotation_inventory where company_id='d2000000-0000-0000-0000-000000000001' and operation_center_id is not distinct from null::uuid), 10, 'Cancellation restores General');
select throws_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"M","source_operation_center_id":"d3000000-0000-0000-0000-000000000001"}]'::jsonb)$$, '23514', null, 'Empty selected center cannot fall back to General');
select throws_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"L","source_operation_center_id":"d3000000-0000-0000-0000-000000000003"}]'::jsonb)$$, '23514', null, 'Missing SKU in the selected center is rejected');
select throws_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":9,"size":"M","source_operation_center_id":"d3000000-0000-0000-0000-000000000003"}]'::jsonb)$$, '23514', null, 'Insufficient selected stock rolls back the batch');
select throws_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"M","source_operation_center_id":"d3000000-0000-0000-0000-000000000002"}]'::jsonb)$$, '23503', null, 'A source center from another company is rejected');
select throws_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":5,"size":"M","source_operation_center_id":"d3000000-0000-0000-0000-000000000003"},{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":5,"size":"M","source_operation_center_id":"d3000000-0000-0000-0000-000000000003"}]'::jsonb)$$, '23514', null, 'Duplicate lines cannot overdraw the source');
select is((select count(*)::integer from public.dotation_delivery_transactions where company_id='d2000000-0000-0000-0000-000000000001'), 0, 'Rejected batches leave no transaction headers');
select is((select count(*)::integer from public.dotation_deliveries where company_id='d2000000-0000-0000-0000-000000000001'), 0, 'Rejected batches leave no delivery rows');
select is((select quantity_available from public.dotation_inventory where company_id='d2000000-0000-0000-0000-000000000001' and operation_center_id is not distinct from 'd3000000-0000-0000-0000-000000000003'::uuid), 8, 'Failed batches leave stock unchanged');
select throws_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"M"}]'::jsonb)$$, '23514', null, 'Legacy clients still validate employee center stock');
reset role;
update public.user_roles set role='rrhh' where user_id='d1000000-0000-0000-0000-000000000001';
insert into public.user_center_assignments (user_id, operation_center_id) values ('d1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001');
set local role authenticated;
select throws_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"M","source_operation_center_id":"d3000000-0000-0000-0000-000000000003"}]'::jsonb)$$, '42501', null, 'Restricted user cannot deduct from an unassigned center');
select throws_ok($$select public.create_dotation_delivery_batch('d5000000-0000-0000-0000-000000000001', '2026-09-25', '2027-01-25', 'Almacén', null, '[{"dotation_item_type_id":"d4000000-0000-0000-0000-000000000001","item_type":"otros","item_name":"CAMISA DE PRUEBA","quantity":2,"size":"M","source_operation_center_id":null}]'::jsonb)$$, '42501', null, 'Restricted user cannot deduct from General');
select * from finish();
rollback;
