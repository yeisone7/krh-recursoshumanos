
-- Fix FK: employee_terminations.employee_id should reference employees_v2 instead of employees
ALTER TABLE public.employee_terminations
  DROP CONSTRAINT employee_terminations_employee_id_fkey;

ALTER TABLE public.employee_terminations
  ADD CONSTRAINT employee_terminations_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees_v2(id) ON DELETE CASCADE;
