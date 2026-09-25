CREATE OR REPLACE FUNCTION public.payroll_cut_change(
  p_company_id uuid,
  p_center_id uuid,
  p_level smallint,
  p_action text,
  p_date date,
  p_reason text,
  p_cut_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  c public.payroll_control_cuts;
  superior date;
  actor text;
  t text;
  missing bigint;
  missing_employees bigint;
  employee_names text;
  module_label text;
  action_permission text;
BEGIN
  action_permission := CASE p_action WHEN 'create' THEN 'create' WHEN 'update' THEN 'update' WHEN 'reopen' THEN 'approve' END;
  IF p_level NOT IN (1, 2) OR action_permission IS NULL THEN
    RAISE EXCEPTION 'Acción o nivel inválido';
  END IF;

  IF NOT payroll_private.can(p_company_id, CASE p_level WHEN 1 THEN 'cortes_control_nivel_uno' ELSE 'cortes_control_nivel_dos' END, action_permission)
    OR NOT public.check_center_access(p_company_id, p_center_id)
    OR NOT EXISTS (SELECT 1 FROM public.operation_centers WHERE id = p_center_id AND company_id = p_company_id)
  THEN
    RAISE EXCEPTION 'Empresa, centro o permiso no autorizado' USING ERRCODE='42501';
  END IF;

  IF length(btrim(coalesce(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'Escriba un motivo de al menos cinco caracteres' USING ERRCODE='22023';
  END IF;

  PERFORM payroll_private.lock_center(p_company_id, NULL);
  PERFORM payroll_private.lock_center(p_company_id, p_center_id);

  IF p_action <> 'reopen' THEN
    IF p_date IS NULL OR p_date > (clock_timestamp() AT TIME ZONE 'America/Bogota')::date THEN
      RAISE EXCEPTION 'La fecha debe ser hasta hoy' USING ERRCODE='22023';
    END IF;

    FOREACH t IN ARRAY ARRAY['employee_shift_assignments', 'payroll_novelties', 'employee_loans', 'employee_deductions', 'employee_time_config'] LOOP
      EXECUTE format('SELECT count(*) FROM public.%I WHERE company_id=$1 AND operation_center_id IS NULL', t)
        INTO missing USING p_company_id;

      IF missing > 0 THEN
        EXECUTE format($query$
          WITH unresolved AS (
            SELECT DISTINCT
              r.employee_id,
              coalesce(
                nullif(btrim(concat_ws(' ', e.first_name, e.middle_name, e.last_name, e.second_last_name)), ''),
                'Empleado sin nombre'
              ) || ' (' || coalesce(nullif(btrim(e.document_number), ''), 'sin documento') || ')' AS employee_label
            FROM public.%I r
            JOIN public.employees_v2 e ON e.id = r.employee_id AND e.company_id = r.company_id
            WHERE r.company_id = $1 AND r.operation_center_id IS NULL
          )
          SELECT
            (SELECT count(*) FROM unresolved),
            (SELECT string_agg(employee_label, ', ' ORDER BY employee_label)
             FROM (SELECT employee_label FROM unresolved ORDER BY employee_label LIMIT 8) listed)
        $query$, t) INTO missing_employees, employee_names USING p_company_id;

        module_label := CASE t
          WHEN 'employee_shift_assignments' THEN 'Jornadas'
          WHEN 'payroll_novelties' THEN 'Novedades'
          WHEN 'employee_loans' THEN 'Préstamos'
          WHEN 'employee_deductions' THEN 'Descuentos'
          WHEN 'employee_time_config' THEN 'Configuraciones de jornada'
          ELSE t
        END;

        RAISE EXCEPTION 'No se puede aplicar el corte. Falta asignar el centro de operación histórico a % empleado(s) en %: %. Revise la información laboral y vuelva a intentarlo.',
          missing_employees,
          module_label,
          coalesce(employee_names, 'empleados sin identificar') ||
            CASE WHEN missing_employees > 8 THEN format(' y %s más', missing_employees - 8) ELSE '' END
          USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;

  IF p_action <> 'create' THEN
    SELECT * INTO c
    FROM public.payroll_control_cuts
    WHERE id = p_cut_id
      AND company_id = p_company_id
      AND operation_center_id = p_center_id
      AND level = p_level
      AND active
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El corte cambió o ya está reabierto. Actualice la pantalla.' USING ERRCODE='40001';
    END IF;
  END IF;

  SELECT cutoff_date INTO superior
  FROM public.payroll_control_cuts
  WHERE company_id = p_company_id AND operation_center_id = p_center_id AND level = 2 AND active;

  IF p_level = 1 AND coalesce(CASE WHEN p_action = 'reopen' THEN c.cutoff_date ELSE p_date END, '-infinity'::date) < superior THEN
    RAISE EXCEPTION 'El nivel 1 debe estar desde % inclusive, límite del nivel Superior', superior USING ERRCODE='42501';
  END IF;

  SELECT coalesce(display_name, full_name, 'Usuario') INTO actor FROM public.user_profiles WHERE id = auth.uid();
  actor := coalesce(actor, 'Usuario');

  IF p_action = 'create' THEN
    INSERT INTO public.payroll_control_cuts(company_id, operation_center_id, level, cutoff_date, reason, created_by, created_by_name)
    VALUES (p_company_id, p_center_id, p_level, p_date, btrim(p_reason), auth.uid(), actor)
    RETURNING id INTO p_cut_id;
  ELSE
    UPDATE public.payroll_control_cuts
    SET cutoff_date = CASE WHEN p_action = 'reopen' THEN cutoff_date ELSE p_date END,
        active = p_action <> 'reopen',
        reason = btrim(p_reason)
    WHERE id = p_cut_id;
  END IF;

  INSERT INTO public.payroll_control_cut_events(cut_id, company_id, operation_center_id, level, action, old_date, new_date, reason, actor_id, actor_name)
  VALUES (p_cut_id, p_company_id, p_center_id, p_level, p_action, c.cutoff_date, CASE WHEN p_action <> 'reopen' THEN p_date END, btrim(p_reason), auth.uid(), actor);

  RETURN p_cut_id;
END
$$;

REVOKE ALL ON FUNCTION public.payroll_cut_change(uuid,uuid,smallint,text,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_cut_change(uuid,uuid,smallint,text,date,text,uuid) TO authenticated;
