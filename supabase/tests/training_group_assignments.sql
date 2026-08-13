begin;

select plan(19);

select has_table('public', 'training_group_assignments', 'group assignments table exists');
select has_table('public', 'training_group_participants', 'group participants table exists');
select is(
  (select count(*)::integer from public.permissions permission
   join public.modules module on module.id = permission.module_id
   where module.code = 'capacitaciones_grupos'),
  5,
  'the group module exposes five permissions'
);
select ok(
  not has_function_privilege('anon', 'public.create_training_group_assignment(jsonb)', 'EXECUTE'),
  'anonymous users cannot create group assignments'
);
select ok(
  has_function_privilege('anon', 'public.verify_training_group_participant(text,text)', 'EXECUTE'),
  'the participant verification function is publicly callable'
);
select ok(
  has_function_privilege('anon', 'public.resolve_training_group_token(text)', 'EXECUTE'),
  'the public route can identify group tokens without exposing group data tables'
);
select ok(
  has_function_privilege('authenticated', 'public.get_training_group_compliance(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.get_training_group_compliance(uuid)', 'EXECUTE'),
  'only authenticated users can request group compliance'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'group-denied@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'group-manager@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.companies (id, name, nit)
values ('a2000000-0000-0000-0000-000000000001', 'Empresa capacitaciones grupales', '900000082');

insert into public.user_company_assignments (user_id, company_id) values
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001');

insert into public.training_courses (id, company_id, name, category, status, is_active)
values ('a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Induccion grupal', 'Induccion', 'publicado', true);

insert into public.employees_v2 (
  id, company_id, document_type, document_number, first_name, last_name, is_active, status
) values
  ('a4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'CC', '100000001', 'Ana', 'Grupo', true, 'active'),
  ('a4000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'CC', '100000002', 'Beto', 'Grupo', true, 'active'),
  ('a4000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'CC', '100000003', 'Cata', 'Externa', true, 'active');

insert into public.training_completions (
  id, company_id, course_id, employee_id, operator_name, operator_cedula, signature_data, quiz_score
) values (
  'a5000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001',
  'Ana Grupo', '100000001', 'data:image/png;base64,test', 100
);

insert into public.custom_roles (id, company_id, name)
values ('a6000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Gestor de grupos');

insert into public.role_permissions (role_id, permission_id)
select 'a6000000-0000-0000-0000-000000000001', permission.id
from public.permissions permission
join public.modules module on module.id = permission.module_id
where module.code = 'capacitaciones_grupos'
  and permission.action in ('view', 'create', 'update', 'delete', 'export');

insert into public.user_custom_roles (user_id, role_id)
values ('a1000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","email":"group-denied@example.com","role":"authenticated"}', true);

select throws_ok(
  $$ select public.create_training_group_assignment('{"company_id":"a2000000-0000-0000-0000-000000000001"}'::jsonb) $$,
  'P0001',
  'No tiene permisos para crear capacitaciones por grupo',
  'a company member without the explicit permission cannot create a group'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000002","email":"group-manager@example.com","role":"authenticated"}', true);

create temp table group_result as
select public.create_training_group_assignment(jsonb_build_object(
  'company_id', 'a2000000-0000-0000-0000-000000000001',
  'course_id', 'a3000000-0000-0000-0000-000000000001',
  'name', 'Supervisores agosto',
  'expires_at', now() + interval '30 days',
  'requires_evaluation', true,
  'employee_ids', jsonb_build_array(
    'a4000000-0000-0000-0000-000000000001',
    'a4000000-0000-0000-0000-000000000002'
  )
)) result;

reset role;

select is((select count(*)::bigint from public.training_group_assignments), 1::bigint, 'creation inserts exactly one assignment');
select is((select count(*)::bigint from public.training_group_participants), 2::bigint, 'creation inserts the selected participants only');
select is(
  (select completion_id from public.training_group_participants where employee_id = 'a4000000-0000-0000-0000-000000000001'),
  'a5000000-0000-0000-0000-000000000001'::uuid,
  'a prior completion is linked immediately'
);
select is(
  (select count(*)::bigint from public.verify_training_group_participant(
    (select result ->> 'token' from group_result), '100000003'
  )),
  0::bigint,
  'an employee outside the selected group cannot validate access'
);
select is(
  (select count(*)::bigint from public.verify_training_group_participant(
    (select result ->> 'token' from group_result), '100000002'
  )),
  1::bigint,
  'an active selected employee can validate access'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000002","email":"group-manager@example.com","role":"authenticated"}', true);
select public.delete_training_group_link((select (result ->> 'assignment_id')::uuid from group_result));
reset role;

select is((select count(*)::bigint from public.training_group_assignments), 1::bigint, 'deleting the link preserves the assignment');
select is((select count(*)::bigint from public.training_group_participants), 2::bigint, 'deleting the link preserves participants');
select is((select count(*)::bigint from public.training_completions), 1::bigint, 'deleting the link preserves completion evidence');
select is((select token_id from public.training_group_assignments), null::uuid, 'deleting the link leaves the assignment without a token');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000002","email":"group-manager@example.com","role":"authenticated"}', true);
select public.regenerate_training_group_link(
  (select (result ->> 'assignment_id')::uuid from group_result),
  now() + interval '45 days'
);
reset role;

select is((select count(*)::bigint from public.training_access_tokens), 1::bigint, 'regeneration creates exactly one current link');
select isnt((select token_id from public.training_group_assignments), null::uuid, 'regeneration attaches the new link');

select * from finish();
rollback;
