-- Return one compact row per active employee for the employee analytics page.
--
-- The previous frontend loaded ten complete company datasets (including work
-- history, contract history and one row per document) and discarded most of
-- them in the browser.  Keeping this function SECURITY INVOKER preserves the
-- existing table RLS policies while allowing Postgres to select/aggregate only
-- the single row that the dashboard needs from each related table.
CREATE OR REPLACE FUNCTION public.get_employee_analytics_dataset(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  document_number text,
  document_type text,
  first_name text,
  middle_name text,
  last_name text,
  second_last_name text,
  birth_date date,
  gender text,
  marital_status text,
  created_at timestamptz,
  work_info_id uuid,
  operation_center_id uuid,
  operation_center_name text,
  area_id uuid,
  area_name text,
  position_id uuid,
  position_name text,
  catalog_position_name text,
  hire_date date,
  termination_date date,
  contact_mobile text,
  contact_phone text,
  contact_email text,
  contact_personal_email text,
  eps text,
  afp text,
  arl text,
  ccf text,
  risk_level text,
  bank_name text,
  account_type text,
  account_registered boolean,
  children_count integer,
  spouse_name text,
  payroll_type text,
  is_office_schedule boolean,
  rest_day text,
  document_count bigint,
  contract_id uuid,
  salary numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    employee.id,
    employee.document_number,
    employee.document_type::text,
    employee.first_name,
    employee.middle_name,
    employee.last_name,
    employee.second_last_name,
    employee.birth_date,
    employee.gender::text,
    employee.marital_status::text,
    employee.created_at,
    work_info.id,
    COALESCE(work_info.operation_center_id, center_assignment.operation_center_id),
    operation_center.name,
    work_info.area_id,
    area.name,
    work_info.position_id,
    work_info.position_name,
    position.name,
    work_info.hire_date,
    work_info.termination_date,
    contact.mobile,
    contact.phone,
    contact.email,
    contact.personal_email,
    social_security.eps,
    social_security.afp,
    social_security.arl,
    social_security.ccf,
    social_security.risk_level::text,
    bank.bank_name,
    bank.account_type::text,
    bank.account_registered,
    family.children_count,
    family.spouse_name,
    schedule.payroll_type::text,
    schedule.is_office_schedule,
    schedule.rest_day,
    COALESCE(documents.document_count, 0),
    active_contract.id,
    active_contract.salary
  FROM public.employees_v2 AS employee
  LEFT JOIN LATERAL (
    SELECT info.*
    FROM public.employee_work_info AS info
    WHERE info.company_id = p_company_id
      AND info.employee_id = employee.id
    ORDER BY info.is_current DESC, info.created_at DESC, info.id DESC
    LIMIT 1
  ) AS work_info ON true
  LEFT JOIN LATERAL (
    SELECT assignment.operation_center_id
    FROM public.employee_operation_center_assignments AS assignment
    WHERE assignment.company_id = p_company_id
      AND assignment.employee_id = employee.id
    ORDER BY assignment.created_at DESC, assignment.id DESC
    LIMIT 1
  ) AS center_assignment ON work_info.operation_center_id IS NULL
  LEFT JOIN public.operation_centers AS operation_center
    ON operation_center.id = COALESCE(work_info.operation_center_id, center_assignment.operation_center_id)
  LEFT JOIN public.areas AS area ON area.id = work_info.area_id
  LEFT JOIN public.positions AS position ON position.id = work_info.position_id
  LEFT JOIN LATERAL (
    SELECT current_contact.*
    FROM public.employee_contact AS current_contact
    WHERE current_contact.company_id = p_company_id
      AND current_contact.employee_id = employee.id
      AND current_contact.is_current
    ORDER BY current_contact.created_at DESC, current_contact.id DESC
    LIMIT 1
  ) AS contact ON true
  LEFT JOIN LATERAL (
    SELECT current_social.*
    FROM public.employee_social_security AS current_social
    WHERE current_social.company_id = p_company_id
      AND current_social.employee_id = employee.id
      AND current_social.is_current
    ORDER BY current_social.created_at DESC, current_social.id DESC
    LIMIT 1
  ) AS social_security ON true
  LEFT JOIN LATERAL (
    SELECT current_bank.*
    FROM public.employee_bank_info AS current_bank
    WHERE current_bank.company_id = p_company_id
      AND current_bank.employee_id = employee.id
      AND current_bank.is_current
    ORDER BY current_bank.created_at DESC, current_bank.id DESC
    LIMIT 1
  ) AS bank ON true
  LEFT JOIN LATERAL (
    SELECT current_family.*
    FROM public.employee_family AS current_family
    WHERE current_family.company_id = p_company_id
      AND current_family.employee_id = employee.id
      AND current_family.is_current
    ORDER BY current_family.created_at DESC, current_family.id DESC
    LIMIT 1
  ) AS family ON true
  LEFT JOIN LATERAL (
    SELECT current_schedule.*
    FROM public.employee_schedule AS current_schedule
    WHERE current_schedule.company_id = p_company_id
      AND current_schedule.employee_id = employee.id
      AND current_schedule.is_current
    ORDER BY current_schedule.created_at DESC, current_schedule.id DESC
    LIMIT 1
  ) AS schedule ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS document_count
    FROM public.employee_documents AS document
    WHERE document.company_id = p_company_id
      AND document.employee_id = employee.id
      AND document.is_valid
  ) AS documents ON true
  LEFT JOIN LATERAL (
    SELECT contract.id, contract.salary
    FROM public.contracts AS contract
    LEFT JOIN LATERAL (
      SELECT extension.end_date
      FROM public.contract_extensions AS extension
      WHERE extension.contract_id = contract.id
      ORDER BY extension.extension_number DESC, extension.id DESC
      LIMIT 1
    ) AS latest_extension ON true
    WHERE contract.company_id = p_company_id
      AND contract.employee_id = employee.id
      AND contract.is_terminated IS NOT TRUE
      AND (
        COALESCE(latest_extension.end_date, contract.end_date) IS NULL
        OR COALESCE(latest_extension.end_date, contract.end_date) >= CURRENT_DATE
      )
    ORDER BY contract.created_at DESC, contract.id DESC
    LIMIT 1
  ) AS active_contract ON true
  WHERE employee.company_id = p_company_id
    AND employee.is_active
    AND employee.status = 'active'
  ORDER BY employee.id;
$$;

REVOKE ALL ON FUNCTION public.get_employee_analytics_dataset(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_analytics_dataset(uuid) TO authenticated;

-- Main relation and lateral lookups. Existing current-row indexes cover the
-- other related tables; these two partial indexes close the remaining hot paths.
CREATE INDEX IF NOT EXISTS employees_v2_company_active_id_idx
  ON public.employees_v2 (company_id, id)
  WHERE is_active = true AND status = 'active';

CREATE INDEX IF NOT EXISTS contracts_company_active_employee_created_idx
  ON public.contracts (company_id, employee_id, created_at DESC, id DESC)
  WHERE is_terminated IS NOT TRUE;
