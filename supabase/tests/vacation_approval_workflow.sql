begin;

select plan(31);

select has_column('public', 'vacation_requests', 'approval_stage', 'vacation requests expose the approval stage');
select has_column('public', 'vacation_requests', 'compensated_days', 'vacation requests store compensated days');
select is(
  (select count(*)::integer from public.permissions permission
   join public.modules module on module.id = permission.module_id
   where module.code in ('vac_approve_manager', 'vac_approve_area_leader', 'vac_visa_talent_leader') and permission.action = 'approve'),
  3,
  'report, approval and visa permissions exist'
);
select ok(not has_function_privilege('anon', 'public.create_vacation_request_workflow(jsonb)', 'EXECUTE'), 'anonymous users cannot submit requests');
select ok(not has_function_privilege('anon', 'public.decide_vacation_as_manager(uuid,boolean,boolean,uuid,text,date,text)', 'EXECUTE'), 'anonymous users cannot decide as manager');
select ok(not has_function_privilege('anon', 'public.visa_vacation_as_talent_leader(uuid,text)', 'EXECUTE'), 'anonymous users cannot register a talent visa');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'employee-vacation@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager-vacation@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leader-vacation@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'talent-vacation@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.companies (id, name, nit) values ('b2000000-0000-0000-0000-000000000001', 'Empresa vacaciones', '900000091');
insert into public.user_company_assignments (user_id, company_id) values
  ('b1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000001');

