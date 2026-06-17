-- Allow offboarding processes to be started directly from Employees when the
-- app has not yet created formal contract records.

ALTER TABLE public.employee_terminations
  ALTER COLUMN contract_id DROP NOT NULL;
