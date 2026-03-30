
-- Loan refinancing history table
CREATE TABLE public.loan_refinancing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.employee_loans(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  refinance_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Previous terms
  previous_total_amount NUMERIC NOT NULL,
  previous_interest_rate NUMERIC NOT NULL DEFAULT 0,
  previous_total_with_interest NUMERIC NOT NULL,
  previous_installments INT NOT NULL,
  previous_installment_amount NUMERIC NOT NULL,
  previous_paid_installments INT NOT NULL DEFAULT 0,
  previous_paid_amount NUMERIC NOT NULL DEFAULT 0,
  previous_remaining_balance NUMERIC NOT NULL,
  
  -- New terms
  new_total_amount NUMERIC NOT NULL,
  new_interest_rate NUMERIC NOT NULL DEFAULT 0,
  new_total_with_interest NUMERIC NOT NULL,
  new_installments INT NOT NULL,
  new_installment_amount NUMERIC NOT NULL,
  new_start_date DATE NOT NULL,
  
  -- Metadata
  reason TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_refinancing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refinancing history for their company"
  ON public.loan_refinancing_history FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert refinancing history for their company"
  ON public.loan_refinancing_history FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));