insert into public.employees_v2 (id, company_id, document_type, document_number, first_name, last_name, is_active, status) values
  ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'CC', '200000001', 'Elena', 'Solicitante', true, 'active'),
  ('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'CC', '200000002', 'Rafael', 'Reemplazo', true, 'active');

insert into public.employee_user_links (employee_id, user_id) values
  ('b3000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001');
insert into public.employee_work_info (employee_id, company_id, position_name, hire_date, is_current)
values ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'Analista', '2024-01-15', true);
insert into public.custom_roles (id, company_id, name) values
  ('b5000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'Jefe vacaciones'),
  ('b5000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'Lider vacaciones'),
  ('b5000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'Lider Talento Humano');
insert into public.role_permissions (role_id, permission_id)
select case module.code
  when 'vac_approve_manager' then 'b5000000-0000-0000-0000-000000000001'::uuid
  when 'vac_approve_area_leader' then 'b5000000-0000-0000-0000-000000000002'::uuid
  else 'b5000000-0000-0000-0000-000000000003'::uuid
end, permission.id
from public.permissions permission join public.modules module on module.id = permission.module_id
where module.code in ('vac_approve_manager', 'vac_approve_area_leader', 'vac_visa_talent_leader') and permission.action = 'approve';
insert into public.user_custom_roles (user_id, role_id) values
  ('b1000000-0000-0000-0000-000000000002', 'b5000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000003', 'b5000000-0000-0000-0000-000000000002'),
  ('b1000000-0000-0000-0000-000000000004', 'b5000000-0000-0000-0000-000000000003');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000001","email":"employee-vacation@example.com","role":"authenticated"}', true);
create temp table vacation_result as
select (public.create_vacation_request_workflow(jsonb_build_object(
  'employee_id', 'b3000000-0000-0000-0000-000000000001',
  'start_date', '2026-09-01', 'end_date', '2026-09-05',
  'enjoyment_days', 4, 'compensated_days', 1, 'notes', 'Solicitud de prueba'
))).id request_id;
reset role;

select is((select approval_stage from public.vacation_requests where id = (select request_id from vacation_result)), 'pending_manager', 'a new request starts with the manager');
select is((select total_requested_days from public.vacation_requests where id = (select request_id from vacation_result)), 5::numeric, 'the requested total is generated');
select is((select contract_start_date from public.vacation_requests where id = (select request_id from vacation_result)), '2024-01-15'::date, 'contract start is snapshotted');
select is((select sum(enjoyment_days + compensated_days) from public.vacation_request_allocations where request_id = (select request_id from vacation_result) and state = 'reserved'), 5::numeric, 'a pending request reserves its full balance');
select is((select sum(days_reserved) from public.vacation_balances where employee_id = 'b3000000-0000-0000-0000-000000000001'), 5::numeric, 'reserved days are excluded from availability');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000003","email":"leader-vacation@example.com","role":"authenticated"}', true);
select is((select count(*)::integer from public.vacation_requests where id = (select request_id from vacation_result)), 0, 'the leader cannot see a request before manager approval');
select throws_ok(
  format('select public.decide_vacation_as_area_leader(%L, true, 5, null)', (select request_id from vacation_result)),
  '22023', 'La solicitud aún no ha sido aprobada por el jefe inmediato.',
  'the leader cannot skip the manager stage'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000002","email":"manager-vacation@example.com","role":"authenticated"}', true);
select public.decide_vacation_as_manager(
  (select request_id from vacation_result), true, false,
  'b3000000-0000-0000-0000-000000000002', 'Entregar informe mensual', '2026-09-06', null
);
reset role;

select is((select approval_stage from public.vacation_requests where id = (select request_id from vacation_result)), 'pending_area_leader', 'manager report advances exactly one stage');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000004","email":"talent-vacation@example.com","role":"authenticated"}', true);
select is((select count(*)::integer from public.vacation_requests where id = (select request_id from vacation_result)), 0, 'talent cannot see a request before final approval');
select throws_ok(
  format('select public.visa_vacation_as_talent_leader(%L, null)', (select request_id from vacation_result)),
  '22023', 'La solicitud debe estar aprobada por el líder de área antes del visado.',
  'talent cannot visa before final approval'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000003","email":"leader-vacation@example.com","role":"authenticated"}', true);
select is((select count(*)::integer from public.vacation_requests where id = (select request_id from vacation_result)), 1, 'the request becomes visible to the leader after manager approval');
select public.decide_vacation_as_area_leader((select request_id from vacation_result), true, 5, null);
reset role;

select is((select approval_stage from public.vacation_requests where id = (select request_id from vacation_result)), 'pending_talent_leader_visa', 'leader approval leaves only the subsequent visa pending');
select is((select status::text from public.vacation_requests where id = (select request_id from vacation_result)), 'aprobado', 'leader approval activates the operational status');
select is((select sum(days_taken) from public.vacation_balances where employee_id = 'b3000000-0000-0000-0000-000000000001'), 4::numeric, 'final approval deducts enjoyment exactly once');
select is((select sum(days_reserved) from public.vacation_balances where employee_id = 'b3000000-0000-0000-0000-000000000001'), 0::numeric, 'final approval clears the reservation');
select is((select count(*)::integer from public.vacation_request_allocations where request_id = (select request_id from vacation_result) and state = 'consumed'), 1, 'the allocation is consumed exactly once');
select is((select approved_by from public.vacation_requests where id = (select request_id from vacation_result)), 'b1000000-0000-0000-0000-000000000003'::uuid, 'the area leader remains the final approver');
update public.vacation_requests set status = 'en_curso' where id = (select request_id from vacation_result);
select is((select status::text from public.vacation_requests where id = (select request_id from vacation_result)), 'en_curso', 'operational lifecycle can start while the visa remains pending');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000004","email":"talent-vacation@example.com","role":"authenticated"}', true);
select is((select count(*)::integer from public.vacation_requests where id = (select request_id from vacation_result)), 1, 'the approved request becomes visible to talent for visa');
select public.visa_vacation_as_talent_leader((select request_id from vacation_result), 'Documentación revisada');
reset role;

select is((select approval_stage from public.vacation_requests where id = (select request_id from vacation_result)), 'approved', 'the visa completes the approval line');
select is((select talent_leader_visa_by from public.vacation_requests where id = (select request_id from vacation_result)), 'b1000000-0000-0000-0000-000000000004'::uuid, 'the talent leader visa is recorded separately');
select is((select approved_by from public.vacation_requests where id = (select request_id from vacation_result)), 'b1000000-0000-0000-0000-000000000003'::uuid, 'the visa does not replace the final approver');
select is((select status::text from public.vacation_requests where id = (select request_id from vacation_result)), 'en_curso', 'the visa does not change the operational status');
select is((select sum(days_taken) from public.vacation_balances where employee_id = 'b3000000-0000-0000-0000-000000000001'), 4::numeric, 'the visa does not deduct balances again');
select is((select count(*)::integer from public.audit_logs where entity_id = (select request_id from vacation_result)), 4, 'creation, report, approval and visa are audited');

select * from finish();
rollback;
