ALTER TABLE public.operation_centers 
  ADD COLUMN contract_commercial_date DATE DEFAULT NULL,
  ADD COLUMN notes TEXT DEFAULT NULL;