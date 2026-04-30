
-- Table: payroll_receipts
CREATE TABLE public.payroll_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  total_earnings NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  net_pay NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.payroll_receipts ENABLE ROW LEVEL SECURITY;

-- Employees can see their own receipts
CREATE POLICY "Employees can view own payroll receipts"
  ON public.payroll_receipts FOR SELECT TO authenticated
  USING (employee_id = public.get_my_employee_id());

-- Admin/RRHH can manage all receipts in their company
CREATE POLICY "Admin can manage payroll receipts"
  ON public.payroll_receipts FOR ALL TO authenticated
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

-- RLS: Employees can INSERT their own vacation requests
CREATE POLICY "Employees can create own vacation requests"
  ON public.vacation_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.get_my_employee_id());

-- RLS: Employees can SELECT their own vacation requests
CREATE POLICY "Employees can view own vacation requests"
  ON public.vacation_requests FOR SELECT TO authenticated
  USING (employee_id = public.get_my_employee_id());

-- RLS: Employees can INSERT their own leave requests
CREATE POLICY "Employees can create own leave requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.get_my_employee_id());

-- RLS: Employees can SELECT their own leave requests
CREATE POLICY "Employees can view own leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (employee_id = public.get_my_employee_id());
