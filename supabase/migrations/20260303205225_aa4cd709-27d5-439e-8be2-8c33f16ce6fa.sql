ALTER TABLE public.dotation_deliveries
DROP CONSTRAINT IF EXISTS dotation_deliveries_employee_id_fkey;

ALTER TABLE public.dotation_deliveries
ADD CONSTRAINT dotation_deliveries_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees_v2(id)
ON UPDATE CASCADE
ON DELETE RESTRICT;