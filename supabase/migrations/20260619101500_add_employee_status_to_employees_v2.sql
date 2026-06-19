do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees_v2'
      and column_name = 'status'
  ) then
    alter table public.employees_v2
      add column status public.employee_status not null default 'active';
  end if;
end $$;

update public.employees_v2
set status = case
  when is_active then 'active'::public.employee_status
  else 'retired'::public.employee_status
end
where status is null;

create index if not exists idx_employees_v2_company_status
  on public.employees_v2(company_id, status);
