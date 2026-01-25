-- Enum for cesantias deposit status
CREATE TYPE public.cesantias_status AS ENUM ('pendiente', 'calculado', 'depositado', 'extemporaneo');

-- Enum for cesantias withdrawal reason
CREATE TYPE public.cesantias_withdrawal_reason AS ENUM ('vivienda', 'educacion', 'terminacion_contrato');

-- Table for annual cesantías deposits
CREATE TABLE public.cesantias_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  calculation_start_date DATE NOT NULL,
  calculation_end_date DATE NOT NULL,
  base_salary NUMERIC NOT NULL,
  average_salary NUMERIC,
  days_worked INTEGER NOT NULL DEFAULT 360,
  cesantias_amount NUMERIC NOT NULL,
  fund_name TEXT NOT NULL,
  fund_account TEXT,
  due_date DATE NOT NULL, -- Feb 14 of next year
  deposit_date DATE,
  deposit_document_url TEXT,
  status public.cesantias_status NOT NULL DEFAULT 'pendiente',
  is_late BOOLEAN DEFAULT false,
  late_days INTEGER DEFAULT 0,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, year)
);

-- Table for cesantías interest payments (12% annual, due Jan 31)
CREATE TABLE public.cesantias_interest_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  cesantias_balance NUMERIC NOT NULL, -- Balance at Dec 31
  interest_rate NUMERIC NOT NULL DEFAULT 12,
  days_accrued INTEGER NOT NULL DEFAULT 360,
  interest_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL, -- Jan 31 of next year
  payment_date DATE,
  payment_document_url TEXT,
  is_paid BOOLEAN DEFAULT false,
  is_late BOOLEAN DEFAULT false,
  late_days INTEGER DEFAULT 0,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, year)
);

-- Table for partial withdrawals
CREATE TABLE public.cesantias_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  withdrawal_reason public.cesantias_withdrawal_reason NOT NULL,
  amount_requested NUMERIC NOT NULL,
  amount_approved NUMERIC,
  authorization_date DATE,
  disbursement_date DATE,
  fund_name TEXT NOT NULL,
  request_document_url TEXT,
  authorization_document_url TEXT,
  beneficiary_name TEXT,
  beneficiary_document TEXT,
  destination_description TEXT,
  status TEXT NOT NULL DEFAULT 'solicitado',
  rejection_reason TEXT,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cesantias_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cesantias_interest_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cesantias_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cesantias_deposits
CREATE POLICY "Admin and RRHH can manage cesantias deposits"
  ON public.cesantias_deposits FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company cesantias deposits"
  ON public.cesantias_deposits FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for cesantias_interest_payments
CREATE POLICY "Admin and RRHH can manage cesantias interest"
  ON public.cesantias_interest_payments FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company cesantias interest"
  ON public.cesantias_interest_payments FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- RLS Policies for cesantias_withdrawals
CREATE POLICY "Admin and RRHH can manage cesantias withdrawals"
  ON public.cesantias_withdrawals FOR ALL
  USING (is_admin_or_rrhh() AND is_company_member(company_id))
  WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company cesantias withdrawals"
  ON public.cesantias_withdrawals FOR SELECT
  USING (is_company_member(company_id) OR is_admin());

-- Triggers for updated_at
CREATE TRIGGER update_cesantias_deposits_updated_at
  BEFORE UPDATE ON public.cesantias_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cesantias_interest_updated_at
  BEFORE UPDATE ON public.cesantias_interest_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cesantias_withdrawals_updated_at
  BEFORE UPDATE ON public.cesantias_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();