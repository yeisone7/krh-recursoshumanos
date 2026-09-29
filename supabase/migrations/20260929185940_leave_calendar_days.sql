-- All three entry points use this core: internal, employee portal and public link.
-- Patch only the full-day calculation, preserving installed workflow validations.
DO $migration$
DECLARE
  v_definition text;
  v_updated_definition text;
  v_old_calculation constant text := $old$    SELECT count(*)::numeric INTO v_total_days
    FROM generate_series(v_start_date, v_end_date, interval '1 day') day_value
    WHERE extract(dow FROM day_value) <> 0
      AND NOT EXISTS (
        SELECT 1 FROM public.company_holidays holiday
        WHERE holiday.company_id = p_company_id
          AND holiday.holiday_date = day_value::date
          AND holiday.is_active
      );$old$;
BEGIN
  SELECT pg_get_functiondef(
    'private.create_leave_request_core(uuid,uuid,jsonb,uuid,text,uuid,text,text)'::regprocedure
  ) INTO v_definition;

  v_updated_definition := replace(v_definition, v_old_calculation,
    '    v_total_days := v_end_date - v_start_date + 1;');
  IF v_updated_definition = v_definition THEN
    RAISE EXCEPTION 'Expected full-day leave calculation was not found; review before applying.';
  END IF;
  v_updated_definition := replace(v_updated_definition,
    'El rango seleccionado no contiene días laborables.',
    'La duración del permiso debe ser mayor que cero.');

  EXECUTE v_updated_definition;
END;
$migration$;
