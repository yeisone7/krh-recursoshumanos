-- Repair production schema drift: the custom leave type UI and later
-- workflows were deployed while the original enum-to-text migration was
-- absent from the remote migration history.
BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';

ALTER TABLE public.leave_type_config
  ALTER COLUMN leave_type TYPE text USING leave_type::text;

ALTER TABLE public.leave_requests
  ALTER COLUMN leave_type TYPE text USING leave_type::text;

ALTER TABLE public.leave_balances
  ALTER COLUMN leave_type TYPE text USING leave_type::text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.leave_type_config'::regclass
      AND conname = 'leave_type_config_key_format_check'
  ) THEN
    ALTER TABLE public.leave_type_config
      ADD CONSTRAINT leave_type_config_key_format_check
      CHECK (leave_type ~ '^[a-z0-9_]{2,60}$') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.leave_requests'::regclass
      AND conname = 'leave_requests_leave_type_key_format_check'
  ) THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT leave_requests_leave_type_key_format_check
      CHECK (leave_type ~ '^[a-z0-9_]{2,60}$') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.leave_balances'::regclass
      AND conname = 'leave_balances_leave_type_key_format_check'
  ) THEN
    ALTER TABLE public.leave_balances
      ADD CONSTRAINT leave_balances_leave_type_key_format_check
      CHECK (leave_type ~ '^[a-z0-9_]{2,60}$') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.leave_requests'::regclass
      AND conname = 'leave_requests_company_leave_type_fkey'
  ) THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT leave_requests_company_leave_type_fkey
      FOREIGN KEY (company_id, leave_type)
      REFERENCES public.leave_type_config(company_id, leave_type)
      ON UPDATE CASCADE ON DELETE RESTRICT
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.leave_balances'::regclass
      AND conname = 'leave_balances_company_leave_type_fkey'
  ) THEN
    ALTER TABLE public.leave_balances
      ADD CONSTRAINT leave_balances_company_leave_type_fkey
      FOREIGN KEY (company_id, leave_type)
      REFERENCES public.leave_type_config(company_id, leave_type)
      ON UPDATE CASCADE ON DELETE RESTRICT
      NOT VALID;
  END IF;
END;
$$;

-- This broad legacy policy should have been removed by the skipped migration.
-- The dedicated leave_type_configuration policies are already present.
DROP POLICY IF EXISTS "Admin can manage leave type config"
  ON public.leave_type_config;

COMMIT;
