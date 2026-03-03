
-- Change item_type from enum to text to support catalog UUIDs
ALTER TABLE public.dotation_inventory ALTER COLUMN item_type TYPE text;
