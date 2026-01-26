-- Drop the old foreign key first
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_employee_id_fkey;

-- Add new foreign key referencing employees_v2
ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.employees_v2(id) ON DELETE CASCADE;