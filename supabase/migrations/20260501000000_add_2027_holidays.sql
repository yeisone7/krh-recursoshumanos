-- Update the automatic holiday insertion function to include 2027
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
    (NEW.id, '2025-06-02', 'Día de la Ascensión', true),
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
    (NEW.id, '2026-12-25', 'Navidad', true),
    -- 2027
    (NEW.id, '2027-01-01', 'Año Nuevo', true),
    (NEW.id, '2027-01-11', 'Día de los Reyes Magos', true),
    (NEW.id, '2027-03-22', 'Día de San José', true),
    (NEW.id, '2027-03-25', 'Jueves Santo', true),
    (NEW.id, '2027-03-26', 'Viernes Santo', true),
    (NEW.id, '2027-05-01', 'Día del Trabajo', true),
    (NEW.id, '2027-05-10', 'Día de la Ascensión', true),
    (NEW.id, '2027-05-31', 'Corpus Christi', true),
    (NEW.id, '2027-06-07', 'Sagrado Corazón', true),
    (NEW.id, '2027-07-05', 'San Pedro y San Pablo', true),
    (NEW.id, '2027-07-20', 'Día de la Independencia', true),
    (NEW.id, '2027-08-07', 'Batalla de Boyacá', true),
    (NEW.id, '2027-08-16', 'Asunción de la Virgen', true),
    (NEW.id, '2027-10-18', 'Día de la Raza', true),
    (NEW.id, '2027-11-01', 'Día de Todos los Santos', true),
    (NEW.id, '2027-11-15', 'Independencia de Cartagena', true),
    (NEW.id, '2027-12-08', 'Inmaculada Concepción', true),
    (NEW.id, '2027-12-25', 'Navidad', true)
  ON CONFLICT (company_id, holiday_date) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Backfill 2027 holidays for ALL existing companies
DO $$
DECLARE
    company_rec RECORD;
BEGIN
    FOR company_rec IN SELECT id FROM public.companies LOOP
        INSERT INTO public.company_holidays (company_id, holiday_date, name, is_national)
        VALUES
            (company_rec.id, '2027-01-01', 'Año Nuevo', true),
            (company_rec.id, '2027-01-11', 'Día de los Reyes Magos', true),
            (company_rec.id, '2027-03-22', 'Día de San José', true),
            (company_rec.id, '2027-03-25', 'Jueves Santo', true),
            (company_rec.id, '2027-03-26', 'Viernes Santo', true),
            (company_rec.id, '2027-05-01', 'Día del Trabajo', true),
            (company_rec.id, '2027-05-10', 'Día de la Ascensión', true),
            (company_rec.id, '2027-05-31', 'Corpus Christi', true),
            (company_rec.id, '2027-06-07', 'Sagrado Corazón', true),
            (company_rec.id, '2027-07-05', 'San Pedro y San Pablo', true),
            (company_rec.id, '2027-07-20', 'Día de la Independencia', true),
            (company_rec.id, '2027-08-07', 'Batalla de Boyacá', true),
            (company_rec.id, '2027-08-16', 'Asunción de la Virgen', true),
            (company_rec.id, '2027-10-18', 'Día de la Raza', true),
            (company_rec.id, '2027-11-01', 'Día de Todos los Santos', true),
            (company_rec.id, '2027-11-15', 'Independencia de Cartagena', true),
            (company_rec.id, '2027-12-08', 'Inmaculada Concepción', true),
            (company_rec.id, '2027-12-25', 'Navidad', true)
        ON CONFLICT (company_id, holiday_date) DO NOTHING;
    END LOOP;
END $$;
