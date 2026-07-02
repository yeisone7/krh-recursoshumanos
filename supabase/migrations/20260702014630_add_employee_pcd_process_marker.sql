alter table public.employees_v2
  add column if not exists proceso_exclusivo_pcd boolean not null default false;

update public.employees_v2 employee
set proceso_exclusivo_pcd = true
from public.candidates candidate
join public.vacancies vacancy on vacancy.id = candidate.vacancy_id
join public.personnel_requisitions requisition on requisition.id = vacancy.requisition_id
where candidate.employee_id = employee.id
  and requisition.proceso_exclusivo_pcd is true
  and employee.proceso_exclusivo_pcd is distinct from true;
