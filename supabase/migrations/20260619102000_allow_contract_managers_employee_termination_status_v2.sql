drop policy if exists "Contract managers can update employee termination status" on public.employees_v2;

create policy "Contract managers can update employee termination status"
on public.employees_v2
for update
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_company_member(company_id)
    and public.check_user_permission(auth.uid(), 'contratos', 'update')
  )
)
with check (
  public.is_super_admin()
  or (
    public.is_company_member(company_id)
    and public.check_user_permission(auth.uid(), 'contratos', 'update')
    and status in ('en_retiro', 'retired')
    and (status <> 'retired' or is_active = false)
  )
);
