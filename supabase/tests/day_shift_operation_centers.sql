begin;

select plan(13);

select has_table('public', 'shift_operation_centers', 'day shift center scope table exists');
select has_function(
  'public',
  'sync_shift_operation_centers',
  array['uuid', 'uuid[]'],
  'transactional center synchronization function exists'
);
select trigger_is(
  'public',
  'employee_shift_assignments',
  'validate_day_shift_employee_center_before_write',
  'public',
  'validate_day_shift_employee_center',
  'day shift assignments enforce employee center eligibility'
);

insert into public.companies (id, name, nit)
values ('5d200000-0000-0000-0000-000000000001', 'Empresa turnos centro', '900000095');

insert into public.operation_centers (id, company_id, name, code) values
  ('5d300000-0000-0000-0000-000000000001', '5d200000-0000-0000-0000-000000000001', 'Centro A', 'SHIFT-A'),
  ('5d300000-0000-0000-0000-000000000002', '5d200000-0000-0000-0000-000000000001', 'Centro B', 'SHIFT-B');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name, is_active, status
) values
  ('5d400000-0000-0000-0000-000000000001', '5d200000-0000-0000-0000-000000000001', 'CC', '950000001', 'Ana', 'Centro A', true, 'active'),
  ('5d400000-0000-0000-0000-000000000002', '5d200000-0000-0000-0000-000000000001', 'CC', '950000002', 'Beto', 'Centro B', true, 'active');

insert into public.employee_work_info (
  employee_id, company_id, operation_center_id, position_name, hire_date, is_current
) values
  ('5d400000-0000-0000-0000-000000000001', '5d200000-0000-0000-0000-000000000001', '5d300000-0000-0000-0000-000000000001', 'Analista', date '2026-01-01', true),
  ('5d400000-0000-0000-0000-000000000002', '5d200000-0000-0000-0000-000000000001', '5d300000-0000-0000-0000-000000000002', 'Analista', date '2026-01-01', true);

insert into public.shifts (
  id, company_id, name, code, start_time, end_time, kind
) values
  ('5d500000-0000-0000-0000-000000000001', '5d200000-0000-0000-0000-000000000001', 'Global', 'GLB', '06:00', '14:00', 'day'),
  ('5d500000-0000-0000-0000-000000000002', '5d200000-0000-0000-0000-000000000001', 'Centro A', 'CTA', '06:00', '14:00', 'day'),
  ('5d500000-0000-0000-0000-000000000003', '5d200000-0000-0000-0000-000000000001', 'Centro B', 'CTB', '14:00', '22:00', 'day'),
  ('5d500000-0000-0000-0000-000000000004', '5d200000-0000-0000-0000-000000000001', 'Operativo', 'OPE', '06:00', '14:00', 'operational');

select lives_ok(
  $$select public.sync_shift_operation_centers(
      '5d500000-0000-0000-0000-000000000002',
      array['5d300000-0000-0000-0000-000000000001'::uuid]
    )$$,
  'a day shift can be scoped to one center'
);
select lives_ok(
  $$select public.sync_shift_operation_centers(
      '5d500000-0000-0000-0000-000000000003',
      array['5d300000-0000-0000-0000-000000000001'::uuid, '5d300000-0000-0000-0000-000000000002'::uuid]
    )$$,
  'a day shift can be scoped to multiple centers'
);
select is(
  (select count(*)::integer from public.shift_operation_centers where shift_id = '5d500000-0000-0000-0000-000000000003'),
  2,
  'multiple center associations are stored without a backfill'
);
select lives_ok(
  $$insert into public.employee_shift_assignments (
      employee_id, shift_id, company_id, assignment_date
    ) values (
      '5d400000-0000-0000-0000-000000000001',
      '5d500000-0000-0000-0000-000000000002',
      '5d200000-0000-0000-0000-000000000001', date '2026-09-01'
    )$$,
  'a scoped day shift accepts an employee with a matching primary center'
);
select throws_ok(
  $$insert into public.employee_shift_assignments (
      employee_id, shift_id, company_id, assignment_date
    ) values (
      '5d400000-0000-0000-0000-000000000002',
      '5d500000-0000-0000-0000-000000000002',
      '5d200000-0000-0000-0000-000000000001', date '2026-09-01'
    )$$,
  'P0001',
  'El Turno Dia no esta habilitado para los centros activos del empleado',
  'a direct database write rejects a center-incompatible day shift'
);
select lives_ok(
  $$insert into public.employee_shift_assignments (
      employee_id, shift_id, company_id, assignment_date
    ) values (
      '5d400000-0000-0000-0000-000000000002',
      '5d500000-0000-0000-0000-000000000001',
      '5d200000-0000-0000-0000-000000000001', date '2026-09-02'
    )$$,
  'a global day shift accepts an employee from any center'
);
select lives_ok(
  $$insert into public.employee_shift_assignments (
      employee_id, shift_id, company_id, assignment_date
    ) values (
      '5d400000-0000-0000-0000-000000000002',
      '5d500000-0000-0000-0000-000000000004',
      '5d200000-0000-0000-0000-000000000001', date '2026-09-03'
    )$$,
  'operational cycle shifts remain exempt from center validation'
);

insert into public.employee_operation_center_assignments (
  employee_id, company_id, operation_center_id, employment_cycle_id
)
select
  '5d400000-0000-0000-0000-000000000002',
  '5d200000-0000-0000-0000-000000000001',
  '5d300000-0000-0000-0000-000000000001',
  cycle.id
from public.employee_employment_cycles cycle
where cycle.employee_id = '5d400000-0000-0000-0000-000000000002'
  and cycle.status = 'active'
on conflict do nothing;

select lives_ok(
  $$insert into public.employee_shift_assignments (
      employee_id, shift_id, company_id, assignment_date
    ) values (
      '5d400000-0000-0000-0000-000000000002',
      '5d500000-0000-0000-0000-000000000002',
      '5d200000-0000-0000-0000-000000000001', date '2026-09-04'
    )$$,
  'an additional active center makes the employee eligible'
);
select lives_ok(
  $$select public.sync_shift_operation_centers(
      '5d500000-0000-0000-0000-000000000002', '{}'::uuid[]
    )$$,
  'an empty center list makes a day shift global'
);
select is(
  (select count(*)::integer from public.shift_operation_centers where shift_id = '5d500000-0000-0000-0000-000000000002'),
  0,
  'global shifts are represented by zero center associations'
);

select * from finish();
rollback;
