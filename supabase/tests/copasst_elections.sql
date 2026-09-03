begin;

select plan(25);

select has_table('public', 'copasst_elections', 'COPASST elections table exists');
select has_table('public', 'copasst_candidates', 'COPASST candidates table exists');
select has_table('public', 'copasst_electorate', 'COPASST frozen electorate table exists');
select has_table('public', 'copasst_ballots', 'anonymous ballots table exists');
select has_table('public', 'copasst_winners', 'winners table exists');
select has_table('public', 'copasst_access_attempts', 'hashed access-attempt table exists');

select is(
  (select count(*)::integer from public.permissions permission
   join public.modules module on module.id = permission.module_id
   where module.code in ('copasst_elecciones', 'copasst_cumplimiento', 'analitica_copasst')),
  15,
  'the three COPASST pages expose independent five-action permission sets'
);
select ok(not has_table_privilege('anon', 'public.copasst_ballots', 'SELECT'), 'anonymous users cannot read ballots');
select ok(not has_table_privilege('authenticated', 'public.copasst_ballots', 'SELECT'), 'authenticated users cannot read ballots directly');
select ok(has_function_privilege('anon', 'public.get_copasst_ballot(text)', 'EXECUTE'), 'anonymous users can load a public ballot');
select ok(has_function_privilege('anon', 'public.verify_copasst_voter(text,text)', 'EXECUTE'), 'anonymous users can verify census eligibility');
select ok(has_function_privilege('anon', 'public.cast_copasst_vote(text,text,uuid,boolean)', 'EXECUTE'), 'anonymous users can cast a vote through the transactional RPC');
select ok(not has_function_privilege('anon', 'public.get_copasst_compliance(uuid)', 'EXECUTE'), 'anonymous users cannot request compliance identities');
select hasnt_column('public', 'copasst_ballots', 'employee_id', 'ballots do not store an employee');
select hasnt_column('public', 'copasst_ballots', 'document_number', 'ballots do not store a document');
select hasnt_column('public', 'copasst_ballots', 'created_at', 'ballots have no correlatable timestamp');
select ok(
  position('America/Bogota' in pg_get_functiondef('private.get_copasst_analytics_impl(uuid)'::regprocedure)) > 0,
  'COPASST analytics groups participation using the Bogota timezone'
);
select is(
  date_trunc('day', '2026-09-03 23:30:00-05'::timestamptz, 'America/Bogota'),
  '2026-09-03 05:00:00+00'::timestamptz,
  'a late-night vote remains in its Bogota calendar day'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'copasst-test@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.companies (id, name, nit)
values ('b2000000-0000-0000-0000-000000000001', 'Empresa COPASST', '900000091');

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name, is_active, status, avatar_url
) values
  ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'CC', '100000091', 'Ana', 'Candidata', true, 'active', 'https://example.test/ana.jpg'),
  ('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'CC', '100000092', 'Beto', 'Elector', true, 'active', null);

insert into public.copasst_elections (
  id, company_id, title, term_label, seats, starts_at, ends_at, status, public_token, published_at, published_by, created_by
) values (
  'b4000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001',
  'Elección de prueba', '2026-2028', 1, now() - interval '1 hour', now() + interval '1 hour',
  'published', 'copasst-test-token', now(), 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'
);
insert into public.copasst_candidates (
  id, election_id, company_id, employee_id, ballot_order, display_name, photo_url
) values (
  'b5000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 1, 'Ana Candidata', 'https://example.test/ana.jpg'
);
insert into public.copasst_electorate (
  election_id, company_id, employee_id, document_number, display_name, gender
) values
  ('b4000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', '100000091', 'Ana Candidata', 'F'),
  ('b4000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000002', '100000092', 'Beto Elector', 'M');

set local role anon;
select ok((public.get_copasst_ballot('copasst-test-token') ->> 'valid')::boolean, 'valid public token loads the ballot');
select ok(not (public.verify_copasst_voter('copasst-test-token', '999999999') ->> 'eligible')::boolean, 'unknown documents receive a generic ineligible response');
select ok((public.cast_copasst_vote('copasst-test-token', '100000092', 'b5000000-0000-0000-0000-000000000001', false) ->> 'success')::boolean, 'eligible employee casts one vote');
select throws_ok(
  $$ select public.cast_copasst_vote('copasst-test-token', '100000092', 'b5000000-0000-0000-0000-000000000001', false) $$,
  'P0001', 'Este documento ya registró su participación', 'a repeated vote is rejected'
);
reset role;

select is((select count(*)::integer from public.copasst_ballots where election_id = 'b4000000-0000-0000-0000-000000000001'), 1, 'exactly one anonymous ballot exists');
select is(
  (select count(*)::integer from public.copasst_ballots where election_id = 'b4000000-0000-0000-0000-000000000001'),
  (select count(*)::integer from public.copasst_electorate where election_id = 'b4000000-0000-0000-0000-000000000001' and voted_at is not null),
  'ballot and participant totals remain equal'
);
update public.copasst_elections set ends_at = now() - interval '1 minute'
where id = 'b4000000-0000-0000-0000-000000000001';
select is(
  jsonb_array_length(public.get_copasst_ballot('copasst-test-token') -> 'results' -> 'winners'),
  1,
  'date-based closure exposes automatic winners without a manual close'
);

select * from finish();
rollback;
