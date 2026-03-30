
-- Enum for loan types
CREATE TYPE public.loan_type AS ENUM ('personal', 'vivienda', 'educacion', 'calamidad', 'libranza', 'anticipo', 'otro');

-- Enum for loan status
CREATE TYPE public.loan_status AS ENUM ('solicitado', 'aprobado', 'activo', 'pagado', 'cancelado', 'rechazado');

-- Enum for deduction types
CREATE TYPE public.deduction_type AS ENUM ('judicial', 'responsabilidad', 'cooperativa', 'sindicato', 'otro');

-- Enum for deduction status
CREATE TYPE public.deduction_status AS ENUM ('activo', 'pausado', 'finalizado', 'cancelado');

-- =============================================
-- EMPLOYEE LOANS TABLE
-- =============================================
CREATE TABLE public.employee_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  loan_type public.loan_type NOT NULL DEFAULT 'personal',
  description TEXT,
  total_amount NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_with_interest NUMERIC(15,2) NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  installment_amount NUMERIC(15,2) NOT NULL,
  paid_installments INTEGER NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status public.loan_status NOT NULL DEFAULT 'solicitado',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- LOAN PAYMENTS TABLE (Trazabilidad de pagos)
-- =============================================
CREATE TABLE public.employee_loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.employee_loans(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2) NOT NULL,
  payroll_period TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- EMPLOYEE DEDUCTIONS TABLE
-- =============================================
CREATE TABLE public.employee_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  deduction_type public.deduction_type NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  percentage_value NUMERIC(5,2),
  start_date DATE NOT NULL,
  end_date DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  reference_number TEXT,
  entity_name TEXT,
  status public.deduction_status NOT NULL DEFAULT 'activo',
  notes TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

-- Loans policies
CREATE POLICY "Users can view loans for their company" ON public.employee_loans
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert loans for their company" ON public.employee_loans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update loans for their company" ON public.employee_loans
  FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can delete loans for their company" ON public.employee_loans
  FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));

-- Loan payments policies
CREATE POLICY "Users can view loan payments" ON public.employee_loan_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employee_loans l 
    WHERE l.id = loan_id AND public.is_company_member(l.company_id)
  ));

CREATE POLICY "Users can insert loan payments" ON public.employee_loan_payments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employee_loans l 
    WHERE l.id = loan_id AND public.is_company_member(l.company_id)
  ));

CREATE POLICY "Users can delete loan payments" ON public.employee_loan_payments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employee_loans l 
    WHERE l.id = loan_id AND public.is_company_member(l.company_id)
  ));

-- Deductions policies
CREATE POLICY "Users can view deductions for their company" ON public.employee_deductions
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can insert deductions for their company" ON public.employee_deductions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "Users can update deductions for their company" ON public.employee_deductions
  FOR UPDATE TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "Users can delete deductions for their company" ON public.employee_deductions
  FOR DELETE TO authenticated
  USING (public.is_company_member(company_id));

-- Updated_at triggers
CREATE TRIGGER update_employee_loans_updated_at
  BEFORE UPDATE ON public.employee_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_deductions_updated_at
  BEFORE UPDATE ON public.employee_deductions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
