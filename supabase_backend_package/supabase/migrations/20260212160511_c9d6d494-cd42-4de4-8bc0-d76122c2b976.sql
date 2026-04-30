
-- =============================================
-- Table 1: payroll_labor_config
-- =============================================
CREATE TABLE public.payroll_labor_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  max_weekly_hours NUMERIC NOT NULL DEFAULT 46,
  daily_hours NUMERIC NOT NULL DEFAULT 8,
  display_unit TEXT NOT NULL DEFAULT 'hours',
  night_start TIME NOT NULL DEFAULT '21:00',
  night_end TIME NOT NULL DEFAULT '06:00',
  surcharge_hedo INTEGER NOT NULL DEFAULT 25,
  surcharge_heno INTEGER NOT NULL DEFAULT 75,
  surcharge_rn INTEGER NOT NULL DEFAULT 35,
  surcharge_hedf INTEGER NOT NULL DEFAULT 100,
  surcharge_henf INTEGER NOT NULL DEFAULT 150,
  surcharge_rnf INTEGER NOT NULL DEFAULT 110,
  surcharge_dominical INTEGER NOT NULL DEFAULT 75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id)
);

ALTER TABLE public.payroll_labor_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll config for their company"
  ON public.payroll_labor_config FOR SELECT
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can insert payroll config for their company"
  ON public.payroll_labor_config FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can update payroll config for their company"
  ON public.payroll_labor_config FOR UPDATE
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can delete payroll config for their company"
  ON public.payroll_labor_config FOR DELETE
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- =============================================
-- Table 2: payroll_novelties
-- =============================================
CREATE TABLE public.payroll_novelties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  novelty_date DATE NOT NULL,
  novelty_type TEXT NOT NULL CHECK (novelty_type IN (
    'jornada', 'hedo', 'heno', 'hedf', 'henf', 'rn', 'rnf',
    'dominical_trabajado', 'festivo_trabajado', 'descanso_remunerado',
    'incapacidad', 'vacaciones', 'permiso'
  )),
  hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_novelties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll novelties for their company"
  ON public.payroll_novelties FOR SELECT
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can insert payroll novelties for their company"
  ON public.payroll_novelties FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can update payroll novelties for their company"
  ON public.payroll_novelties FOR UPDATE
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Users can delete payroll novelties for their company"
  ON public.payroll_novelties FOR DELETE
  USING (company_id IN (SELECT public.get_user_company_ids()));

-- Indexes
CREATE INDEX idx_payroll_novelties_employee ON public.payroll_novelties(employee_id);
CREATE INDEX idx_payroll_novelties_date ON public.payroll_novelties(novelty_date);
CREATE INDEX idx_payroll_novelties_company_date ON public.payroll_novelties(company_id, novelty_date);

-- Updated_at triggers
CREATE TRIGGER update_payroll_labor_config_updated_at
  BEFORE UPDATE ON public.payroll_labor_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_novelties_updated_at
  BEFORE UPDATE ON public.payroll_novelties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
