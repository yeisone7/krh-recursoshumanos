-- Separate transaction: PostgreSQL must commit enum additions before using them.
ALTER TYPE public.requisition_status ADD VALUE IF NOT EXISTS 'en_aprobacion';
