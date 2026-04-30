-- Crear enums para vacaciones
CREATE TYPE vacation_request_type AS ENUM ('disfrute', 'compensacion', 'acumulacion', 'interrupcion');
CREATE TYPE vacation_status AS ENUM ('borrador', 'aprobado', 'en_curso', 'completado', 'cancelado', 'interrumpido');

-- Tabla de configuración de vacaciones por empresa
CREATE TABLE public.vacation_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    days_per_year INTEGER NOT NULL DEFAULT 15,
    max_accumulation_years INTEGER NOT NULL DEFAULT 2,
    max_compensation_percentage NUMERIC NOT NULL DEFAULT 50,
    alert_threshold_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (company_id)
);

-- Tabla de saldos de vacaciones por periodo
CREATE TABLE public.vacation_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    days_accrued NUMERIC NOT NULL DEFAULT 15,
    days_taken NUMERIC NOT NULL DEFAULT 0,
    days_compensated NUMERIC NOT NULL DEFAULT 0,
    days_pending NUMERIC GENERATED ALWAYS AS (days_accrued - days_taken - days_compensated) STORED,
    is_accumulated BOOLEAN NOT NULL DEFAULT false,
    accumulation_expires DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de solicitudes/movimientos de vacaciones
CREATE TABLE public.vacation_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    balance_id UUID REFERENCES public.vacation_balances(id) ON DELETE SET NULL,
    request_type vacation_request_type NOT NULL DEFAULT 'disfrute',
    status vacation_status NOT NULL DEFAULT 'borrador',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    business_days INTEGER NOT NULL,
    calendar_days INTEGER,
    compensation_amount NUMERIC,
    interruption_date DATE,
    interruption_reason TEXT,
    remaining_days INTEGER DEFAULT 0,
    resume_start_date DATE,
    resume_end_date DATE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    document_url TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.vacation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para vacation_config
CREATE POLICY "Admin can manage vacation config"
ON public.vacation_config
FOR ALL
USING (is_admin() AND is_company_member(company_id))
WITH CHECK (is_admin() AND is_company_member(company_id));

CREATE POLICY "Users can view vacation config"
ON public.vacation_config
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- Políticas RLS para vacation_balances
CREATE POLICY "Admin and RRHH can manage vacation balances"
ON public.vacation_balances
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company vacation balances"
ON public.vacation_balances
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- Políticas RLS para vacation_requests
CREATE POLICY "Admin and RRHH can manage vacation requests"
ON public.vacation_requests
FOR ALL
USING (is_admin_or_rrhh() AND is_company_member(company_id))
WITH CHECK (is_admin_or_rrhh() AND is_company_member(company_id));

CREATE POLICY "Users can view company vacation requests"
ON public.vacation_requests
FOR SELECT
USING (is_company_member(company_id) OR is_admin());

-- Triggers para updated_at
CREATE TRIGGER update_vacation_config_updated_at
    BEFORE UPDATE ON public.vacation_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vacation_balances_updated_at
    BEFORE UPDATE ON public.vacation_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vacation_requests_updated_at
    BEFORE UPDATE ON public.vacation_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_vacation_balances_employee ON public.vacation_balances(employee_id);
CREATE INDEX idx_vacation_balances_company ON public.vacation_balances(company_id);
CREATE INDEX idx_vacation_balances_period ON public.vacation_balances(period_start, period_end);
CREATE INDEX idx_vacation_requests_employee ON public.vacation_requests(employee_id);
CREATE INDEX idx_vacation_requests_company ON public.vacation_requests(company_id);
CREATE INDEX idx_vacation_requests_status ON public.vacation_requests(status);
CREATE INDEX idx_vacation_requests_dates ON public.vacation_requests(start_date, end_date);