-- Repair historical contracts created from Selection before the hiring flow
-- copied vacancy/requisition/contact metadata into the employee records.

DROP TABLE IF EXISTS pg_temp.selection_contract_document_repair;

CREATE TEMP TABLE selection_contract_document_repair ON COMMIT DROP AS
WITH audit_links AS (
  SELECT DISTINCT ON ((al.new_values->>'contract_id')::uuid)
    (al.new_values->>'contract_id')::uuid AS contract_id,
    (al.new_values->>'candidate_id')::uuid AS candidate_id,
    CASE
      WHEN (al.new_values->>'vacancy_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (al.new_values->>'vacancy_id')::uuid
      ELSE NULL
    END AS vacancy_id,
    1 AS priority,
    al.created_at
  FROM public.audit_logs al
  WHERE al.action = 'convert_candidate_to_employee'
    AND al.new_values ? 'contract_id'
    AND al.new_values ? 'candidate_id'
    AND (al.new_values->>'contract_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (al.new_values->>'candidate_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ORDER BY (al.new_values->>'contract_id')::uuid, al.created_at DESC
),
candidate_links AS (
  SELECT DISTINCT ON (co.id)
    co.id AS contract_id,
    ca.id AS candidate_id,
    ca.vacancy_id,
    2 AS priority,
    ca.updated_at AS created_at
  FROM public.contracts co
  JOIN public.employees_v2 emp ON emp.id = co.employee_id
  JOIN public.candidates ca
    ON ca.company_id = co.company_id
   AND (
     ca.employee_id = co.employee_id
     OR (
       ca.employee_id IS NULL
       AND ca.document_number = emp.document_number
     )
   )
  ORDER BY
    co.id,
    (ca.employee_id = co.employee_id) DESC,
    (ca.status = 'hired') DESC,
    COALESCE(ca.is_selected, false) DESC,
    ca.updated_at DESC
),
links AS (
  SELECT DISTINCT ON (contract_id)
    contract_id,
    candidate_id,
    vacancy_id
  FROM (
    SELECT * FROM audit_links
    UNION ALL
    SELECT * FROM candidate_links
  ) linked
  ORDER BY contract_id, priority, created_at DESC
),
source_data AS (
  SELECT DISTINCT ON (co.id)
    co.id AS contract_id,
    co.company_id,
    co.employee_id,
    co.start_date,
    ca.id AS candidate_id,
    ca.email AS candidate_email,
    ca.phone AS candidate_phone,
    ca.mobile AS candidate_mobile,
    ca.address AS candidate_address,
    ca.city AS candidate_city,
    ca.department AS candidate_department,
    va.id AS vacancy_id,
    COALESCE(va.operation_center_id, pr.operation_center_id) AS operation_center_id,
    va.position_id,
    pr.area_id,
    COALESCE(NULLIF(va.position_title, ''), NULLIF(pr.cargo_solicitado, '')) AS position_name,
    oc.name AS operation_center_name,
    oc.city AS operation_center_city,
    oc.address AS operation_center_address,
    va.salary_type AS vacancy_salary_type,
    va.includes_transport,
    COALESCE(pr.rrhh_asignacion_salarial, pr.salario_propuesto, ca.salary_expectation, va.salary_range_min) AS sourced_salary,
    pr.dia_descanso_obligatorio::text AS rest_day,
    pr.rrhh_condiciones_adicionales AS special_clauses,
    NULLIF(substring(COALESCE(pr.juridico_duracion, '') FROM '([0-9]+)'), '')::integer AS duration_months,
    CASE
      WHEN lower(btrim(COALESCE(NULLIF(pr.juridico_tipo_contrato, ''), NULLIF(pr.tipo_contrato_solicitado, ''), ''))) IN ('indefinido', 'fijo', 'obra_labor', 'aprendizaje', 'servicios')
        THEN lower(btrim(COALESCE(NULLIF(pr.juridico_tipo_contrato, ''), NULLIF(pr.tipo_contrato_solicitado, ''), '')))
      WHEN lower(COALESCE(pr.juridico_tipo_contrato, pr.tipo_contrato_solicitado, '')) LIKE '%obra%'
        OR lower(COALESCE(pr.juridico_tipo_contrato, pr.tipo_contrato_solicitado, '')) LIKE '%labor%'
        THEN 'obra_labor'
      WHEN lower(COALESCE(pr.juridico_tipo_contrato, pr.tipo_contrato_solicitado, '')) LIKE '%aprendiz%'
        THEN 'aprendizaje'
      WHEN lower(COALESCE(pr.juridico_tipo_contrato, pr.tipo_contrato_solicitado, '')) LIKE '%servicio%'
        THEN 'servicios'
      WHEN lower(COALESCE(pr.juridico_tipo_contrato, pr.tipo_contrato_solicitado, '')) LIKE '%fijo%'
        THEN 'fijo'
      WHEN lower(COALESCE(pr.juridico_tipo_contrato, pr.tipo_contrato_solicitado, '')) LIKE '%indef%'
        THEN 'indefinido'
      ELSE NULL
    END AS normalized_contract_type
  FROM links li
  JOIN public.contracts co ON co.id = li.contract_id
  JOIN public.candidates ca ON ca.id = li.candidate_id
  JOIN public.vacancies va ON va.id = COALESCE(li.vacancy_id, ca.vacancy_id)
  LEFT JOIN public.personnel_requisitions pr ON pr.id = va.requisition_id
  LEFT JOIN public.operation_centers oc ON oc.id = COALESCE(va.operation_center_id, pr.operation_center_id)
  WHERE ca.company_id = co.company_id
  ORDER BY co.id, ca.updated_at DESC
)
SELECT *
FROM source_data
WHERE
  position_name IS NOT NULL
  OR operation_center_id IS NOT NULL
  OR operation_center_city IS NOT NULL
  OR operation_center_address IS NOT NULL
  OR candidate_email IS NOT NULL
  OR candidate_phone IS NOT NULL
  OR candidate_mobile IS NOT NULL
  OR candidate_address IS NOT NULL
  OR candidate_city IS NOT NULL
  OR sourced_salary IS NOT NULL;

UPDATE public.contracts co
SET
  contract_type = CASE
    WHEN (co.contract_type IS NULL OR btrim(co.contract_type) = '' OR co.contract_type = 'indefinido')
      THEN COALESCE(src.normalized_contract_type, co.contract_type)
    ELSE co.contract_type
  END,
  end_date = COALESCE(
    co.end_date,
    CASE
      WHEN src.duration_months IS NOT NULL
      THEN (co.start_date + make_interval(months => src.duration_months))::date - 1
      ELSE NULL
    END
  ),
  salary = CASE
    WHEN src.sourced_salary IS NOT NULL AND COALESCE(co.salary, 0) <= 0 THEN src.sourced_salary
    ELSE co.salary
  END,
  salary_type = COALESCE(NULLIF(co.salary_type, ''), NULLIF(src.vacancy_salary_type, ''), 'mensual'),
  transport_allowance = CASE
    WHEN COALESCE(co.transport_allowance, 0) <= 0 AND src.includes_transport IS TRUE THEN 140606
    ELSE COALESCE(co.transport_allowance, 0)
  END,
  work_city = COALESCE(NULLIF(co.work_city, ''), src.operation_center_city),
  work_address = COALESCE(NULLIF(co.work_address, ''), src.operation_center_address),
  has_confidentiality_clause = COALESCE(co.has_confidentiality_clause, true),
  has_non_compete_clause = COALESCE(co.has_non_compete_clause, false),
  special_clauses = COALESCE(NULLIF(co.special_clauses, ''), NULLIF(src.special_clauses, '')),
  updated_at = now()
FROM selection_contract_document_repair src
WHERE co.id = src.contract_id;

UPDATE public.employee_work_info ewi
SET
  operation_center_id = COALESCE(ewi.operation_center_id, src.operation_center_id),
  position_id = COALESCE(ewi.position_id, src.position_id),
  area_id = COALESCE(ewi.area_id, src.area_id),
  position_name = CASE
    WHEN ewi.position_name IS NULL
      OR btrim(ewi.position_name) = ''
      OR lower(btrim(ewi.position_name)) IN ('por definir', 'no especificado', 'no asignado', 'no asignada')
    THEN COALESCE(src.position_name, ewi.position_name)
    ELSE ewi.position_name
  END,
  link_type = CASE
    WHEN ewi.link_type = 'indefinido'::public.link_type AND src.normalized_contract_type IS NOT NULL
    THEN src.normalized_contract_type::public.link_type
    ELSE ewi.link_type
  END,
  work_city = COALESCE(NULLIF(ewi.work_city, ''), src.operation_center_city),
  updated_at = now()
FROM selection_contract_document_repair src
WHERE ewi.employee_id = src.employee_id
  AND ewi.company_id = src.company_id
  AND ewi.is_current = true;

INSERT INTO public.employee_work_info (
  employee_id,
  company_id,
  operation_center_id,
  area_id,
  position_id,
  position_name,
  hire_date,
  link_type,
  work_city,
  valid_from,
  is_current
)
SELECT
  src.employee_id,
  src.company_id,
  src.operation_center_id,
  src.area_id,
  src.position_id,
  COALESCE(src.position_name, 'Por definir'),
  src.start_date,
  COALESCE(src.normalized_contract_type, 'indefinido')::public.link_type,
  src.operation_center_city,
  src.start_date,
  true
FROM selection_contract_document_repair src
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employee_work_info ewi
  WHERE ewi.employee_id = src.employee_id
    AND ewi.company_id = src.company_id
    AND ewi.is_current = true
);

UPDATE public.employee_contact ec
SET
  email = COALESCE(NULLIF(ec.email, ''), NULLIF(src.candidate_email, '')),
  personal_email = COALESCE(NULLIF(ec.personal_email, ''), NULLIF(src.candidate_email, '')),
  phone = COALESCE(NULLIF(ec.phone, ''), NULLIF(src.candidate_phone, '')),
  mobile = COALESCE(NULLIF(ec.mobile, ''), NULLIF(src.candidate_mobile, ''), NULLIF(src.candidate_phone, '')),
  residence_address = COALESCE(NULLIF(ec.residence_address, ''), NULLIF(src.candidate_address, '')),
  residence_city = COALESCE(NULLIF(ec.residence_city, ''), NULLIF(src.candidate_city, '')),
  residence_department = COALESCE(NULLIF(ec.residence_department, ''), NULLIF(src.candidate_department, '')),
  updated_at = now()
FROM selection_contract_document_repair src
WHERE ec.employee_id = src.employee_id
  AND ec.company_id = src.company_id
  AND ec.is_current = true;

INSERT INTO public.employee_contact (
  employee_id,
  company_id,
  email,
  personal_email,
  phone,
  mobile,
  residence_address,
  residence_city,
  residence_department,
  valid_from,
  is_current
)
SELECT
  src.employee_id,
  src.company_id,
  src.candidate_email,
  src.candidate_email,
  src.candidate_phone,
  COALESCE(src.candidate_mobile, src.candidate_phone),
  src.candidate_address,
  src.candidate_city,
  src.candidate_department,
  src.start_date,
  true
FROM selection_contract_document_repair src
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employee_contact ec
  WHERE ec.employee_id = src.employee_id
    AND ec.company_id = src.company_id
    AND ec.is_current = true
);

UPDATE public.employee_schedule es
SET
  payroll_type = COALESCE(es.payroll_type, 'quincenal'::public.payroll_type),
  rest_day = COALESCE(NULLIF(es.rest_day, ''), NULLIF(src.rest_day, '')),
  is_office_schedule = COALESCE(es.is_office_schedule, true),
  updated_at = now()
FROM selection_contract_document_repair src
WHERE es.employee_id = src.employee_id
  AND es.company_id = src.company_id
  AND es.is_current = true;

INSERT INTO public.employee_schedule (
  employee_id,
  company_id,
  payroll_type,
  rest_day,
  is_office_schedule,
  valid_from,
  is_current
)
SELECT
  src.employee_id,
  src.company_id,
  'quincenal'::public.payroll_type,
  src.rest_day,
  true,
  src.start_date,
  true
FROM selection_contract_document_repair src
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employee_schedule es
  WHERE es.employee_id = src.employee_id
    AND es.company_id = src.company_id
    AND es.is_current = true
);

DROP TABLE IF EXISTS pg_temp.selection_contract_document_repair;
