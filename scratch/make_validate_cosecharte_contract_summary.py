import json
from pathlib import Path
root = Path(r'C:\Users\ASUS\Programacion IA\krh-recursoshumanos')
data = json.loads((root/'scratch/cosecharte_contract_import.json').read_text(encoding='utf-8'))
json_literal = json.dumps(data, ensure_ascii=False).replace("'", "''")
sql = f"""
with company as (
  select id from public.companies where name='Cosecharte S.A.S.' and nit='900215241'
), import_rows as (
  select * from jsonb_to_recordset('{json_literal}'::jsonb) as x(
    excel_row int, document_number text, salary numeric
  )
), matched as (
  select r.*, e.id employee_id
  from import_rows r
  left join public.employees_v2 e on e.company_id=(select id from company) and e.document_number=r.document_number
)
select
  count(*) as import_rows,
  count(employee_id) as matched_employees,
  count(*) filter (where employee_id is null) as missing_employees,
  count(*) filter (where salary is null or salary <= 0) as missing_salary,
  count(*) filter (where employee_id is not null and salary is not null and salary > 0) as importable_rows,
  count(*) filter (where exists (select 1 from public.contracts c where c.company_id=(select id from company) and c.employee_id=matched.employee_id)) as employees_with_existing_contracts,
  (select count(*) from (select document_number from import_rows group by document_number having count(*) > 1) d) as duplicated_documents
from matched;
"""
(root/'scratch/validate_cosecharte_contract_summary.sql').write_text(sql, encoding='utf-8')
