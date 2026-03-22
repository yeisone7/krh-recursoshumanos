
-- Fix status enum - need to drop default first
ALTER TABLE public.selection_steps ALTER COLUMN status DROP DEFAULT;
CREATE TYPE public.selection_step_status_new AS ENUM ('pending', 'scheduled', 'completed', 'passed', 'failed', 'skipped', 'not_applicable');
ALTER TABLE public.selection_steps ALTER COLUMN status TYPE text;
DROP TYPE public.selection_step_status;
ALTER TYPE public.selection_step_status_new RENAME TO selection_step_status;
ALTER TABLE public.selection_steps ALTER COLUMN status TYPE public.selection_step_status USING status::public.selection_step_status;
ALTER TABLE public.selection_steps ALTER COLUMN status SET DEFAULT 'pending';
