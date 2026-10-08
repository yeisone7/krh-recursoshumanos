-- Preserve the previously shared rate before allowing independent edits.
ALTER TABLE public.payroll_labor_config ADD COLUMN surcharge_festivo integer;
UPDATE public.payroll_labor_config SET surcharge_festivo = surcharge_dominical;
ALTER TABLE public.payroll_labor_config
  ALTER COLUMN surcharge_festivo SET DEFAULT 75,
  ALTER COLUMN surcharge_festivo SET NOT NULL;

COMMENT ON COLUMN public.payroll_labor_config.surcharge_dominical IS
  'Porcentaje de recargo por trabajo en el día de descanso obligatorio.';
COMMENT ON COLUMN public.payroll_labor_config.surcharge_festivo IS
  'Porcentaje de recargo por trabajo en un día festivo.';

-- Append the field to retain the existing report view column order and permissions.
CREATE OR REPLACE VIEW report_data.payroll_labor_config
WITH (security_invoker = true, security_barrier = true) AS
SELECT b.created_at, b.created_by, b.daily_hours, b.display_unit, b.id,
  b.max_weekly_hours, b.night_end, b.night_start, b.surcharge_dominical,
  b.surcharge_hedf, b.surcharge_hedo, b.surcharge_henf, b.surcharge_heno,
  b.surcharge_rn, b.surcharge_rnf, b.updated_at, b.company_id, b.surcharge_festivo
FROM public.payroll_labor_config b
WHERE report_private.allowed(b.company_id, 'config_laboral', 'view');

UPDATE report_private.sources
SET fields = fields || '[{"key":"surcharge_festivo","label":"Recargo festivo (%)","type":"number"}]'::jsonb
WHERE key = 'payroll_labor_config'
  AND NOT fields @> '[{"key":"surcharge_festivo"}]'::jsonb;
