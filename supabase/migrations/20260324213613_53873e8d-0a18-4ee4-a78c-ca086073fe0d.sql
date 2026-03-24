
ALTER TABLE public.candidates 
  ADD COLUMN IF NOT EXISTS is_first_job boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_head_of_household boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ethnic_group text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_conflict_victim boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_demobilized boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blood_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marital_status text DEFAULT NULL;
