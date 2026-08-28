begin;

select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scoped-absence@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.companies (id, name, nit)
values ('c2000000-0000-0000-0000-000000000001', 'Empresa alcance ausencias', '900000092');

insert into public.operation_centers (id, company_id, name, code) values
  ('c3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'Centro permitido', 'CP'),
  ('c3000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'Centro bloqueado', 'CB');

insert into public.user_company_assignments (user_id, company_id)
values ('c1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001');

insert into public.user_roles (user_id, role)
values ('c1000000-0000-0000-0000-000000000001', 'admin');

insert into public.user_center_assignments (user_id, operation_center_id)
values ('c1000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name, is_active, status
) values
  ('c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'CC', '300000001', 'Ana', 'Permitida', true, 'active'),
  ('c4000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'CC', '300000002', 'Beto', 'Bloqueado', true, 'active');

insert into public.employee_work_info (
  employee_id, company_id, operation_center_id, position_name, hire_date, is_current
) values
  ('c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'Analista', '2025-01-01', true),
  ('c4000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002', 'Analista', '2025-01-01', true);

insert into public.vacation_balances (
  id, employee_id, company_id, period_start, period_end, days_accrued
) values
  ('c5000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', '2025-01-01', '2025-12-31', 15),
  ('c5000000-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', '2025-01-01', '2025-12-31', 15);

insert into public.leave_balances (
  id, employee_id, company_id, leave_type, year, entitled_days
) values
  ('c6000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'permiso_personal', 2026, 5),
  ('c6000000-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'permiso_personal', 2026, 5);

select set_config('app.vacation_workflow_rpc', 'on', true);
select set_config('app.leave_workflow_rpc', 'on', true);

insert into public.vacation_requests (
  id, employee_id, company_id, status, start_date, end_date,
  business_days, calendar_days, enjoyment_days, approval_stage
) values
  ('c7000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'aprobado', '2026-09-01', '2026-09-02', 2, 2, 2, 'approved'),
  ('c7000000-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'aprobado', '2026-09-03', '2026-09-04', 2, 2, 2, 'approved');

insert into public.leave_requests (
  id, employee_id, company_id, leave_type, start_date, end_date,
  total_days, reason, status, approval_stage
) values
  ('c8000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'permiso_personal', '2026-10-01', '2026-10-01', 1, 'Diligencia', 'aprobado', 'approved'),
  ('c8000000-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'permiso_personal', '2026-10-02', '2026-10-02', 1, 'Diligencia', 'aprobado', 'approved');

-- Reproduce the historical shape that broke company synchronization: an
-- older empty legacy row alongside the keyed automatic row for one period.
alter table public.vacation_balances disable trigger skip_redundant_initial_vacation_balance;
insert into public.vacation_balances (
  id, employee_id, company_id, employment_cycle_id, period_start, period_end,
  days_accrued, created_at, notes
)
select
  'c5000000-0000-0000-0000-000000000004', cycle.employee_id, cycle.company_id,
  cycle.id, cycle.start_date, (cycle.start_date + interval '1 year - 1 day')::date,
  0, '2020-01-01 00:00:00+00', 'Duplicado histórico para regresión'
from public.employee_employment_cycles cycle
where cycle.employee_id = 'c4000000-0000-0000-0000-000000000001'
  and cycle.status = 'active';
alter table public.vacation_balances enable trigger skip_redundant_initial_vacation_balance;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000001","email":"scoped-absence@example.com","role":"authenticated"}',
  true
);

select ok(
  public.can_access_absence_employee('c4000000-0000-0000-0000-000000000001'),
  'the assigned center grants employee access'
);
select ok(
  not public.can_access_absence_employee('c4000000-0000-0000-0000-000000000002'),
  'an unassigned center denies employee access'
);
select is(
  (select count(*)::integer from public.vacation_requests), 1,
  'vacation requests are limited to assigned centers'
);
select is(
  (select count(distinct employee_id)::integer from public.vacation_balances), 1,
  'vacation balances are limited to assigned centers'
);
select is(
  (select count(*)::integer from public.leave_requests), 1,
  'leave requests are limited to assigned centers'
);
select is(
  (select count(*)::integer from public.leave_balances), 1,
  'leave balances are limited to assigned centers'
);
select lives_ok(
  $$select public.sync_employee_vacation_balances('c4000000-0000-0000-0000-000000000001', current_date)$$,
  'vacation synchronization tolerates a historical duplicate in an assigned center'
);
select is(
  (
    select count(*)::integer
    from public.vacation_balances balance
    join public.employee_employment_cycles cycle on cycle.id = balance.employment_cycle_id
    where cycle.employee_id = 'c4000000-0000-0000-0000-000000000001'
      and balance.period_start = cycle.start_date
      and balance.automatic_period_key is not null
  ),
  1,
  'synchronization keeps one keyed automatic balance for the current period'
);
select throws_ok(
  $$select public.sync_employee_vacation_balances('c4000000-0000-0000-0000-000000000002', current_date)$$,
  '42501',
  'No tienes acceso al centro de operación de este empleado.',
  'privileged vacation synchronization cannot bypass center scope'
);
select throws_ok(
  $$select public.cancel_leave_request_workflow('c8000000-0000-0000-0000-000000000002', 'Prueba de alcance')$$,
  '42501',
  'No tienes acceso al centro de operación de este empleado.',
  'privileged leave workflows cannot bypass center scope'
);
select is(
  (public.sync_company_vacation_balances('c2000000-0000-0000-0000-000000000001', current_date)->>'employees_synced')::integer,
  1,
  'company synchronization only processes employees in assigned centers'
);
select throws_ok(
  $$insert into public.vacation_balances (
      id, employee_id, company_id, period_start, period_end, days_accrued
    ) values (
      'c5000000-0000-0000-0000-000000000003',
      'c4000000-0000-0000-0000-000000000002',
      'c2000000-0000-0000-0000-000000000001',
      '2027-01-01', '2027-12-31', 15
    )$$,
  '42501',
  'No tienes acceso al centro de operación de este empleado.',
  'direct vacation balance writes cannot target an unassigned center'
);
select throws_ok(
  $$insert into public.leave_balances (
      id, employee_id, company_id, leave_type, year, entitled_days
    ) values (
      'c6000000-0000-0000-0000-000000000003',
      'c4000000-0000-0000-0000-000000000002',
      'c2000000-0000-0000-0000-000000000001',
      'permiso_personal', 2027, 5
    )$$,
  '42501',
  'No tienes acceso al centro de operación de este empleado.',
  'direct leave balance writes cannot target an unassigned center'
);
select throws_ok(
  $$select public.adjust_vacation_balance(
      'c4000000-0000-0000-0000-000000000002', 1, 'Prueba de alcance', current_date,
      'c9000000-0000-0000-0000-000000000001'
    )$$,
  '42501',
  'No tienes acceso al centro de operación de este empleado.',
  'vacation balance adjustments cannot bypass center scope'
);
select throws_ok(
  $$select public.create_vacation_request_workflow(
      '{"employee_id":"c4000000-0000-0000-0000-000000000002"}'::jsonb
    )$$,
  '42501',
  'No tienes acceso al centro de operación de este empleado.',
  'vacation creation workflows cannot bypass center scope'
);
select throws_ok(
  $$select public.decide_vacation_as_manager(
      'c7000000-0000-0000-0000-000000000002', true, false, null,
      'Sin pendientes', '2026-09-05', null
    )$$,
  '42501',
  'No tienes acceso al centro de operación de este empleado.',
  'vacation approval workflows cannot bypass center scope'
);
select throws_ok(
  $$select public.decide_leave_as_manager(
      'c8000000-0000-0000-0000-000000000002', true, null, null
    )$$,
  '42501',
  'No tienes acceso al centro de operación de este empleado.',
  'leave approval workflows cannot bypass center scope'
);

reset role;
delete from public.user_center_assignments
where user_id = 'c1000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000001","email":"scoped-absence@example.com","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from public.vacation_requests), 2,
  'no center assignments preserves full company vacation scope'
);
select is(
  (select count(*)::integer from public.leave_requests), 2,
  'no center assignments preserves full company leave scope'
);

select * from finish();
rollback;
