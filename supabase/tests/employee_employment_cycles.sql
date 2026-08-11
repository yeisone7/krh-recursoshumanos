begin;

select plan(15);

select has_table('public', 'employee_employment_cycles', 'employment cycles table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.employee_employment_cycles'::regclass),
  'employment cycles have RLS enabled'
);

select has_column('public', 'candidates', 'rehire_employee_id', 'candidates identify rehire applications');
select has_column('public', 'contracts', 'employment_cycle_id', 'contracts are scoped by cycle');
select has_column('public', 'employee_terminations', 'employment_cycle_id', 'terminations are scoped by cycle');
select has_column('public', 'employee_documents', 'employment_cycle_id', 'employee documents are scoped by cycle');
select has_column('public', 'vacation_balances', 'employment_cycle_id', 'vacation balances are scoped by cycle');
select has_column('public', 'leave_balances', 'employment_cycle_id', 'leave balances are scoped by cycle');

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'employee_employment_cycles'
      and indexname = 'employee_employment_cycles_one_active_idx'
      and indexdef ilike '%where (status = ''active''%'
  ),
  'only one active cycle is enforced per employee'
);

select ok(to_regprocedure('public.start_employee_rehire(uuid,uuid)') is not null, 'typed rehire operation exists');
select ok(to_regprocedure('public.complete_candidate_hiring(uuid,jsonb)') is not null, 'typed hiring operation exists');
select ok(
  not (select prosecdef from pg_proc where oid = 'public.complete_candidate_hiring(uuid,jsonb)'::regprocedure),
  'public hiring operation is security invoker'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.start_employee_rehire(uuid,uuid)'::regprocedure),
  'rehire operation is security invoker'
);
select ok(
  has_function_privilege('anon', 'public.submit_employee_rehire_registration(text,jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.start_employee_rehire(uuid,uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.has_employee_v2_access(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.complete_candidate_hiring(uuid,jsonb)', 'EXECUTE'),
  'public registration has minimal execution grants'
);

select is(
  (
    select count(*)::bigint
    from public.employee_employment_cycles cycle
    left join public.employees_v2 employee on employee.id = cycle.employee_id
    where employee.id is null
  ),
  0::bigint,
  'backfill creates no orphan employment cycles'
);

select * from finish();
rollback;
