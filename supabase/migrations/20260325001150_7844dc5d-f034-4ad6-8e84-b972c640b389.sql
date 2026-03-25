
CREATE OR REPLACE FUNCTION public.check_candidate_background(
  p_document_number text,
  p_document_type text DEFAULT 'CC',
  p_company_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
  v_employee_data json;
  v_disciplinary_data json;
  v_candidacy_data json;
  v_employee_id uuid;
BEGIN
  -- Check if was employee
  SELECT json_build_object(
    'found', true,
    'employee_id', e.id,
    'first_name', e.first_name,
    'last_name', e.last_name,
    'is_active', e.is_active,
    'hire_date', (SELECT ewi.hire_date FROM employee_work_info ewi WHERE ewi.employee_id = e.id AND ewi.is_current = true LIMIT 1),
    'termination_date', (SELECT ewi.termination_date FROM employee_work_info ewi WHERE ewi.employee_id = e.id ORDER BY ewi.created_at DESC LIMIT 1)
  ), e.id
  INTO v_employee_data, v_employee_id
  FROM employees_v2 e
  WHERE e.document_number = p_document_number
    AND (p_company_id IS NULL OR e.company_id = p_company_id)
  LIMIT 1;

  IF v_employee_data IS NULL THEN
    v_employee_data := json_build_object('found', false);
  END IF;

  -- Check disciplinary processes
  IF v_employee_id IS NOT NULL THEN
    SELECT COALESCE(json_agg(json_build_object(
      'id', dp.id,
      'case_number', dp.case_number,
      'status', dp.status,
      'fault_type', dp.fault_type,
      'opening_date', dp.opening_date,
      'sanction_type', dp.sanction_type
    )), '[]'::json)
    INTO v_disciplinary_data
    FROM disciplinary_processes dp
    WHERE dp.employee_id = v_employee_id
      AND (p_company_id IS NULL OR dp.company_id = p_company_id);
  ELSE
    v_disciplinary_data := '[]'::json;
  END IF;

  -- Check previous candidacies
  SELECT COALESCE(json_agg(json_build_object(
    'id', c.id,
    'vacancy_id', c.vacancy_id,
    'status', c.status,
    'first_name', c.first_name,
    'last_name', c.last_name,
    'email', c.email,
    'mobile', c.mobile,
    'phone', c.phone,
    'address', c.address,
    'neighborhood', c.neighborhood,
    'city', c.city,
    'department', c.department,
    'birth_date', c.birth_date,
    'gender', c.gender,
    'gender_identity', c.gender_identity,
    'education_level', c.education_level,
    'profession', c.profession,
    'experience_years', c.experience_years,
    'current_company', c.current_company,
    'current_position', c.current_position,
    'application_date', c.application_date,
    'vacancy_title', (SELECT v.position_title FROM vacancies v WHERE v.id = c.vacancy_id)
  ) ORDER BY c.application_date DESC), '[]'::json)
  INTO v_candidacy_data
  FROM candidates c
  JOIN vacancies v ON v.id = c.vacancy_id
  WHERE c.document_number = p_document_number
    AND (p_company_id IS NULL OR v.company_id = p_company_id);

  v_result := json_build_object(
    'was_employee', v_employee_data,
    'disciplinary_processes', v_disciplinary_data,
    'previous_candidacies', v_candidacy_data
  );

  RETURN v_result;
END;
$$;
