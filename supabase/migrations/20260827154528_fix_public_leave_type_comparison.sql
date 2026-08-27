-- Request JSON carries the leave type as text. Production still stores leave
-- types as public.leave_type, while newer schemas use text for custom types.
-- Resolve by text and reuse the concrete type from leave_type_config so this
-- creator remains valid during and after that schema transition.
CREATE OR REPLACE FUNCTION private.create_leave_request_core(
  p_company_id uuid,
  p_employee_id uuid,
  p_request jsonb,
  p_created_by uuid,
  p_submission_source text,
  p_public_token_id uuid DEFAULT NULL,
  p_document_url text DEFAULT NULL,
  p_document_name text DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_config public.leave_type_config%ROWTYPE;
  v_request public.leave_requests%ROWTYPE;
  v_request_id uuid;
  v_reference text;
  v_leave_type text := nullif(btrim(p_request->>'leave_type'), '');
  v_duration text := coalesce(nullif(btrim(p_request->>'duration_type'), ''), 'dias_completos');
  v_start_date date;
  v_end_date date;
  v_start_time time;
  v_end_time time;
  v_total_days numeric(5,2);
  v_total_hours numeric(5,2);
  v_reason text := nullif(btrim(p_request->>'reason'), '');
  v_used_this_year numeric := 0;
  v_available numeric;
BEGIN
  IF p_submission_source NOT IN ('internal', 'employee_portal', 'public_link') THEN
    RAISE EXCEPTION 'Origen de solicitud inválido.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.employees_v2 employee
    WHERE employee.id = p_employee_id
      AND employee.company_id = p_company_id
      AND employee.is_active
      AND employee.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.employee_employment_cycles cycle
        WHERE cycle.employee_id = employee.id
          AND cycle.company_id = employee.company_id
          AND cycle.status = 'active'
      )
  ) THEN
    RAISE EXCEPTION 'El empleado no tiene una vinculación laboral activa.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_employee_id::text || ':' || coalesce(v_leave_type, ''), 0)
  );
  IF v_leave_type IS NULL OR v_reason IS NULL OR char_length(v_reason) < 10 THEN
    RAISE EXCEPTION 'Completa el tipo de permiso y un motivo de al menos 10 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF coalesce(p_request->>'start_date', '') !~ '^\d{4}-\d{2}-\d{2}$'
    OR coalesce(p_request->>'end_date', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Las fechas de la solicitud no son válidas.' USING ERRCODE = '22023';
  END IF;

  v_start_date := (p_request->>'start_date')::date;
  v_end_date := (p_request->>'end_date')::date;
  IF v_end_date < v_start_date THEN
    RAISE EXCEPTION 'La fecha final no puede ser anterior a la fecha inicial.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_config
  FROM public.leave_type_config config
  WHERE config.company_id = p_company_id
    AND config.leave_type::text = v_leave_type
    AND config.is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El tipo de permiso no está disponible.' USING ERRCODE = '22023';
  END IF;
  IF v_start_date < current_date + coalesce(v_config.min_days_advance, 0) THEN
    RAISE EXCEPTION 'La solicitud no cumple la anticipación mínima del tipo de permiso.' USING ERRCODE = '22023';
  END IF;
  IF v_config.requires_document AND nullif(btrim(p_document_url), '') IS NULL THEN
    RAISE EXCEPTION 'Este tipo de permiso requiere un soporte.' USING ERRCODE = '22023';
  END IF;

  IF v_duration = 'dias_completos' THEN
    SELECT count(*)::numeric INTO v_total_days
    FROM generate_series(v_start_date, v_end_date, interval '1 day') day_value
    WHERE extract(dow FROM day_value) <> 0
      AND NOT EXISTS (
        SELECT 1 FROM public.company_holidays holiday
        WHERE holiday.company_id = p_company_id
          AND holiday.holiday_date = day_value::date
          AND holiday.is_active
      );
  ELSIF v_duration = 'medio_dia' THEN
    IF NOT coalesce(v_config.allows_half_day, false) OR v_start_date <> v_end_date THEN
      RAISE EXCEPTION 'Este tipo de permiso no admite medio día o el rango es inválido.' USING ERRCODE = '22023';
    END IF;
    v_total_days := 0.5;
  ELSIF v_duration = 'horas' THEN
    IF NOT coalesce(v_config.allows_hours, false) OR v_start_date <> v_end_date
      OR coalesce(p_request->>'start_time', '') !~ '^\d{2}:\d{2}$'
      OR coalesce(p_request->>'end_time', '') !~ '^\d{2}:\d{2}$' THEN
      RAISE EXCEPTION 'Este tipo de permiso no admite horas o el horario es inválido.' USING ERRCODE = '22023';
    END IF;
    v_start_time := (p_request->>'start_time')::time;
    v_end_time := (p_request->>'end_time')::time;
    v_total_hours := round((extract(epoch FROM (v_end_time - v_start_time)) / 3600.0)::numeric, 2);
    IF v_total_hours <= 0 OR v_total_hours > 8 THEN
      RAISE EXCEPTION 'La duración por horas debe ser mayor que cero y no superar 8 horas.' USING ERRCODE = '22023';
    END IF;
    v_total_days := round(v_total_hours / 8.0, 2);
  ELSE
    RAISE EXCEPTION 'La duración seleccionada no es válida.' USING ERRCODE = '22023';
  END IF;
  IF v_total_days <= 0 THEN
    RAISE EXCEPTION 'El rango seleccionado no contiene días laborables.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vacation_requests request
    WHERE request.employee_id = p_employee_id
      AND request.status <> 'cancelado'
      AND request.start_date <= v_end_date AND request.end_date >= v_start_date
  ) OR EXISTS (
    SELECT 1 FROM public.leave_requests request
    WHERE request.employee_id = p_employee_id
      AND request.status NOT IN ('cancelado', 'rechazado')
      AND request.start_date <= v_end_date AND request.end_date >= v_start_date
  ) OR EXISTS (
    SELECT 1 FROM public.employee_incapacities incapacity
    WHERE incapacity.employee_id = p_employee_id
      AND incapacity.start_date <= v_end_date AND incapacity.end_date >= v_start_date
  ) THEN
    RAISE EXCEPTION 'Las fechas se cruzan con otra ausencia registrada.' USING ERRCODE = '23P01';
  END IF;

  IF v_config.max_days_per_year IS NOT NULL THEN
    SELECT coalesce(sum(request.total_days), 0) INTO v_used_this_year
    FROM public.leave_requests request
    WHERE request.employee_id = p_employee_id
      AND request.leave_type::text = v_leave_type
      AND extract(year FROM request.start_date) = extract(year FROM v_start_date)
      AND request.status NOT IN ('cancelado', 'rechazado');
    IF v_used_this_year + v_total_days > v_config.max_days_per_year THEN
      RAISE EXCEPTION 'La solicitud supera el máximo anual configurado.' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT balance.available_days INTO v_available
  FROM public.leave_balances balance
  WHERE balance.employee_id = p_employee_id
    AND balance.leave_type::text = v_leave_type
    AND balance.year = extract(year FROM v_start_date)::integer;
  IF FOUND AND v_total_days > v_available THEN
    RAISE EXCEPTION 'La solicitud supera el saldo disponible.' USING ERRCODE = '22023';
  END IF;

  LOOP
    v_request_id := gen_random_uuid();
    v_reference := CASE WHEN p_submission_source = 'public_link'
      THEN 'PER-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_request_id::text, '-', ''), 1, 8))
      ELSE NULL
    END;
    EXIT WHEN v_reference IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.leave_requests request WHERE request.public_reference = v_reference
    );
  END LOOP;

  PERFORM set_config('app.leave_workflow_rpc', 'on', true);
  INSERT INTO public.leave_requests (
    id, employee_id, company_id, leave_type, duration_type,
    start_date, end_date, start_time, end_time, total_days, total_hours,
    reason, document_url, document_name, status, approval_stage,
    created_by, submission_source, public_reference, public_access_token_id
  ) VALUES (
    v_request_id, p_employee_id, p_company_id, v_config.leave_type, v_duration::public.leave_duration_type,
    v_start_date, v_end_date, v_start_time, v_end_time, v_total_days, v_total_hours,
    v_reason, nullif(btrim(p_document_url), ''), nullif(btrim(p_document_name), ''),
    'pendiente', 'pending_manager', p_created_by, p_submission_source,
    v_reference, p_public_token_id
  ) RETURNING * INTO v_request;

  UPDATE public.leave_balances
  SET pending_days = pending_days + v_total_days
  WHERE employee_id = p_employee_id
    AND leave_type::text = v_leave_type
    AND year = extract(year FROM v_start_date)::integer;

  RETURN v_request;
END;
$$;
