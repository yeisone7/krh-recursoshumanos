-- Fix recruitment hiring flow: align foreign keys with normalized employees_v2 model
-- Keep as NOT VALID to preserve legacy rows that may still reference old employees IDs.

ALTER TABLE public.medical_exams
DROP CONSTRAINT IF EXISTS medical_exams_employee_id_fkey;

ALTER TABLE public.medical_exams
ADD CONSTRAINT medical_exams_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees_v2(id)
ON DELETE CASCADE
NOT VALID;

ALTER TABLE public.candidates
DROP CONSTRAINT IF EXISTS candidates_employee_id_fkey;

ALTER TABLE public.candidates
ADD CONSTRAINT candidates_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees_v2(id)
ON DELETE SET NULL
NOT VALID;