-- Allow dynamic contract types from catalog by converting contracts.contract_type from enum to text
ALTER TABLE public.contracts
  ALTER COLUMN contract_type TYPE text USING contract_type::text;

-- Optional: ensure not null remains (if it is)
-- (No change here; existing constraint will remain if present)

-- Update any indexes that depend on enum type are automatically compatible with text in Postgres.
