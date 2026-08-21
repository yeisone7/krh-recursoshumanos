ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'operational'
  CHECK (kind IN ('operational', 'day'));

CREATE INDEX IF NOT EXISTS shifts_company_kind_name_idx
  ON public.shifts (company_id, kind, name);
