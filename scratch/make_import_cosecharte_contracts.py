import json
from pathlib import Path
root = Path(r'C:\Users\ASUS\Programacion IA\krh-recursoshumanos')
data = json.loads((root/'scratch/cosecharte_contract_import.json').read_text(encoding='utf-8'))
json_literal = json.dumps(data, ensure_ascii=False).replace("'", "''")
sql = f"""
begin;

create temp table tmp_cosecharte_contract_import on commit drop as
with company as (
  select id from public.companies where name='Cosecharte S.A.S.' and nit='900215241'
), import_rows as (
  select * from jsonb_to_recordset('{json_literal}'::jsonb) as x(
    excel_row int,
    document_number text,
    contract_type text,
    source_contract_type text,
    operation_center_name text,
    salary_type text,
    source_payment_mode text,
    start_date date,
    duration_months int,
    end_date date,
    extension_end_dates jsonb,
    salary numeric,
    special_clauses text
  )
)
select r.*, e.id as employee_id
from import_rows r
left join public.employees_v2 e
  on e.company_id=(select id from company)
 and e.document_number=r.document_number;

-- Guardrails: exact company/user must exist and no importable employee may already have a contract.
do $$
declare
  v_company_id uuid;
  v_approver_id uuid;
  v_existing int;
  v_duplicates int;
begin
  select id into v_company_id from public.companies where name='Cosecharte S.A.S.' and nit='900215241';
  if v_company_id is null then
    raise exception 'Cosecharte company not found';
  end if;

  select id into v_approver_id from auth.users where lower(email)=lower('recursoshumanos@cosecharte.co');
  if v_approver_id is null then
    raise exception 'Approver user not found: recursoshumanos@cosecharte.co';
  end if;

  select count(*) into v_duplicates
  from (select document_number from tmp_cosecharte_contract_import group by document_number having count(*) > 1) d;
  if v_duplicates > 0 then
    raise exception 'Duplicate documents in import: %', v_duplicates;
  end if;

  select count(*) into v_existing
  from tmp_cosecharte_contract_import t
  join public.contracts c on c.company_id=v_company_id and c.employee_id=t.employee_id
  where t.employee_id is not null and t.salary is not null and t.salary > 0;
  if v_existing > 0 then
    raise exception 'Importable employees with existing contracts: %', v_existing;
  end if;
end $$;

create temp table tmp_cosecharte_inserted_contracts (
  excel_row int primary key,
  document_number text not null,
  contract_id uuid not null,
  contract_number text not null,
  original_end_date date not null,
  salary numeric not null,
  extension_end_dates jsonb not null
) on commit drop;

do $$
declare
  v_company_id uuid;
  v_approver_id uuid;
  r record;
  v_contract_id uuid;
  v_contract_number text;
  ext record;
  v_prev_end date;
  v_ext_start date;
begin
  select id into v_company_id from public.companies where name='Cosecharte S.A.S.' and nit='900215241';
  select id into v_approver_id from auth.users where lower(email)=lower('recursoshumanos@cosecharte.co');

  for r in
    select *
    from tmp_cosecharte_contract_import
    where employee_id is not null
      and salary is not null
      and salary > 0
      and start_date is not null
      and end_date is not null
    order by excel_row
  loop
    v_contract_number := public.get_next_contract_number(v_company_id, 'CT');

    insert into public.contracts (
      employee_id,
      company_id,
      contract_type,
      contract_number,
      start_date,
      end_date,
      salary,
      salary_type,
      transport_allowance,
      other_allowances,
      trial_period_days,
      trial_end_date,
      work_city,
      work_address,
      is_terminated,
      termination_date,
      termination_reason,
      has_confidentiality_clause,
      has_non_compete_clause,
      special_clauses,
      document_url,
      created_by,
      is_approved,
      approved_by,
      approved_at
    ) values (
      r.employee_id,
      v_company_id,
      'fijo',
      v_contract_number,
      r.start_date,
      r.end_date,
      r.salary,
      'mensual',
      0,
      0,
      0,
      null,
      null,
      null,
      false,
      null,
      null,
      false,
      false,
      r.special_clauses,
      null,
      v_approver_id,
      true,
      v_approver_id,
      now()
    ) returning id into v_contract_id;

    insert into tmp_cosecharte_inserted_contracts (
      excel_row, document_number, contract_id, contract_number, original_end_date, salary, extension_end_dates
    ) values (
      r.excel_row, r.document_number, v_contract_id, v_contract_number, r.end_date, r.salary, coalesce(r.extension_end_dates, '[]'::jsonb)
    );

    v_prev_end := r.end_date;
    for ext in
      select ord::int as extension_number, value::date as extension_end_date
      from jsonb_array_elements_text(coalesce(r.extension_end_dates, '[]'::jsonb)) with ordinality as e(value, ord)
      order by ord
    loop
      if ext.extension_end_date is not null and ext.extension_end_date > v_prev_end then
        v_ext_start := v_prev_end + 1;
        insert into public.contract_extensions (
          contract_id,
          company_id,
          extension_number,
          start_date,
          end_date,
          reason,
          new_salary,
          document_url,
          created_by,
          extension_type
        ) values (
          v_contract_id,
          v_company_id,
          ext.extension_number,
          v_ext_start,
          ext.extension_end_date,
          'Prórroga ' || ext.extension_number || ' importada desde MATRIZ VENCIMIENTO DE CONTRATOS (1).xlsx, fila Excel ' || r.excel_row,
          r.salary,
          null,
          v_approver_id,
          'pactada'
        );
        v_prev_end := ext.extension_end_date;
      end if;
    end loop;
  end loop;
end $$;

select
  (select count(*) from tmp_cosecharte_contract_import) as source_rows,
  (select count(*) from tmp_cosecharte_contract_import where employee_id is null) as skipped_missing_employee,
  (select count(*) from tmp_cosecharte_contract_import where salary is null or salary <= 0) as skipped_missing_salary,
  (select count(*) from tmp_cosecharte_inserted_contracts) as inserted_contracts,
  (select count(*) from public.contract_extensions ce join tmp_cosecharte_inserted_contracts ic on ic.contract_id=ce.contract_id) as inserted_extensions;

commit;
"""
(root/'scratch/import_cosecharte_contracts_from_matrix.sql').write_text(sql, encoding='utf-8')
print(root/'scratch/import_cosecharte_contracts_from_matrix.sql')
print('bytes', len(sql.encode('utf-8')))
