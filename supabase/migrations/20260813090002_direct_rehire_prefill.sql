CREATE OR REPLACE FUNCTION private.get_direct_employee_rehire_prefill(p_employee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  employee_row public.employees_v2%ROWTYPE;
  work_row public.employee_work_info%ROWTYPE;
  contract_row public.contracts%ROWTYPE;
  schedule_row public.employee_schedule%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesion para consultar la recontratacion directa';
  END IF;

  SELECT * INTO employee_row
  FROM public.employees_v2 employee
  WHERE employee.id = p_employee_id;

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
    RAISE EXCEPTION 'No tiene permisos para consultar una recontratacion directa';
  END IF;

  SELECT * INTO work_row
  FROM public.employee_work_info work_info
  WHERE work_info.employee_id = p_employee_id
  ORDER BY work_info.created_at DESC
  LIMIT 1;

  SELECT * INTO contract_row
  FROM public.contracts contract
  WHERE contract.employee_id = p_employee_id
  ORDER BY contract.created_at DESC
  LIMIT 1;

  SELECT * INTO schedule_row
  FROM public.employee_schedule schedule
  WHERE schedule.employee_id = p_employee_id
  ORDER BY schedule.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'work', jsonb_build_object(
      'operation_center_id', work_row.operation_center_id,
      'area_id', work_row.area_id,
      'position_id', work_row.position_id
    ),
    'contract', jsonb_build_object(
      'contract_type', contract_row.contract_type,
      'salary', contract_row.salary,
      'salary_type', contract_row.salary_type,
      'transport_allowance', contract_row.transport_allowance,
      'trial_period_days', contract_row.trial_period_days,
      'special_clauses', contract_row.special_clauses
    ),
    'schedule', jsonb_build_object('rest_day', schedule_row.rest_day)
  );
END;
$$;

REVOKE ALL ON FUNCTION private.get_direct_employee_rehire_prefill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_direct_employee_rehire_prefill(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_direct_employee_rehire_prefill(p_employee_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.get_direct_employee_rehire_prefill(p_employee_id);
$$;

REVOKE ALL ON FUNCTION public.get_direct_employee_rehire_prefill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_direct_employee_rehire_prefill(uuid) TO authenticated;
