-- PILA / UGPP validation foundation.
-- Phase 2: periods, employee validation snapshots, estimated contributions and permissions.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pila_period_status') THEN
    CREATE TYPE public.pila_period_status AS ENUM (
      'borrador',
      'validado',
      'con_alertas',
      'cerrado'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pila_validation_status') THEN
    CREATE TYPE public.pila_validation_status AS ENUM (
      'ok',
      'advertencia',
      'critico'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pila_ugpp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  health_employee_rate numeric(8,5) NOT NULL DEFAULT 0.04,
  health_employer_rate numeric(8,5) NOT NULL DEFAULT 0.085,
  pension_employee_rate numeric(8,5) NOT NULL DEFAULT 0.04,
  pension_employer_rate numeric(8,5) NOT NULL DEFAULT 0.12,
  ccf_rate numeric(8,5) NOT NULL DEFAULT 0.04,
  sena_rate numeric(8,5) NOT NULL DEFAULT 0.02,
  icbf_rate numeric(8,5) NOT NULL DEFAULT 0.03,
  arl_rate_i numeric(8,5) NOT NULL DEFAULT 0.00522,
  arl_rate_ii numeric(8,5) NOT NULL DEFAULT 0.01044,
  arl_rate_iii numeric(8,5) NOT NULL DEFAULT 0.02436,
  arl_rate_iv numeric(8,5) NOT NULL DEFAULT 0.04350,
  arl_rate_v numeric(8,5) NOT NULL DEFAULT 0.06960,
  salary_floor_enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pila_ugpp_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_label text NOT NULL,
  status public.pila_period_status NOT NULL DEFAULT 'borrador',
  total_employees integer NOT NULL DEFAULT 0,
  critical_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  ok_count integer NOT NULL DEFAULT 0,
  total_ibc numeric(14,2) NOT NULL DEFAULT 0,
  estimated_total_contributions numeric(14,2) NOT NULL DEFAULT 0,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_start)
);

CREATE TABLE IF NOT EXISTS public.pila_ugpp_employee_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.pila_ugpp_periods(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  contract_id uuid,
  employee_name text NOT NULL,
  document_type text,
  document_number text,
  position_name text,
  operation_center_name text,
  salary numeric(14,2) NOT NULL DEFAULT 0,
  ibc numeric(14,2) NOT NULL DEFAULT 0,
  risk_level text,
  eps text,
  afp text,
  arl text,
  ccf text,
  novelty_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_contributions jsonb NOT NULL DEFAULT '{}'::jsonb,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  issue_count integer NOT NULL DEFAULT 0,
  status public.pila_validation_status NOT NULL DEFAULT 'ok',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_pila_periods_company_period
  ON public.pila_ugpp_periods(company_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_pila_validations_period_status
  ON public.pila_ugpp_employee_validations(period_id, status, issue_count DESC);

CREATE INDEX IF NOT EXISTS idx_pila_validations_employee
  ON public.pila_ugpp_employee_validations(employee_id, created_at DESC);

ALTER TABLE public.pila_ugpp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pila_ugpp_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pila_ugpp_employee_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PILA permissions can view settings" ON public.pila_ugpp_settings;
CREATE POLICY "PILA permissions can view settings"
ON public.pila_ugpp_settings
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'pila_ugpp', 'view')
  )
);

DROP POLICY IF EXISTS "PILA permissions can manage settings" ON public.pila_ugpp_settings;
CREATE POLICY "PILA permissions can manage settings"
ON public.pila_ugpp_settings
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'pila_ugpp', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'pila_ugpp', 'update')
  )
);

DROP POLICY IF EXISTS "PILA permissions can view periods" ON public.pila_ugpp_periods;
CREATE POLICY "PILA permissions can view periods"
ON public.pila_ugpp_periods
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'pila_ugpp', 'view')
  )
);

DROP POLICY IF EXISTS "PILA permissions can manage periods" ON public.pila_ugpp_periods;
CREATE POLICY "PILA permissions can manage periods"
ON public.pila_ugpp_periods
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'pila_ugpp', 'create')
  )
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'pila_ugpp', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'pila_ugpp', 'create')
      OR public.check_user_permission(auth.uid(), 'pila_ugpp', 'update')
    )
  )
);

DROP POLICY IF EXISTS "PILA permissions can view validations" ON public.pila_ugpp_employee_validations;
CREATE POLICY "PILA permissions can view validations"
ON public.pila_ugpp_employee_validations
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'pila_ugpp', 'view')
  )
);

DROP POLICY IF EXISTS "PILA permissions can manage validations" ON public.pila_ugpp_employee_validations;
CREATE POLICY "PILA permissions can manage validations"
ON public.pila_ugpp_employee_validations
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'pila_ugpp', 'create')
      OR public.check_user_permission(auth.uid(), 'pila_ugpp', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'pila_ugpp', 'create')
      OR public.check_user_permission(auth.uid(), 'pila_ugpp', 'update')
    )
  )
);

DROP TRIGGER IF EXISTS update_pila_ugpp_settings_updated_at ON public.pila_ugpp_settings;
CREATE TRIGGER update_pila_ugpp_settings_updated_at
BEFORE UPDATE ON public.pila_ugpp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pila_ugpp_periods_updated_at ON public.pila_ugpp_periods;
CREATE TRIGGER update_pila_ugpp_periods_updated_at
BEFORE UPDATE ON public.pila_ugpp_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pila_ugpp_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pila_ugpp_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pila_ugpp_employee_validations TO authenticated;

INSERT INTO public.modules (code, name, icon, sort_order)
VALUES ('pila_ugpp', 'PILA / UGPP', 'Landmark', 30)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, action_value::public.permission_action, description_value
FROM public.modules m
CROSS JOIN (
  VALUES
    ('view', 'PILA / UGPP - Ver'),
    ('create', 'PILA / UGPP - Generar periodos'),
    ('update', 'PILA / UGPP - Validar y modificar'),
    ('delete', 'PILA / UGPP - Eliminar periodos')
) AS permission_seed(action_value, description_value)
WHERE m.code = 'pila_ugpp'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'pila_ugpp'
ON CONFLICT (role_id, permission_id) DO NOTHING;
