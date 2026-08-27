begin;

select plan(8);

select is(
  (
    select parent.code
    from public.modules child
    join public.modules parent on parent.id = child.parent_id
    where child.code = 'leave_type_configuration'
  ),
  'permisos',
  'leave type configuration is a child permission of the leave module'
);

select is(
  (
    select count(*)::integer
    from public.permissions permission
    join public.modules module on module.id = permission.module_id
    where module.code = 'leave_type_configuration'
      and permission.action = 'update'
  ),
  1,
  'the access matrix exposes one dedicated configuration permission'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'e1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'leave-config@example.com', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.companies (id, name, nit)
values ('e2000000-0000-0000-0000-000000000001', 'Empresa configuración permisos', '900000094');

insert into public.user_company_assignments (user_id, company_id)
values ('e1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001');

insert into public.custom_roles (id, company_id, name, description)
values (
  'e3000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  'Configurador de permisos',
  'Rol de prueba para configurar tipos de permisos'
);

insert into public.user_custom_roles (user_id, role_id)
values ('e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001');

select ok(
  exists (
    select 1
    from public.custom_roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    join public.modules module on module.id = permission.module_id
    where role.company_id = 'e2000000-0000-0000-0000-000000000001'
      and role.is_system
      and module.code = 'leave_type_configuration'
      and permission.action = 'update'
  ),
  'new system Administrator roles receive the configuration permission'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-0000-0000-000000000001","email":"leave-config@example.com","role":"authenticated"}',
  true
);

select throws_ok(
  $$insert into public.leave_type_config (company_id, leave_type, display_name)
    values ('e2000000-0000-0000-0000-000000000001', 'prueba_configuracion', 'Prueba configuración')$$,
  '42501',
  'new row violates row-level security policy for table "leave_type_config"',
  'ordinary leave permissions do not grant configuration access'
);

reset role;

insert into public.role_permissions (role_id, permission_id)
select 'e3000000-0000-0000-0000-000000000001', permission.id
from public.permissions permission
join public.modules module on module.id = permission.module_id
where module.code = 'leave_type_configuration'
  and permission.action = 'update';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-0000-0000-000000000001","email":"leave-config@example.com","role":"authenticated"}',
  true
);

select ok(
  public.check_user_permission(
    'e1000000-0000-0000-0000-000000000001',
    'leave_type_configuration',
    'update'
  ),
  'the dedicated permission is effective for the assigned role'
);

select lives_ok(
  $$insert into public.leave_type_config (company_id, leave_type, display_name)
    values ('e2000000-0000-0000-0000-000000000001', 'prueba_configuracion', 'Prueba configuración')$$,
  'the dedicated permission allows creating leave types'
);

select lives_ok(
  $$update public.leave_type_config
    set display_name = 'Prueba modificada'
    where company_id = 'e2000000-0000-0000-0000-000000000001'
      and leave_type = 'prueba_configuracion'$$,
  'the dedicated permission allows updating leave types'
);

select lives_ok(
  $$delete from public.leave_type_config
    where company_id = 'e2000000-0000-0000-0000-000000000001'
      and leave_type = 'prueba_configuracion'$$,
  'the dedicated permission allows deleting unused leave types'
);

select * from finish();
rollback;
