-- Backfill contract/work-info/schedule data for employees hired from Selection
-- before the hiring flow started copying full vacancy/requisition metadata.

CREATE OR REPLACE FUNCTION public.get_next_contract_number(
  _company_id UUID,
  _prefix TEXT DEFAULT 'PC'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year INTEGER;
  _next_number INTEGER;
  _contract_number TEXT;
  _effective_prefix TEXT;
BEGIN
  _year := EXTRACT(YEAR FROM CURRENT_DATE);
  _effective_prefix := COALESCE(NULLIF(_prefix, ''), 'PC');

  INSERT INTO public.contract_sequences (company_id, year, last_number, prefix)
  VALUES (_company_id, _year, 1, _effective_prefix)
  ON CONFLICT (company_id, year)
  DO UPDATE SET
    last_number = contract_sequences.last_number + 1,
    prefix = _effective_prefix,
    updated_at = now()
  RETURNING last_number INTO _next_number;

  _contract_number := _effective_prefix || '-' || _year::TEXT || '-' || LPAD(_next_number::TEXT, 4, '0');

  RETURN _contract_number;
END;
$$;

DROP TABLE IF EXISTS pg_temp.selection_contract_backfill;

CREATE TEMP TABLE selection_contract_backfill ON COMMIT DROP AS
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
  SELECT
    co.id AS contract_id,
    ca.id AS candidate_id,
    ca.vacancy_id,
    2 AS priority,
    ca.updated_at AS created_at
  FROM public.contracts co
  JOIN public.candidates ca
    ON ca.employee_id = co.employee_id
   AND ca.company_id = co.company_id
  LEFT JOIN public.employee_work_info ewi
    ON ewi.employee_id = co.employee_id
   AND ewi.company_id = co.company_id
   AND ewi.is_current = true
  WHERE ca.status = 'hired'
    AND ca.is_selected = true
    AND (
      co.contract_number IS NULL
      OR btrim(co.contract_number) = ''
      OR co.work_city IS NULL
      OR co.work_address IS NULL
      OR co.salary_type IS NULL
      OR co.special_clauses IS NULL
      OR ewi.position_id IS NULL
      OR ewi.area_id IS NULL
      OR ewi.position_name IN ('Por definir', 'No especificado')
      OR ewi.work_city IS NULL
    )
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
    ca.id AS candidate_id,
    va.id AS vacancy_id,
    COALESCE(va.operation_center_id, pr.operation_center_id) AS operation_center_id,
    va.position_id,
    pr.area_id,
    COALESCE(NULLIF(va.position_title, ''), NULLIF(pr.cargo_solicitado, '')) AS position_name,
    oc.city AS operation_center_city,
    oc.address AS operation_center_address,
    va.salary_type AS vacancy_salary_type,
    va.includes_transport,
    COALESCE(pr.rrhh_asignacion_salarial, pr.salario_propuesto, ca.salary_expectation, va.salary_range_min) AS sourced_salary,
    pr.dia_descanso_obligatorio AS rest_day,
    pr.rrhh_condiciones_adicionales AS special_clauses,
    NULLIF(substring(COALESCE(pr.juridico_duracion, '') FROM '([0-9]+)'), '')::integer AS duration_months,
    (
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
      END
    )::public.contract_type AS normalized_contract_type
  FROM links li
  JOIN public.contracts co ON co.id = li.contract_id
  JOIN public.candidates ca ON ca.id = li.candidate_id
  JOIN public.vacancies va ON va.id = COALESCE(li.vacancy_id, ca.vacancy_id)
  LEFT JOIN public.personnel_requisitions pr ON pr.id = va.requisition_id
  LEFT JOIN public.operation_centers oc ON oc.id = COALESCE(va.operation_center_id, pr.operation_center_id)
  WHERE ca.employee_id = co.employee_id
    AND ca.company_id = co.company_id
  ORDER BY co.id, li.candidate_id
)
SELECT *
FROM source_data;

UPDATE public.contracts co
SET
  contract_type = CASE
    WHEN co.contract_type = 'indefinido'::public.contract_type THEN COALESCE(src.normalized_contract_type, co.contract_type)
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
    WHEN src.sourced_salary IS NOT NULL AND co.salary <= 0 THEN src.sourced_salary
    ELSE co.salary
  END,
  salary_type = COALESCE(NULLIF(co.salary_type, ''), NULLIF(src.vacancy_salary_type, ''), 'mensual'),
  transport_allowance = CASE
    WHEN COALESCE(co.transport_allowance, 0) <= 0 AND src.includes_transport IS TRUE THEN 140606
    ELSE COALESCE(co.transport_allowance, 0)
  END,
  work_city = COALESCE(NULLIF(co.work_city, ''), src.operation_center_city),
  work_address = COALESCE(NULLIF(co.work_address, ''), src.operation_center_address),
  has_confidentiality_clause = true,
  has_non_compete_clause = COALESCE(co.has_non_compete_clause, false),
  special_clauses = COALESCE(NULLIF(co.special_clauses, ''), NULLIF(src.special_clauses, '')),
  updated_at = now()
FROM selection_contract_backfill src
WHERE co.id = src.contract_id;

UPDATE public.employee_work_info ewi
SET
  operation_center_id = COALESCE(ewi.operation_center_id, src.operation_center_id),
  position_id = COALESCE(ewi.position_id, src.position_id),
  area_id = COALESCE(ewi.area_id, src.area_id),
  position_name = CASE
    WHEN ewi.position_name IS NULL OR ewi.position_name IN ('Por definir', 'No especificado') THEN COALESCE(src.position_name, ewi.position_name)
    ELSE ewi.position_name
  END,
  link_type = CASE
    WHEN ewi.link_type = 'indefinido'::public.link_type THEN COALESCE(src.normalized_contract_type::text, ewi.link_type::text)::public.link_type
    ELSE ewi.link_type
  END,
  work_city = COALESCE(NULLIF(ewi.work_city, ''), src.operation_center_city),
  updated_at = now()
FROM selection_contract_backfill src
WHERE ewi.employee_id = src.employee_id
  AND ewi.company_id = src.company_id
  AND ewi.is_current = true;

UPDATE public.employee_schedule es
SET
  payroll_type = COALESCE(es.payroll_type, 'quincenal'::public.payroll_type),
  rest_day = COALESCE(NULLIF(es.rest_day, ''), src.rest_day::text),
  is_office_schedule = COALESCE(es.is_office_schedule, true),
  updated_at = now()
FROM selection_contract_backfill src
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
  src.rest_day::text,
  true,
  co.start_date,
  true
FROM selection_contract_backfill src
JOIN public.contracts co ON co.id = src.contract_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employee_schedule es
  WHERE es.employee_id = src.employee_id
    AND es.company_id = src.company_id
    AND es.is_current = true
);

DO $$
DECLARE
  contract_row RECORD;
BEGIN
  FOR contract_row IN
    SELECT co.id, co.company_id
    FROM public.contracts co
    JOIN selection_contract_backfill src ON src.contract_id = co.id
    WHERE co.contract_number IS NULL OR btrim(co.contract_number) = ''
    ORDER BY co.created_at, co.id
  LOOP
    UPDATE public.contracts
    SET
      contract_number = public.get_next_contract_number(contract_row.company_id, 'PC'),
      updated_at = now()
    WHERE id = contract_row.id
      AND (contract_number IS NULL OR btrim(contract_number) = '');
  END LOOP;
END;
$$;

DROP TABLE IF EXISTS pg_temp.selection_contract_backfill;
