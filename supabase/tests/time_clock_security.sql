begin;

select plan(8);

select ok(exists(select 1 from public.modules where code = 'reloj_checador' and is_active),
  'time clock module is registered');

select is((select count(*)::integer from public.permissions permission
  join public.modules module on module.id = permission.module_id
  where module.code = 'reloj_checador'), 6, 'all granular permissions are registered');

select is(round(public.time_clock_distance_m(4.7110, -74.0721, 4.7110, -74.0721))::integer, 0,
  'equal coordinates have zero distance');

select ok(public.time_clock_distance_m(4.7110, -74.0721, 4.7120, -74.0721) between 100 and 120,
  'distance validation returns meters');

select is(has_function_privilege('anon',
  'public.time_clock_register_event(text,uuid,double precision,double precision,double precision,timestamp with time zone,text,text,uuid,text,uuid)',
  'EXECUTE'), false, 'anonymous users cannot invoke event registration');

select is(has_table_privilege('anon', 'public.time_clock_events', 'SELECT'), false,
  'anonymous users cannot read attendance evidence');

select ok((select prosecdef from pg_proc where oid = 'public.time_clock_is_self(uuid)'::regprocedure),
  'self-service policy helper resolves employee links with controlled privileges');

select is(has_function_privilege('anon',
  'public.time_clock_self_can_access_point(uuid,uuid)', 'EXECUTE'), false,
  'anonymous users cannot invoke point access helper');

select * from finish();
rollback;
