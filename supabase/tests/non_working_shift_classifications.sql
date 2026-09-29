begin;

select plan(11);

select has_column('public', 'shifts', 'is_not_worked_day', 'shifts supports not-worked days');
select has_column('public', 'shifts', 'is_suspension_day', 'shifts supports suspension days');

insert into public.companies (id, name, nit)
values ('5e200000-0000-0000-0000-000000000001', 'Empresa clasificación turnos', '900000096');

insert into public.shifts (
  id, company_id, name, start_time, end_time, break_minutes, crosses_midnight, is_not_worked_day
) values (
  '5e500000-0000-0000-0000-000000000001', '5e200000-0000-0000-0000-000000000001',
  'No trabajado', '06:00', '14:00', 30, true, true
);

insert into public.shifts (
  id, company_id, name, start_time, end_time, break_minutes, crosses_midnight, is_suspension_day
) values (
  '5e500000-0000-0000-0000-000000000002', '5e200000-0000-0000-0000-000000000001',
  'Suspensión', '08:00', '17:00', 60, true, true
);

select is((select start_time::text from public.shifts where id = '5e500000-0000-0000-0000-000000000001'), '00:00:00', 'not-worked start time is normalized');
select is((select end_time::text from public.shifts where id = '5e500000-0000-0000-0000-000000000001'), '00:00:00', 'not-worked end time is normalized');
select is((select break_minutes from public.shifts where id = '5e500000-0000-0000-0000-000000000001'), 0, 'not-worked break is normalized');
select is((select crosses_midnight from public.shifts where id = '5e500000-0000-0000-0000-000000000001'), false, 'not-worked midnight flag is normalized');
select is((select start_time::text from public.shifts where id = '5e500000-0000-0000-0000-000000000002'), '00:00:00', 'suspension start time is normalized');
select is((select end_time::text from public.shifts where id = '5e500000-0000-0000-0000-000000000002'), '00:00:00', 'suspension end time is normalized');
select is((select break_minutes from public.shifts where id = '5e500000-0000-0000-0000-000000000002'), 0, 'suspension break is normalized');
select is((select crosses_midnight from public.shifts where id = '5e500000-0000-0000-0000-000000000002'), false, 'suspension midnight flag is normalized');

select throws_ok(
  $$insert into public.shifts (
      company_id, name, start_time, end_time, is_rest_day, is_not_worked_day
    ) values (
      '5e200000-0000-0000-0000-000000000001', 'Inválido', '00:00', '00:00', true, true
    )$$,
  '23514',
  null,
  'a shift cannot have multiple non-working classifications'
);

select * from finish();
rollback;
