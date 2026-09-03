begin;

select plan(7);

select is(
  (select data_type from information_schema.columns
   where table_schema = 'public' and table_name = 'leave_type_config' and column_name = 'leave_type'),
  'text',
  'leave type configuration accepts custom text identifiers'
);

select is(
  (select data_type from information_schema.columns
   where table_schema = 'public' and table_name = 'leave_requests' and column_name = 'leave_type'),
  'text',
  'leave requests store custom text identifiers'
);

select is(
  (select data_type from information_schema.columns
   where table_schema = 'public' and table_name = 'leave_balances' and column_name = 'leave_type'),
  'text',
  'leave balances store custom text identifiers'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.leave_type_config'::regclass
      and conname = 'leave_type_config_key_format_check'
  ),
  'leave type configuration validates custom key format'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.leave_requests'::regclass
      and conname = 'leave_requests_company_leave_type_fkey'
  ),
  'leave requests reference a company leave type'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.leave_balances'::regclass
      and conname = 'leave_balances_company_leave_type_fkey'
  ),
  'leave balances reference a company leave type'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leave_type_config'
      and policyname = 'Admin can manage leave type config'
  ),
  'obsolete broad leave type policy is removed'
);

select * from finish();
rollback;
