CREATE OR REPLACE FUNCTION private.complete_direct_employee_rehire(
  p_employee_id uuid,
  p_hiring jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  employee_row public.employees_v2%ROWTYPE;
  previous_cycle public.employee_employment_cycles%ROWTYPE;
  previous_contact public.employee_contact%ROWTYPE;
  center_row public.operation_centers%ROWTYPE;
  position_row public.positions%ROWTYPE;
  existing_audit public.audit_logs%ROWTYPE;
  existing_cycle public.employee_employment_cycles%ROWTYPE;
  cycle_id_value uuid;
  contract_id_value uuid;
  entry_exam_id_value uuid;
  cycle_number_value integer;
  contract_number_value text;
  request_id_value uuid;
  hire_date_value date;
  end_date_value date;
  operation_center_id_value uuid;
  position_id_value uuid;
  area_id_value uuid;
  contract_type_value text;
  link_type_value public.link_type;
  salary_value numeric;
  salary_type_value text;
  transport_allowance_value numeric;
  trial_days_value integer;
  reason_value text;
  requires_end_date_value boolean := false;
  prior_end_date date;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesion para completar una recontratacion directa';
  END IF;

  BEGIN
    request_id_value := NULLIF(p_hiring ->> 'request_id', '')::uuid;
    hire_date_value := NULLIF(p_hiring ->> 'hire_date', '')::date;
    end_date_value := NULLIF(p_hiring ->> 'end_date', '')::date;
    operation_center_id_value := NULLIF(p_hiring ->> 'operation_center_id', '')::uuid;
    position_id_value := NULLIF(p_hiring ->> 'position_id', '')::uuid;
    area_id_value := NULLIF(p_hiring ->> 'area_id', '')::uuid;
    salary_value := NULLIF(p_hiring ->> 'salary', '')::numeric;
    transport_allowance_value := COALESCE(NULLIF(p_hiring ->> 'transport_allowance', '')::numeric, 0);
    trial_days_value := COALESCE(NULLIF(p_hiring ->> 'trial_period_days', '')::integer, 0);
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Los datos de contratacion tienen un formato invalido';
  END;

  contract_type_value := NULLIF(btrim(p_hiring ->> 'contract_type'), '');
  salary_type_value := COALESCE(NULLIF(btrim(p_hiring ->> 'salary_type'), ''), 'mensual');
  reason_value := NULLIF(btrim(p_hiring ->> 'reason'), '');

  IF request_id_value IS NULL THEN
    RAISE EXCEPTION 'La solicitud de recontratacion no tiene un identificador valido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_employee_id::text, 0));

  SELECT * INTO employee_row
  FROM public.employees_v2 employee
  WHERE employee.id = p_employee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontro el empleado';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR (
      public.is_company_member(employee_row.company_id)
      AND public.check_user_permission((SELECT auth.uid()), 'recontratacion_directa', 'create')
    )
  ) THEN
    RAISE EXCEPTION 'No tiene permisos para ejecutar una recontratacion directa';
  END IF;

  SELECT * INTO existing_audit
  FROM public.audit_logs audit
  WHERE audit.company_id = employee_row.company_id
    AND audit.action = 'complete_direct_employee_rehire'
    AND audit.new_values ->> 'employee_id' = p_employee_id::text
    AND audit.new_values ->> 'request_id' = request_id_value::text
  ORDER BY audit.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO existing_cycle
    FROM public.employee_employment_cycles cycle
    WHERE cycle.id = (existing_audit.new_values ->> 'employment_cycle_id')::uuid;

    RETURN jsonb_build_object(
      'employee_id', p_employee_id,
      'employment_cycle_id', existing_cycle.id,
      'contract_id', existing_audit.new_values ->> 'contract_id',
      'entry_exam_id', existing_audit.new_values ->> 'entry_exam_id',
      'existing', true
    );
  END IF;

  IF employee_row.is_active OR employee_row.status IN ('active', 'en_retiro') THEN
    RAISE EXCEPTION 'El empleado ya tiene una vinculacion activa o un retiro sin finalizar';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.employee_employment_cycles cycle
    WHERE cycle.employee_id = p_employee_id AND cycle.status = 'active'
  ) THEN
    RAISE EXCEPTION 'El empleado ya tiene un ciclo laboral activo';
  END IF;

  IF hire_date_value IS NULL THEN
    RAISE EXCEPTION 'Debe indicar la fecha de ingreso';
  END IF;
  IF operation_center_id_value IS NULL OR position_id_value IS NULL OR area_id_value IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar centro de operacion, area y cargo';
  END IF;
  IF contract_type_value IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar el tipo de contrato';
  END IF;
  IF salary_value IS NULL OR salary_value <= 0 THEN
    RAISE EXCEPTION 'El salario debe ser mayor que cero';
  END IF;
  IF salary_type_value NOT IN ('mensual', 'integral') THEN
    RAISE EXCEPTION 'El tipo de salario no es valido';
  END IF;
  IF transport_allowance_value < 0 THEN
    RAISE EXCEPTION 'El auxilio de transporte no puede ser negativo';
  END IF;
  IF trial_days_value < 0 OR trial_days_value > 60 THEN
    RAISE EXCEPTION 'El periodo de prueba debe estar entre 0 y 60 dias';
  END IF;
  IF reason_value IS NULL OR char_length(reason_value) < 10 THEN
    RAISE EXCEPTION 'Debe registrar un motivo de al menos 10 caracteres';
  END IF;

  SELECT * INTO center_row
  FROM public.operation_centers center
  WHERE center.id = operation_center_id_value
    AND center.company_id = employee_row.company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El centro de operacion no pertenece a la empresa';
  END IF;

  SELECT * INTO position_row
  FROM public.positions position
  WHERE position.id = position_id_value
    AND position.company_id = employee_row.company_id
    AND COALESCE(position.is_active, true);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El cargo no pertenece a la empresa o esta inactivo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.areas area
    WHERE area.id = area_id_value AND area.company_id = employee_row.company_id
  ) THEN
    RAISE EXCEPTION 'El area no pertenece a la empresa';
  END IF;
  IF position_row.area_id IS NOT NULL AND position_row.area_id <> area_id_value THEN
    RAISE EXCEPTION 'El cargo seleccionado no pertenece al area indicada';
  END IF;

  SELECT COALESCE(config.requires_end_date, false) INTO requires_end_date_value
  FROM public.contract_type_config config
  WHERE config.company_id = employee_row.company_id
    AND config.contract_type = contract_type_value
    AND config.is_active
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El tipo de contrato no pertenece al catalogo activo de la empresa';
  END IF;

  IF requires_end_date_value AND end_date_value IS NULL THEN
    RAISE EXCEPTION 'El tipo de contrato seleccionado requiere fecha de finalizacion';
  END IF;
  IF end_date_value IS NOT NULL AND end_date_value <= hire_date_value THEN
    RAISE EXCEPTION 'La fecha de finalizacion debe ser posterior a la fecha de ingreso';
  END IF;

  link_type_value := CASE contract_type_value
    WHEN 'indefinido' THEN 'indefinido'::public.link_type
    WHEN 'fijo' THEN 'fijo'::public.link_type
    WHEN 'obra_labor' THEN 'obra_labor'::public.link_type
    WHEN 'aprendizaje' THEN 'aprendizaje'::public.link_type
    WHEN 'servicios' THEN 'servicios'::public.link_type
    WHEN 'temporal' THEN 'temporal'::public.link_type
    ELSE 'indefinido'::public.link_type
  END;

  SELECT * INTO previous_cycle
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = p_employee_id
  ORDER BY cycle.cycle_number DESC
  LIMIT 1;

  SELECT * INTO previous_contact
  FROM public.employee_contact contact
  WHERE contact.employee_id = p_employee_id
  ORDER BY contact.is_current DESC, contact.created_at DESC
  LIMIT 1;

  prior_end_date := hire_date_value - 1;
  UPDATE public.employee_contact SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = p_employee_id AND is_current;
  UPDATE public.employee_family SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = p_employee_id AND is_current;
  UPDATE public.employee_work_info SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date), termination_date = COALESCE(termination_date, prior_end_date)
  WHERE employee_id = p_employee_id AND is_current;
  UPDATE public.employee_bank_info SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = p_employee_id AND is_current;
  UPDATE public.employee_social_security SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = p_employee_id AND is_current;
  UPDATE public.employee_schedule SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = p_employee_id AND is_current;
  UPDATE public.employee_time_config SET is_active = false, end_date = COALESCE(end_date, prior_end_date)
  WHERE employee_id = p_employee_id AND COALESCE(is_active, false);

  UPDATE public.employees_v2
  SET is_active = true, status = 'active'
  WHERE id = p_employee_id;

  SELECT COALESCE(max(cycle.cycle_number), 0) + 1 INTO cycle_number_value
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = p_employee_id;

  INSERT INTO public.employee_employment_cycles (
    company_id, employee_id, candidate_id, cycle_number, status, source, start_date, created_by
  ) VALUES (
    employee_row.company_id, p_employee_id, NULL, cycle_number_value, 'active',
    'direct_rehire'::public.employment_cycle_source, hire_date_value, (SELECT auth.uid())
  ) RETURNING id INTO cycle_id_value;

  INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, position_id, area_id,
    position_name, work_city, hire_date, link_type, is_current,
    valid_from, observations, created_by, employment_cycle_id
  ) VALUES (
    p_employee_id, employee_row.company_id, operation_center_id_value, position_id_value, area_id_value,
    position_row.name, center_row.city, hire_date_value, link_type_value, true,
    hire_date_value, reason_value, (SELECT auth.uid()), cycle_id_value
  );

  SELECT public.get_next_contract_number(employee_row.company_id, NULL) INTO contract_number_value;
  IF contract_number_value IS NULL THEN
    RAISE EXCEPTION 'No se pudo generar el consecutivo del contrato';
  END IF;

  INSERT INTO public.contracts (
    employee_id, company_id, contract_number, contract_type, start_date, end_date,
    salary, salary_type, transport_allowance, trial_period_days, trial_end_date,
    work_city, work_address, has_confidentiality_clause, has_non_compete_clause,
    special_clauses, created_by, employment_cycle_id
  ) VALUES (
    p_employee_id, employee_row.company_id, contract_number_value, contract_type_value,
    hire_date_value, end_date_value, salary_value, salary_type_value, transport_allowance_value,
    trial_days_value, CASE WHEN trial_days_value > 0 THEN hire_date_value + trial_days_value ELSE NULL END,
    center_row.city, center_row.address, true, false,
    NULLIF(btrim(p_hiring ->> 'special_clauses'), ''), (SELECT auth.uid()), cycle_id_value
  ) RETURNING id INTO contract_id_value;

  INSERT INTO public.employee_contact (
    employee_id, company_id, email, personal_email, phone, mobile,
    residence_address, residence_neighborhood, residence_city, residence_department,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    is_current, valid_from, employment_cycle_id
  ) VALUES (
    p_employee_id, employee_row.company_id,
    previous_contact.email, previous_contact.personal_email, previous_contact.phone, previous_contact.mobile,
    previous_contact.residence_address, previous_contact.residence_neighborhood,
    previous_contact.residence_city, previous_contact.residence_department,
    previous_contact.emergency_contact_name, previous_contact.emergency_contact_phone,
    previous_contact.emergency_contact_relationship, true, hire_date_value, cycle_id_value
  );

  INSERT INTO public.employee_family (
    employee_id, company_id, spouse_works, children_count, is_current, valid_from, employment_cycle_id
  ) VALUES (p_employee_id, employee_row.company_id, false, 0, true, hire_date_value, cycle_id_value);

  INSERT INTO public.employee_schedule (
    employee_id, company_id, payroll_type, is_office_schedule, rest_day,
    is_current, valid_from, employment_cycle_id
  ) VALUES (
    p_employee_id, employee_row.company_id, 'quincenal', true,
    NULLIF(btrim(p_hiring ->> 'rest_day'), ''), true, hire_date_value, cycle_id_value
  );

  INSERT INTO public.employee_operation_center_assignments (
    employee_id, company_id, operation_center_id, created_by, employment_cycle_id
  ) VALUES (
    p_employee_id, employee_row.company_id, operation_center_id_value, (SELECT auth.uid()), cycle_id_value
  );

  INSERT INTO public.medical_exams (
    employee_id, company_id, exam_type, exam_date, result, concept,
    provider, doctor_name, observations, created_by, employment_cycle_id
  ) VALUES (
    p_employee_id, employee_row.company_id, 'ingreso', hire_date_value, 'pendiente',
    'Pendiente examen medico de ingreso', 'Por definir', 'Por definir',
    'Creado automaticamente por recontratacion directa', (SELECT auth.uid()), cycle_id_value
  ) RETURNING id INTO entry_exam_id_value;

  IF jsonb_typeof(COALESCE(p_hiring -> 'onboarding_tasks', '[]'::jsonb)) = 'array' THEN
    INSERT INTO public.employee_onboarding_tasks (
      employee_id, company_id, task_key, task_label, task_description,
      sort_order, employment_cycle_id
    )
    SELECT p_employee_id, employee_row.company_id, task.task_key, task.task_label,
      task.task_description, task.sort_order, cycle_id_value
    FROM jsonb_to_recordset(COALESCE(p_hiring -> 'onboarding_tasks', '[]'::jsonb)) AS task(
      task_key text, task_label text, task_description text, sort_order integer
    )
    WHERE task.task_key IS NOT NULL AND task.task_key <> 'examen_medico_ingreso';
  END IF;

  INSERT INTO public.employee_onboarding_tasks (
    employee_id, company_id, task_key, task_label, task_description,
    sort_order, employment_cycle_id
  ) VALUES (
    p_employee_id, employee_row.company_id, 'examen_medico_ingreso',
    'Completar examen medico de ingreso',
    'Registrar proveedor, medico, concepto y resultado del examen pendiente.',
    0, cycle_id_value
  );

  INSERT INTO public.vacation_balances (
    employee_id, company_id, period_start, period_end,
    days_accrued, days_taken, days_compensated, notes, employment_cycle_id
  ) VALUES (
    p_employee_id, employee_row.company_id, hire_date_value,
    (hire_date_value + INTERVAL '1 year - 1 day')::date,
    0, 0, 0, 'Saldo inicial del ciclo laboral', cycle_id_value
  );

  INSERT INTO public.leave_balances (
    employee_id, company_id, leave_type, year,
    entitled_days, used_days, pending_days, employment_cycle_id
  )
  SELECT p_employee_id, employee_row.company_id, leave_type_value,
    EXTRACT(YEAR FROM hire_date_value)::integer, 0, 0, 0, cycle_id_value
  FROM unnest(enum_range(NULL::public.leave_type)) AS leave_type_value;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name,
    old_values, new_values
  ) VALUES (
    (SELECT auth.uid()), (SELECT auth.jwt() ->> 'email'), employee_row.company_id,
    'complete_direct_employee_rehire', 'employee_employment_cycle', cycle_id_value,
    concat_ws(' ', employee_row.first_name, employee_row.last_name),
    jsonb_build_object('previous_cycle_id', previous_cycle.id, 'previous_cycle_number', previous_cycle.cycle_number),
    jsonb_build_object(
      'request_id', request_id_value,
      'employee_id', p_employee_id,
      'employment_cycle_id', cycle_id_value,
      'contract_id', contract_id_value,
      'entry_exam_id', entry_exam_id_value,
      'cycle_number', cycle_number_value,
      'source', 'direct_rehire',
      'reason', reason_value,
      'hire_date', hire_date_value,
      'end_date', end_date_value,
      'operation_center_id', operation_center_id_value,
      'position_id', position_id_value,
      'area_id', area_id_value,
      'contract_type', contract_type_value,
      'salary', salary_value
    )
  );

  RETURN jsonb_build_object(
    'employee_id', p_employee_id,
    'employment_cycle_id', cycle_id_value,
    'contract_id', contract_id_value,
    'entry_exam_id', entry_exam_id_value,
    'existing', false
  );
END;
$$;

REVOKE ALL ON FUNCTION private.complete_direct_employee_rehire(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.complete_direct_employee_rehire(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_direct_employee_rehire(
  p_employee_id uuid,
  p_hiring jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.complete_direct_employee_rehire(p_employee_id, p_hiring);
$$;

REVOKE ALL ON FUNCTION public.complete_direct_employee_rehire(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_direct_employee_rehire(uuid, jsonb) TO authenticated;
