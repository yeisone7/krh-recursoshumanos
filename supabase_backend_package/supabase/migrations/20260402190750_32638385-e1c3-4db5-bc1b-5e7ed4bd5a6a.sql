
-- =====================================================
-- Add company_id to 8 high-risk tables for direct multi-company isolation
-- =====================================================

-- 1. CONTRACTS
ALTER TABLE public.contracts ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.contracts c SET company_id = e.company_id FROM public.employees_v2 e WHERE c.employee_id = e.id;
ALTER TABLE public.contracts ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_contracts_company_id ON public.contracts(company_id);

-- 2. CONTRACT_EXTENSIONS
ALTER TABLE public.contract_extensions ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.contract_extensions ce SET company_id = c.company_id FROM public.contracts c WHERE ce.contract_id = c.id;
-- Some extensions may not match; set from employee
UPDATE public.contract_extensions ce SET company_id = (
  SELECT e.company_id FROM public.contracts c JOIN public.employees_v2 e ON c.employee_id = e.id WHERE c.id = ce.contract_id LIMIT 1
) WHERE ce.company_id IS NULL;
ALTER TABLE public.contract_extensions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_contract_extensions_company_id ON public.contract_extensions(company_id);

-- 3. DOTATION_DELIVERIES
ALTER TABLE public.dotation_deliveries ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.dotation_deliveries d SET company_id = e.company_id FROM public.employees_v2 e WHERE d.employee_id = e.id;
ALTER TABLE public.dotation_deliveries ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_dotation_deliveries_company_id ON public.dotation_deliveries(company_id);

-- 4. DOTATION_DELIVERY_TRANSACTIONS
ALTER TABLE public.dotation_delivery_transactions ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.dotation_delivery_transactions d SET company_id = e.company_id FROM public.employees_v2 e WHERE d.employee_id = e.id;
ALTER TABLE public.dotation_delivery_transactions ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_dotation_delivery_transactions_company_id ON public.dotation_delivery_transactions(company_id);

-- 5. MEDICAL_EXAMS
ALTER TABLE public.medical_exams ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.medical_exams m SET company_id = e.company_id FROM public.employees_v2 e WHERE m.employee_id = e.id;
ALTER TABLE public.medical_exams ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_medical_exams_company_id ON public.medical_exams(company_id);

-- 6. PERFORMANCE_EVALUATIONS
ALTER TABLE public.performance_evaluations ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.performance_evaluations pe SET company_id = c.company_id FROM public.evaluation_cycles c WHERE pe.cycle_id = c.id;
ALTER TABLE public.performance_evaluations ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_performance_evaluations_company_id ON public.performance_evaluations(company_id);

-- 7. PERFORMANCE_GOALS
ALTER TABLE public.performance_goals ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.performance_goals pg SET company_id = e.company_id FROM public.employees_v2 e WHERE pg.employee_id = e.id;
ALTER TABLE public.performance_goals ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_performance_goals_company_id ON public.performance_goals(company_id);

-- 8. TERMINATION_DOCUMENTS
ALTER TABLE public.termination_documents ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.termination_documents td SET company_id = et.company_id FROM public.employee_terminations et WHERE td.termination_id = et.id;
ALTER TABLE public.termination_documents ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_termination_documents_company_id ON public.termination_documents(company_id);

-- =====================================================
-- Replace RLS policies to use direct company_id
-- =====================================================

-- CONTRACTS
DROP POLICY IF EXISTS "Users can view accessible contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admin and RRHH can manage contracts" ON public.contracts;
CREATE POLICY "Users can view accessible contracts" ON public.contracts FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage contracts" ON public.contracts FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- CONTRACT_EXTENSIONS
DROP POLICY IF EXISTS "Users can view accessible extensions" ON public.contract_extensions;
DROP POLICY IF EXISTS "Admin and RRHH can manage extensions" ON public.contract_extensions;
CREATE POLICY "Users can view accessible extensions" ON public.contract_extensions FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage extensions" ON public.contract_extensions FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- DOTATION_DELIVERIES
DROP POLICY IF EXISTS "Users can view accessible dotation" ON public.dotation_deliveries;
DROP POLICY IF EXISTS "Admin and RRHH can manage dotation" ON public.dotation_deliveries;
CREATE POLICY "Users can view accessible dotation" ON public.dotation_deliveries FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage dotation" ON public.dotation_deliveries FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- DOTATION_DELIVERY_TRANSACTIONS
DROP POLICY IF EXISTS "Users can view accessible delivery transactions" ON public.dotation_delivery_transactions;
DROP POLICY IF EXISTS "Admin and RRHH can manage delivery transactions" ON public.dotation_delivery_transactions;
CREATE POLICY "Users can view accessible delivery transactions" ON public.dotation_delivery_transactions FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage delivery transactions" ON public.dotation_delivery_transactions FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- MEDICAL_EXAMS
DROP POLICY IF EXISTS "Users can view accessible exams" ON public.medical_exams;
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage exams" ON public.medical_exams;
CREATE POLICY "Users can view accessible exams" ON public.medical_exams FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin RRHH and Psicologo can manage exams" ON public.medical_exams FOR ALL USING ((is_admin_or_rrhh() OR is_psicologo()) AND is_company_member(company_id)) WITH CHECK ((is_admin_or_rrhh() OR is_psicologo()) AND is_company_member(company_id));

-- PERFORMANCE_EVALUATIONS
DROP POLICY IF EXISTS "Users can view evaluations from their company cycles" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Admin and RRHH can manage performance evaluations" ON public.performance_evaluations;
CREATE POLICY "Users can view evaluations from their company" ON public.performance_evaluations FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage performance evaluations" ON public.performance_evaluations FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- PERFORMANCE_GOALS
DROP POLICY IF EXISTS "Users can view accessible performance goals" ON public.performance_goals;
DROP POLICY IF EXISTS "Admin and RRHH can manage performance goals" ON public.performance_goals;
CREATE POLICY "Users can view accessible performance goals" ON public.performance_goals FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage performance goals" ON public.performance_goals FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

-- TERMINATION_DOCUMENTS
DROP POLICY IF EXISTS "Users can view termination documents" ON public.termination_documents;
DROP POLICY IF EXISTS "Admin and RRHH can manage termination documents" ON public.termination_documents;
CREATE POLICY "Users can view termination documents" ON public.termination_documents FOR SELECT USING (is_company_member(company_id));
CREATE POLICY "Admin and RRHH can manage termination documents" ON public.termination_documents FOR ALL USING (is_admin_or_rrhh() AND is_company_member(company_id)) WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));
