-- Create table for company holidays
CREATE TABLE public.company_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_national BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, holiday_date)
);

-- Enable RLS
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view holidays from their companies"
  ON public.company_holidays
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can insert holidays"
  ON public.company_holidays
  FOR INSERT
  WITH CHECK (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can update holidays"
  ON public.company_holidays
  FOR UPDATE
  USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

CREATE POLICY "Admin and RRHH can delete holidays"
  ON public.company_holidays
  FOR DELETE
  USING (public.is_admin_or_rrhh() AND public.is_company_member(company_id));

-- Trigger for updated_at
CREATE TRIGGER update_company_holidays_updated_at
  BEFORE UPDATE ON public.company_holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_company_holidays_date ON public.company_holidays(company_id, holiday_date);
CREATE INDEX idx_company_holidays_year ON public.company_holidays(company_id, EXTRACT(YEAR FROM holiday_date));

-- Function to insert default Colombian holidays for a company
CREATE OR REPLACE FUNCTION public.insert_default_holidays()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.company_holidays (company_id, holiday_date, name, is_national) VALUES
    -- 2024
    (NEW.id, '2024-01-01', 'Año Nuevo', true),
    (NEW.id, '2024-01-08', 'Día de los Reyes Magos', true),
    (NEW.id, '2024-03-25', 'Día de San José', true),
    (NEW.id, '2024-03-28', 'Jueves Santo', true),
    (NEW.id, '2024-03-29', 'Viernes Santo', true),
    (NEW.id, '2024-05-01', 'Día del Trabajo', true),
    (NEW.id, '2024-05-13', 'Día de la Ascensión', true),
    (NEW.id, '2024-06-03', 'Corpus Christi', true),
    (NEW.id, '2024-06-10', 'Sagrado Corazón', true),
    (NEW.id, '2024-07-01', 'San Pedro y San Pablo', true),
    (NEW.id, '2024-07-20', 'Día de la Independencia', true),
    (NEW.id, '2024-08-07', 'Batalla de Boyacá', true),
    (NEW.id, '2024-08-19', 'Asunción de la Virgen', true),
    (NEW.id, '2024-10-14', 'Día de la Raza', true),
    (NEW.id, '2024-11-04', 'Día de Todos los Santos', true),
    (NEW.id, '2024-11-11', 'Independencia de Cartagena', true),
    (NEW.id, '2024-12-08', 'Inmaculada Concepción', true),
    (NEW.id, '2024-12-25', 'Navidad', true),
    -- 2025
    (NEW.id, '2025-01-01', 'Año Nuevo', true),
    (NEW.id, '2025-01-06', 'Día de los Reyes Magos', true),
    (NEW.id, '2025-03-24', 'Día de San José', true),
    (NEW.id, '2025-04-17', 'Jueves Santo', true),
    (NEW.id, '2025-04-18', 'Viernes Santo', true),
    (NEW.id, '2025-05-01', 'Día del Trabajo', true),
    (NEW.id, '2025-05-02', 'Día de la Ascensión', true),
    (NEW.id, '2025-06-23', 'Corpus Christi', true),
    (NEW.id, '2025-06-30', 'Sagrado Corazón', true),
    (NEW.id, '2025-06-30', 'San Pedro y San Pablo', true),
    (NEW.id, '2025-07-20', 'Día de la Independencia', true),
    (NEW.id, '2025-08-07', 'Batalla de Boyacá', true),
    (NEW.id, '2025-08-18', 'Asunción de la Virgen', true),
    (NEW.id, '2025-10-13', 'Día de la Raza', true),
    (NEW.id, '2025-11-03', 'Día de Todos los Santos', true),
    (NEW.id, '2025-11-17', 'Independencia de Cartagena', true),
    (NEW.id, '2025-12-08', 'Inmaculada Concepción', true),
    (NEW.id, '2025-12-25', 'Navidad', true),
    -- 2026
    (NEW.id, '2026-01-01', 'Año Nuevo', true),
    (NEW.id, '2026-01-12', 'Día de los Reyes Magos', true),
    (NEW.id, '2026-03-23', 'Día de San José', true),
    (NEW.id, '2026-04-02', 'Jueves Santo', true),
    (NEW.id, '2026-04-03', 'Viernes Santo', true),
    (NEW.id, '2026-05-01', 'Día del Trabajo', true),
    (NEW.id, '2026-05-18', 'Día de la Ascensión', true),
    (NEW.id, '2026-06-08', 'Corpus Christi', true),
    (NEW.id, '2026-06-15', 'Sagrado Corazón', true),
    (NEW.id, '2026-06-29', 'San Pedro y San Pablo', true),
    (NEW.id, '2026-07-20', 'Día de la Independencia', true),
    (NEW.id, '2026-08-07', 'Batalla de Boyacá', true),
    (NEW.id, '2026-08-17', 'Asunción de la Virgen', true),
    (NEW.id, '2026-10-12', 'Día de la Raza', true),
    (NEW.id, '2026-11-02', 'Día de Todos los Santos', true),
    (NEW.id, '2026-11-16', 'Independencia de Cartagena', true),
    (NEW.id, '2026-12-08', 'Inmaculada Concepción', true),
    (NEW.id, '2026-12-25', 'Navidad', true)
  ON CONFLICT (company_id, holiday_date) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-insert holidays for new companies
CREATE TRIGGER insert_company_holidays_trigger
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_default_holidays();