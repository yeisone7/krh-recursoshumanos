
-- Create the transaction header table
CREATE TABLE public.dotation_delivery_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  delivered_by TEXT,
  received_by TEXT,
  signature_url TEXT,
  document_url TEXT,
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add transaction_id to deliveries
ALTER TABLE public.dotation_deliveries 
  ADD COLUMN transaction_id UUID REFERENCES public.dotation_delivery_transactions(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.dotation_delivery_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies matching the existing pattern
CREATE POLICY "Admin and RRHH can manage delivery transactions"
  ON public.dotation_delivery_transactions
  FOR ALL
  TO authenticated
  USING (is_admin_or_rrhh() AND has_employee_v2_access(employee_id))
  WITH CHECK (is_admin_or_rrhh() AND has_employee_v2_access(employee_id));

CREATE POLICY "Users can view accessible delivery transactions"
  ON public.dotation_delivery_transactions
  FOR SELECT
  TO authenticated
  USING (has_employee_v2_access(employee_id));

-- Migrate existing data: group by employee_id + delivery_date + created_by
INSERT INTO public.dotation_delivery_transactions (employee_id, delivery_date, delivered_by, received_by, signature_url, document_url, observations, created_by, created_at)
SELECT 
  employee_id,
  delivery_date,
  MAX(delivered_by),
  MAX(received_by),
  MAX(signature_url),
  MAX(document_url),
  MAX(observations),
  created_by,
  MIN(created_at)
FROM public.dotation_deliveries
GROUP BY employee_id, delivery_date, created_by;

-- Link existing deliveries to their transactions
UPDATE public.dotation_deliveries d
SET transaction_id = t.id
FROM public.dotation_delivery_transactions t
WHERE d.employee_id = t.employee_id 
  AND d.delivery_date = t.delivery_date
  AND COALESCE(d.created_by, '00000000-0000-0000-0000-000000000000') = COALESCE(t.created_by, '00000000-0000-0000-0000-000000000000');

-- Timestamp trigger
CREATE TRIGGER update_dotation_delivery_transactions_updated_at
  BEFORE UPDATE ON public.dotation_delivery_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
