begin;

select plan(16);

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

create temporary table document_cycle_fixture as
select
  gen_random_uuid() as company_id,
  gen_random_uuid() as employee_id,
  gen_random_uuid() as cycle_id,
  gen_random_uuid() as document_id;

insert into public.companies (id, name, nit)
select company_id, 'Document cycle test', 'DOC-CYCLE-' || company_id::text
from document_cycle_fixture;

insert into public.employees_v2 (id, company_id, document_number, first_name, last_name)
select employee_id, company_id, 'DOC-' || employee_id::text, 'Test', 'Document'
from document_cycle_fixture;

insert into public.employee_employment_cycles (
  id, company_id, employee_id, cycle_number, status, source, start_date
)
select cycle_id, company_id, employee_id, 1, 'active', 'manual', current_date - 30
from document_cycle_fixture;

insert into public.employee_documents (
  id, company_id, employee_id, document_type, file_url, upload_date, is_valid
)
select document_id, company_id, employee_id, 'otro', 'tests/document.pdf', current_date, true
from document_cycle_fixture;

select is(
  (select employment_cycle_id from public.employee_documents where id = (select document_id from document_cycle_fixture)),
  (select cycle_id from document_cycle_fixture),
  'new employee documents inherit the matching employment cycle'
);

select * from finish();
rollback;
