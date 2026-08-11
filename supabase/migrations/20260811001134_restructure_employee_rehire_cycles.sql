-- Rehire lifecycle: one employee identity, multiple isolated employment cycles.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_cycle_status') THEN
    CREATE TYPE public.employment_cycle_status AS ENUM ('active', 'terminated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_cycle_source') THEN
    CREATE TYPE public.employment_cycle_source AS ENUM ('selection', 'rehire', 'manual', 'backfill');
  END IF;
END
$$;

-- This catalog is referenced throughout the employee and selection UI but was
-- absent from older local migration histories.
CREATE TABLE IF NOT EXISTS public.identification_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

ALTER TABLE public.identification_types ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.identification_types TO authenticated;

DROP POLICY IF EXISTS "Company members can view identification types" ON public.identification_types;
CREATE POLICY "Company members can view identification types" ON public.identification_types
FOR SELECT TO authenticated USING (public.is_super_admin() OR public.is_company_member(company_id));

DROP POLICY IF EXISTS "Catalog managers can create identification types" ON public.identification_types;
CREATE POLICY "Catalog managers can create identification types" ON public.identification_types
FOR INSERT TO authenticated WITH CHECK (
  public.is_super_admin() OR (
    public.is_company_member(company_id)
    AND (public.is_admin_or_rrhh() OR public.check_user_permission((SELECT auth.uid()), 'catalogos_tipos_identificacion', 'create'))
  )
);

DROP POLICY IF EXISTS "Catalog managers can update identification types" ON public.identification_types;
CREATE POLICY "Catalog managers can update identification types" ON public.identification_types
FOR UPDATE TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission((SELECT auth.uid()), 'catalogos_tipos_identificacion', 'update'))))
WITH CHECK (public.is_super_admin() OR (public.is_company_member(company_id) AND (public.is_admin_or_rrhh() OR public.check_user_permission((SELECT auth.uid()), 'catalogos_tipos_identificacion', 'update'))));

DROP POLICY IF EXISTS "Catalog managers can delete identification types" ON public.identification_types;
CREATE POLICY "Catalog managers can delete identification types" ON public.identification_types
FOR DELETE TO authenticated USING (
  public.is_super_admin() OR (
    public.is_company_member(company_id)
    AND (public.is_admin_or_rrhh() OR public.check_user_permission((SELECT auth.uid()), 'catalogos_tipos_identificacion', 'delete'))
  )
);

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS identification_type_id uuid REFERENCES public.identification_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS education_level_id uuid REFERENCES public.education_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profession_id uuid REFERENCES public.professions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rehire_employee_id uuid REFERENCES public.employees_v2(id) ON DELETE SET NULL;

ALTER TABLE public.employees_v2
  ADD COLUMN IF NOT EXISTS identification_type_id uuid REFERENCES public.identification_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS education_level_id uuid REFERENCES public.education_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profession_id uuid REFERENCES public.professions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS candidates_rehire_employee_idx
  ON public.candidates (rehire_employee_id)
  WHERE rehire_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS candidates_identification_type_id_idx ON public.candidates (identification_type_id);
CREATE INDEX IF NOT EXISTS employees_v2_identification_type_id_idx ON public.employees_v2 (identification_type_id);

CREATE TABLE IF NOT EXISTS public.employee_employment_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  cycle_number integer NOT NULL,
  status public.employment_cycle_status NOT NULL,
  source public.employment_cycle_source NOT NULL DEFAULT 'selection',
  start_date date NOT NULL,
  end_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_employment_cycles_dates_check
    CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT employee_employment_cycles_employee_number_key
    UNIQUE (employee_id, cycle_number),
  CONSTRAINT employee_employment_cycles_candidate_key
    UNIQUE (candidate_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_employment_cycles_one_active_idx
  ON public.employee_employment_cycles (employee_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS employee_employment_cycles_company_idx
  ON public.employee_employment_cycles (company_id, status);

CREATE INDEX IF NOT EXISTS employee_employment_cycles_employee_idx
  ON public.employee_employment_cycles (employee_id, cycle_number DESC);

ALTER TABLE public.employee_employment_cycles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.employee_employment_cycles TO authenticated;

-- SECURITY INVOKER operations need table privileges in addition to RLS policies.
-- Keep these grants limited to the data read or written while starting a rehire.
GRANT SELECT ON public.employees_v2, public.employee_contact, public.vacancies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.candidates TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "Company members can view employment cycles" ON public.employee_employment_cycles;
CREATE POLICY "Company members can view employment cycles"
ON public.employee_employment_cycles
FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
  )
);

DROP POLICY IF EXISTS "Authorized users can create employment cycles" ON public.employee_employment_cycles;
CREATE POLICY "Authorized users can create employment cycles"
ON public.employee_employment_cycles
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.is_psicologo()
      OR public.check_user_permission((SELECT auth.uid()), 'seleccion', 'update')
      OR public.check_user_permission((SELECT auth.uid()), 'empleados', 'create')
    )
  )
);

DROP POLICY IF EXISTS "Authorized users can update employment cycles" ON public.employee_employment_cycles;
CREATE POLICY "Authorized users can update employment cycles"
ON public.employee_employment_cycles
FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission((SELECT auth.uid()), 'seleccion', 'update')
      OR public.check_user_permission((SELECT auth.uid()), 'empleados', 'update')
      OR public.check_user_permission((SELECT auth.uid()), 'contratos', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.has_employee_v2_access(employee_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission((SELECT auth.uid()), 'seleccion', 'update')
      OR public.check_user_permission((SELECT auth.uid()), 'empleados', 'update')
      OR public.check_user_permission((SELECT auth.uid()), 'contratos', 'update')
    )
  )
);

-- Additive cycle scope. NULL remains valid for records that cannot be mapped safely.
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_work_info ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_terminations ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_contact ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_family ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_family_members ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_bank_info ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_social_security ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_schedule ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_time_config ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_operation_center_assignments ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.medical_exams ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.employee_onboarding_tasks ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.vacation_balances ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;
ALTER TABLE public.leave_balances ADD COLUMN IF NOT EXISTS employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contracts_employment_cycle_idx ON public.contracts (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_work_info_employment_cycle_idx ON public.employee_work_info (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_terminations_employment_cycle_idx ON public.employee_terminations (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_contact_employment_cycle_idx ON public.employee_contact (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_family_employment_cycle_idx ON public.employee_family (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_family_members_employment_cycle_idx ON public.employee_family_members (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_bank_info_employment_cycle_idx ON public.employee_bank_info (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_social_security_employment_cycle_idx ON public.employee_social_security (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_schedule_employment_cycle_idx ON public.employee_schedule (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_time_config_employment_cycle_idx ON public.employee_time_config (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_operation_centers_employment_cycle_idx ON public.employee_operation_center_assignments (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_documents_employment_cycle_idx ON public.employee_documents (employment_cycle_id);
CREATE INDEX IF NOT EXISTS medical_exams_employment_cycle_idx ON public.medical_exams (employment_cycle_id);
CREATE INDEX IF NOT EXISTS employee_onboarding_tasks_employment_cycle_idx ON public.employee_onboarding_tasks (employment_cycle_id);
CREATE INDEX IF NOT EXISTS vacation_balances_employment_cycle_idx ON public.vacation_balances (employment_cycle_id);
CREATE INDEX IF NOT EXISTS leave_balances_employment_cycle_idx ON public.leave_balances (employment_cycle_id);

ALTER TABLE public.employee_operation_center_assignments
  DROP CONSTRAINT IF EXISTS employee_operation_center_assignments_unique;
CREATE UNIQUE INDEX IF NOT EXISTS employee_operation_centers_cycle_unique_idx
  ON public.employee_operation_center_assignments (employment_cycle_id, operation_center_id)
  WHERE employment_cycle_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employee_operation_centers_legacy_unique_idx
  ON public.employee_operation_center_assignments (employee_id, operation_center_id)
  WHERE employment_cycle_id IS NULL;

ALTER TABLE public.employee_onboarding_tasks
  DROP CONSTRAINT IF EXISTS employee_onboarding_tasks_employee_id_task_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS employee_onboarding_tasks_cycle_key_idx
  ON public.employee_onboarding_tasks (employment_cycle_id, task_key)
  WHERE employment_cycle_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employee_onboarding_tasks_legacy_key_idx
  ON public.employee_onboarding_tasks (employee_id, task_key)
  WHERE employment_cycle_id IS NULL;

ALTER TABLE public.leave_balances
  DROP CONSTRAINT IF EXISTS leave_balances_employee_id_leave_type_year_key;
CREATE UNIQUE INDEX IF NOT EXISTS leave_balances_cycle_type_year_idx
  ON public.leave_balances (employment_cycle_id, leave_type, year)
  WHERE employment_cycle_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS leave_balances_legacy_type_year_idx
  ON public.leave_balances (employee_id, leave_type, year)
  WHERE employment_cycle_id IS NULL;

-- Backfill one cycle per historical work-info row. Only the newest current row
-- of an active employee is considered active, avoiding invalid double-active data.
WITH ranked AS (
  SELECT
    wi.*,
    row_number() OVER (
      PARTITION BY wi.employee_id
      ORDER BY wi.hire_date, wi.created_at, wi.id
    )::integer AS cycle_number,
    row_number() OVER (
      PARTITION BY wi.employee_id
      ORDER BY wi.is_current DESC, wi.hire_date DESC, wi.created_at DESC, wi.id DESC
    ) AS current_rank,
    e.is_active,
    e.status AS employee_status
  FROM public.employee_work_info wi
  JOIN public.employees_v2 e ON e.id = wi.employee_id
)
INSERT INTO public.employee_employment_cycles (
  company_id, employee_id, cycle_number, status, source, start_date, end_date, created_by, created_at, updated_at
)
SELECT
  ranked.company_id,
  ranked.employee_id,
  ranked.cycle_number,
  CASE
    WHEN ranked.current_rank = 1
      AND ranked.is_current
      AND ranked.is_active
      AND ranked.employee_status = 'active'
    THEN 'active'::public.employment_cycle_status
    ELSE 'terminated'::public.employment_cycle_status
  END,
  'backfill'::public.employment_cycle_source,
  ranked.hire_date,
  CASE
    WHEN ranked.current_rank = 1
      AND ranked.is_current
      AND ranked.is_active
      AND ranked.employee_status = 'active'
    THEN NULL
    ELSE GREATEST(
      COALESCE(ranked.termination_date, ranked.valid_to, ranked.hire_date),
      ranked.hire_date
    )
  END,
  ranked.created_by,
  ranked.created_at,
  ranked.updated_at
FROM ranked
ON CONFLICT (employee_id, cycle_number) DO NOTHING;

UPDATE public.employee_work_info wi
SET employment_cycle_id = cycle.id
FROM public.employee_employment_cycles cycle
WHERE wi.employment_cycle_id IS NULL
  AND cycle.employee_id = wi.employee_id
  AND cycle.start_date = wi.hire_date
  AND NOT EXISTS (
    SELECT 1
    FROM public.employee_work_info other
    WHERE other.employee_id = wi.employee_id
      AND other.hire_date = wi.hire_date
      AND other.id <> wi.id
  );

-- Active employees without work-info still receive a visible legacy cycle.
INSERT INTO public.employee_employment_cycles (
  company_id, employee_id, cycle_number, status, source, start_date, created_by
)
SELECT
  employee.company_id,
  employee.id,
  1,
  CASE WHEN employee.is_active AND employee.status = 'active'
    THEN 'active'::public.employment_cycle_status
    ELSE 'terminated'::public.employment_cycle_status
  END,
  'backfill'::public.employment_cycle_source,
  COALESCE((SELECT min(contract.start_date) FROM public.contracts contract WHERE contract.employee_id = employee.id), employee.created_at::date),
  employee.created_by
FROM public.employees_v2 employee
WHERE NOT EXISTS (
  SELECT 1 FROM public.employee_employment_cycles cycle WHERE cycle.employee_id = employee.id
);

-- Link contracts only when there is exactly one cycle with the same start date.
WITH matches AS (
  SELECT contract.id AS contract_id, (array_agg(cycle.id))[1] AS cycle_id
  FROM public.contracts contract
  JOIN public.employee_employment_cycles cycle
    ON cycle.employee_id = contract.employee_id
   AND cycle.start_date = contract.start_date
  WHERE contract.employment_cycle_id IS NULL
  GROUP BY contract.id
  HAVING count(*) = 1
)
UPDATE public.contracts contract
SET employment_cycle_id = matches.cycle_id
FROM matches
WHERE contract.id = matches.contract_id;

-- Link terminations by contract first, then by an unambiguous cycle end date.
UPDATE public.employee_terminations termination
SET employment_cycle_id = contract.employment_cycle_id
FROM public.contracts contract
WHERE termination.employment_cycle_id IS NULL
  AND termination.contract_id = contract.id
  AND contract.employment_cycle_id IS NOT NULL;

WITH matches AS (
  SELECT termination.id AS termination_id, (array_agg(cycle.id))[1] AS cycle_id
  FROM public.employee_terminations termination
  JOIN public.employee_employment_cycles cycle
    ON cycle.employee_id = termination.employee_id
   AND cycle.end_date = termination.effective_date
  WHERE termination.employment_cycle_id IS NULL
  GROUP BY termination.id
  HAVING count(*) = 1
)
UPDATE public.employee_terminations termination
SET employment_cycle_id = matches.cycle_id
FROM matches
WHERE termination.id = matches.termination_id;

-- Attach legacy records only when a single temporal cycle is identifiable.
DO $$
DECLARE
  target_table text;
  date_expression text;
BEGIN
  FOR target_table, date_expression IN
    SELECT * FROM (VALUES
      ('employee_contact', 'COALESCE(record.valid_from, record.created_at::date)'),
      ('employee_family', 'COALESCE(record.valid_from, record.created_at::date)'),
      ('employee_bank_info', 'COALESCE(record.valid_from, record.created_at::date)'),
      ('employee_social_security', 'COALESCE(record.valid_from, record.created_at::date)'),
      ('employee_schedule', 'COALESCE(record.valid_from, record.created_at::date)'),
      ('employee_time_config', 'COALESCE(record.start_date, record.created_at::date)'),
      ('employee_family_members', 'record.created_at::date'),
      ('employee_operation_center_assignments', 'record.created_at::date'),
      ('employee_documents', 'COALESCE(record.upload_date, record.created_at::date)'),
      ('medical_exams', 'COALESCE(record.exam_date, record.created_at::date)'),
      ('employee_onboarding_tasks', 'record.created_at::date'),
      ('vacation_balances', 'record.period_start'),
      ('leave_balances', 'make_date(record.year, 1, 1)')
    ) AS mappings(table_name, record_date)
  LOOP
    EXECUTE format(
      'WITH matches AS (
         SELECT record.id AS record_id, (array_agg(cycle.id))[1] AS cycle_id
         FROM public.%I record
         JOIN public.employee_employment_cycles cycle
           ON cycle.employee_id = record.employee_id
          AND cycle.start_date <= %s
          AND (cycle.end_date IS NULL OR cycle.end_date >= %s)
         WHERE record.employment_cycle_id IS NULL
         GROUP BY record.id
         HAVING count(*) = 1
       )
       UPDATE public.%I record
       SET employment_cycle_id = matches.cycle_id
       FROM matches
       WHERE record.id = matches.record_id',
      target_table,
      date_expression,
      date_expression,
      target_table
    );
  END LOOP;
END
$$;

-- Keep cycle timestamps consistent with the rest of the public model.
DROP TRIGGER IF EXISTS update_employee_employment_cycles_updated_at ON public.employee_employment_cycles;
CREATE TRIGGER update_employee_employment_cycles_updated_at
BEFORE UPDATE ON public.employee_employment_cycles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.guard_candidate_employment_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  matched_employee public.employees_v2%ROWTYPE;
BEGIN
  IF NULLIF(btrim(NEW.document_number), '') IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.company_id::text || ':' || NEW.vacancy_id::text || ':' || NEW.document_type::text || ':' || lower(btrim(NEW.document_number)),
    0
  ));

  IF NEW.status NOT IN ('hired', 'not_selected', 'withdrawn') AND EXISTS (
    SELECT 1
    FROM public.candidates candidate
    WHERE candidate.company_id = NEW.company_id
      AND candidate.vacancy_id = NEW.vacancy_id
      AND candidate.document_type = NEW.document_type
      AND lower(btrim(candidate.document_number)) = lower(btrim(NEW.document_number))
      AND candidate.status NOT IN ('hired', 'not_selected', 'withdrawn')
      AND candidate.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Ya existe una postulaciÃ³n activa para esta vacante';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.rehire_employee_id IS NULL THEN
    SELECT * INTO matched_employee
    FROM public.employees_v2 employee
    WHERE employee.company_id = NEW.company_id
      AND employee.document_type = NEW.document_type
      AND lower(btrim(employee.document_number)) = lower(btrim(NEW.document_number))
    LIMIT 1;

    IF FOUND THEN
      IF matched_employee.is_active OR matched_employee.status IN ('active', 'en_retiro') THEN
        RAISE EXCEPTION 'El documento pertenece a un empleado activo. Use el proceso de traslado interno.';
      END IF;
      NEW.rehire_employee_id := matched_employee.id;
      NEW.source := 'reingreso';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_candidate_employment_identity_trigger ON public.candidates;
CREATE TRIGGER guard_candidate_employment_identity_trigger
BEFORE INSERT OR UPDATE OF vacancy_id, document_type, document_number, status
ON public.candidates
FOR EACH ROW EXECUTE FUNCTION private.guard_candidate_employment_identity();

CREATE OR REPLACE FUNCTION public.start_employee_rehire(
  p_employee_id uuid,
  p_vacancy_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  employee_row public.employees_v2%ROWTYPE;
  contact_row public.employee_contact%ROWTYPE;
  vacancy_company_id uuid;
  existing_candidate_id uuid;
  new_candidate_id uuid;
BEGIN
  SELECT * INTO employee_row
  FROM public.employees_v2
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el empleado a recontratar';
  END IF;

  IF employee_row.is_active OR employee_row.status IN ('active', 'en_retiro') THEN
    RAISE EXCEPTION 'El empleado todavía está activo. Use el proceso de traslado interno.';
  END IF;

  SELECT company_id INTO vacancy_company_id
  FROM public.vacancies
  WHERE id = p_vacancy_id
    AND status IN ('open', 'in_process', 'paused');

  IF vacancy_company_id IS NULL OR vacancy_company_id <> employee_row.company_id THEN
    RAISE EXCEPTION 'La vacante no está disponible para la empresa del empleado';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR (
      public.is_company_member(employee_row.company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission((SELECT auth.uid()), 'seleccion', 'create')
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tiene permisos para iniciar el proceso de reingreso';
  END IF;

  SELECT id INTO existing_candidate_id
  FROM public.candidates
  WHERE vacancy_id = p_vacancy_id
    AND company_id = employee_row.company_id
    AND rehire_employee_id = employee_row.id
    AND employee_id IS NULL
    AND status NOT IN ('hired', 'not_selected', 'withdrawn')
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_candidate_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'candidate_id', existing_candidate_id,
      'employee_id', employee_row.id,
      'vacancy_id', p_vacancy_id,
      'existing', true
    );
  END IF;

  SELECT * INTO contact_row
  FROM public.employee_contact
  WHERE employee_id = employee_row.id
  ORDER BY is_current DESC, valid_from DESC, updated_at DESC
  LIMIT 1;

  INSERT INTO public.candidates (
    company_id,
    vacancy_id,
    first_name,
    last_name,
    document_type,
    document_number,
    document_issue_date,
    document_issue_city,
    birth_date,
    gender,
    gender_identity,
    gender_identity_other,
    marital_status,
    blood_type,
    email,
    phone,
    mobile,
    address,
    neighborhood,
    city,
    department,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    source,
    status,
    is_selected,
    rehire_employee_id,
    created_by
  ) VALUES (
    employee_row.company_id,
    p_vacancy_id,
    employee_row.first_name,
    employee_row.last_name,
    employee_row.document_type,
    employee_row.document_number,
    employee_row.document_issue_date,
    employee_row.document_issue_city,
    employee_row.birth_date,
    employee_row.gender::text,
    employee_row.gender_identity,
    employee_row.gender_identity_other,
    employee_row.marital_status::text,
    employee_row.blood_type::text,
    COALESCE(contact_row.personal_email, contact_row.email),
    contact_row.phone,
    contact_row.mobile,
    contact_row.residence_address,
    contact_row.residence_neighborhood,
    contact_row.residence_city,
    contact_row.residence_department,
    contact_row.emergency_contact_name,
    contact_row.emergency_contact_phone,
    contact_row.emergency_contact_relationship,
    'reingreso',
    'applied',
    false,
    employee_row.id,
    (SELECT auth.uid())
  )
  RETURNING id INTO new_candidate_id;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    (SELECT auth.uid()),
    (SELECT auth.jwt() ->> 'email'),
    employee_row.company_id,
    'start_employee_rehire',
    'candidate',
    new_candidate_id,
    concat_ws(' ', employee_row.first_name, employee_row.last_name),
    jsonb_build_object('employee_id', employee_row.id, 'vacancy_id', p_vacancy_id)
  );

  RETURN jsonb_build_object(
    'candidate_id', new_candidate_id,
    'employee_id', employee_row.id,
    'vacancy_id', p_vacancy_id,
    'existing', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_employee_rehire(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_employee_rehire(uuid, uuid) TO authenticated;

-- Center-scoped access must only consider assignments in the active cycle.
CREATE OR REPLACE FUNCTION public.has_employee_v2_access(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees_v2 employee
    WHERE employee.id = _employee_id
      AND (
        public.is_super_admin()
        OR public.is_admin()
        OR (
          public.is_company_member(employee.company_id)
          AND (
            NOT public.has_company_center_assignments((SELECT auth.uid()), employee.company_id)
            OR EXISTS (
              SELECT 1
              FROM public.employee_operation_center_assignments assignment
              JOIN public.employee_employment_cycles cycle
                ON cycle.id = assignment.employment_cycle_id
               AND cycle.status = 'active'
              JOIN public.user_center_assignments user_assignment
                ON user_assignment.operation_center_id = assignment.operation_center_id
              WHERE assignment.employee_id = employee.id
                AND assignment.company_id = employee.company_id
                AND user_assignment.user_id = (SELECT auth.uid())
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_employee_v2_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_employee_v2_access(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view accessible employees v2" ON public.employees_v2;
CREATE POLICY "Users can view accessible employees v2" ON public.employees_v2
FOR SELECT TO authenticated
USING (public.has_employee_v2_access(id));

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.complete_candidate_hiring(
  p_candidate_id uuid,
  p_hiring jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  candidate_row public.candidates%ROWTYPE;
  employee_row public.employees_v2%ROWTYPE;
  vacancy_row record;
  medical_step public.selection_steps%ROWTYPE;
  existing_cycle public.employee_employment_cycles%ROWTYPE;
  employee_id_value uuid;
  work_info_id_value uuid;
  contract_id_value uuid;
  cycle_id_value uuid;
  entry_exam_id_value uuid;
  cycle_number_value integer;
  completed_steps integer;
  hire_date_value date := COALESCE(NULLIF(p_hiring ->> 'hire_date', '')::date, CURRENT_DATE);
  operation_center_id_value uuid := NULLIF(p_hiring ->> 'operation_center_id', '')::uuid;
  position_id_value uuid := NULLIF(p_hiring ->> 'position_id', '')::uuid;
  area_id_value uuid := NULLIF(p_hiring ->> 'area_id', '')::uuid;
  end_date_value date := NULLIF(p_hiring ->> 'end_date', '')::date;
  trial_days_value integer := COALESCE(NULLIF(p_hiring ->> 'trial_period_days', '')::integer, 60);
  contract_number_value text;
  prior_end_date date;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesión para completar una contratación';
  END IF;

  SELECT * INTO candidate_row
  FROM public.candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el candidato';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR (
      public.is_company_member(candidate_row.company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo()
        OR public.check_user_permission((SELECT auth.uid()), 'seleccion', 'update')
      )
    )
  ) THEN
    RAISE EXCEPTION 'No tiene permisos para completar la contratación';
  END IF;

  IF candidate_row.employee_id IS NOT NULL THEN
    SELECT * INTO existing_cycle
    FROM public.employee_employment_cycles
    WHERE candidate_id = candidate_row.id;

    RETURN jsonb_build_object(
      'employee_id', candidate_row.employee_id,
      'employment_cycle_id', existing_cycle.id,
      'contract_id', (
        SELECT contract.id FROM public.contracts contract
        WHERE contract.employment_cycle_id = existing_cycle.id
        ORDER BY contract.created_at DESC LIMIT 1
      ),
      'entry_exam_id', (
        SELECT exam.id FROM public.medical_exams exam
        WHERE exam.employment_cycle_id = existing_cycle.id AND exam.exam_type = 'ingreso'
        ORDER BY exam.created_at DESC LIMIT 1
      ),
      'existing', true
    );
  END IF;

  IF candidate_row.status <> 'selected' OR NOT COALESCE(candidate_row.is_selected, false) THEN
    RAISE EXCEPTION 'El candidato debe estar seleccionado antes de contratar';
  END IF;

  SELECT count(DISTINCT step.step_type)::integer INTO completed_steps
  FROM public.selection_steps step
  WHERE step.candidate_id = candidate_row.id
    AND step.step_type::text IN (
      'prefiltro', 'entrevista_seleccion', 'entrevista_jefe',
      'validacion_antecedentes', 'pruebas_psicotecnicas', 'pruebas_conocimiento',
      'validacion_academica', 'validacion_referencias', 'examenes_medicos'
    )
    AND step.status IN ('passed', 'not_applicable');

  IF completed_steps <> 9 THEN
    RAISE EXCEPTION 'Debe completar nuevamente todas las etapas de selección antes de contratar';
  END IF;

  SELECT * INTO medical_step
  FROM public.selection_steps step
  WHERE step.candidate_id = candidate_row.id
    AND step.step_type = 'examenes_medicos'
    AND step.status = 'passed'
    AND step.result IN ('apto', 'apto_restricciones', 'favorable')
  ORDER BY step.completed_date DESC NULLS LAST, step.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Se requiere un examen médico de ingreso aprobado';
  END IF;

  SELECT
    vacancy.id,
    vacancy.company_id,
    vacancy.position_id,
    vacancy.position_title,
    vacancy.salary_type,
    vacancy.includes_transport,
    vacancy.operation_center_id,
    center.city AS operation_city,
    center.address AS operation_address
  INTO vacancy_row
  FROM public.vacancies vacancy
  LEFT JOIN public.operation_centers center ON center.id = vacancy.operation_center_id
  WHERE vacancy.id = candidate_row.vacancy_id
    AND vacancy.company_id = candidate_row.company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La vacante del candidato no pertenece a la empresa actual';
  END IF;

  operation_center_id_value := COALESCE(operation_center_id_value, vacancy_row.operation_center_id);
  position_id_value := COALESCE(position_id_value, vacancy_row.position_id);

  IF operation_center_id_value IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.operation_centers center
    WHERE center.id = operation_center_id_value
      AND center.company_id = candidate_row.company_id
  ) THEN
    RAISE EXCEPTION 'Debe seleccionar un centro de operación válido';
  END IF;

  -- Serialize hiring attempts for the same company/document identity.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      candidate_row.company_id::text || ':' || candidate_row.document_type::text || ':' || lower(btrim(candidate_row.document_number)),
      0
    )
  );

  IF candidate_row.rehire_employee_id IS NOT NULL THEN
    SELECT * INTO employee_row
    FROM public.employees_v2 employee
    WHERE employee.id = candidate_row.rehire_employee_id
      AND employee.company_id = candidate_row.company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el empleado histórico asociado al reingreso';
    END IF;

    IF employee_row.document_type <> candidate_row.document_type
      OR lower(btrim(employee_row.document_number)) <> lower(btrim(candidate_row.document_number)) THEN
      RAISE EXCEPTION 'La identidad del candidato no coincide con el empleado histórico';
    END IF;

    IF employee_row.is_active OR employee_row.status IN ('active', 'en_retiro') THEN
      RAISE EXCEPTION 'El empleado ya tiene una vinculación activa';
    END IF;

    employee_id_value := employee_row.id;
  ELSE
    SELECT * INTO employee_row
    FROM public.employees_v2 employee
    WHERE employee.company_id = candidate_row.company_id
      AND employee.document_type = candidate_row.document_type
      AND lower(btrim(employee.document_number)) = lower(btrim(candidate_row.document_number))
    FOR UPDATE;

    IF FOUND THEN
      IF employee_row.is_active OR employee_row.status IN ('active', 'en_retiro') THEN
        RAISE EXCEPTION 'Ya existe un empleado activo con este documento. Use el proceso de traslado interno.';
      END IF;
      RAISE EXCEPTION 'El documento corresponde a un empleado retirado. Inicie un proceso de reingreso.';
    END IF;

    INSERT INTO public.employees_v2 (
      company_id, identification_type_id, document_type, document_number,
      document_issue_city, document_issue_date,
      first_name, last_name, birth_date, gender,
      gender_identity, gender_identity_other, blood_type, marital_status,
      is_first_job, is_head_of_household, disability_type, ethnic_group,
      proceso_exclusivo_pcd, is_conflict_victim, is_demobilized,
      is_active, status, created_by
    ) VALUES (
      candidate_row.company_id,
      candidate_row.identification_type_id,
      candidate_row.document_type,
      candidate_row.document_number,
      candidate_row.document_issue_city,
      candidate_row.document_issue_date,
      candidate_row.first_name,
      candidate_row.last_name,
      candidate_row.birth_date,
      CASE
        WHEN lower(COALESCE(candidate_row.gender, '')) IN ('m', 'masculino', 'hombre', 'male') THEN 'M'::public.gender_type
        WHEN lower(COALESCE(candidate_row.gender, '')) IN ('f', 'femenino', 'mujer', 'female') THEN 'F'::public.gender_type
        WHEN lower(COALESCE(candidate_row.gender, '')) IN ('o', 'otro', 'other', 'no_binario', 'no binario') THEN 'O'::public.gender_type
        ELSE NULL
      END,
      candidate_row.gender_identity,
      candidate_row.gender_identity_other,
      CASE WHEN candidate_row.blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
        THEN candidate_row.blood_type::public.blood_type ELSE NULL END,
      CASE WHEN candidate_row.marital_status IN ('soltero', 'casado', 'union_libre', 'divorciado', 'viudo')
        THEN candidate_row.marital_status::public.marital_status_type ELSE NULL END,
      COALESCE(candidate_row.is_first_job, false),
      COALESCE(candidate_row.is_head_of_household, false),
      candidate_row.disability_type,
      candidate_row.ethnic_group,
      COALESCE((p_hiring ->> 'is_pcd_process')::boolean, false),
      COALESCE(candidate_row.is_conflict_victim, false),
      COALESCE(candidate_row.is_demobilized, false),
      true,
      'active',
      (SELECT auth.uid())
    ) RETURNING * INTO employee_row;

    employee_id_value := employee_row.id;
  END IF;

  prior_end_date := hire_date_value - 1;

  UPDATE public.employee_employment_cycles
  SET status = 'terminated', end_date = COALESCE(end_date, prior_end_date)
  WHERE employee_id = employee_id_value
    AND status = 'active';

  UPDATE public.employee_contact SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = employee_id_value AND is_current;
  UPDATE public.employee_family SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = employee_id_value AND is_current;
  UPDATE public.employee_work_info SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date), termination_date = COALESCE(termination_date, prior_end_date)
  WHERE employee_id = employee_id_value AND is_current;
  UPDATE public.employee_bank_info SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = employee_id_value AND is_current;
  UPDATE public.employee_social_security SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = employee_id_value AND is_current;
  UPDATE public.employee_schedule SET is_current = false, valid_to = COALESCE(valid_to, prior_end_date)
  WHERE employee_id = employee_id_value AND is_current;
  UPDATE public.employee_time_config SET is_active = false, end_date = COALESCE(end_date, prior_end_date)
  WHERE employee_id = employee_id_value AND COALESCE(is_active, false);

  UPDATE public.employees_v2
  SET
    first_name = candidate_row.first_name,
    last_name = candidate_row.last_name,
    document_issue_city = candidate_row.document_issue_city,
    document_issue_date = candidate_row.document_issue_date,
    birth_date = candidate_row.birth_date,
    gender_identity = candidate_row.gender_identity,
    gender_identity_other = candidate_row.gender_identity_other,
    disability_type = candidate_row.disability_type,
    ethnic_group = candidate_row.ethnic_group,
    proceso_exclusivo_pcd = COALESCE((p_hiring ->> 'is_pcd_process')::boolean, false),
    is_conflict_victim = COALESCE(candidate_row.is_conflict_victim, false),
    is_demobilized = COALESCE(candidate_row.is_demobilized, false),
    is_active = true,
    status = 'active'
  WHERE id = employee_id_value
  RETURNING * INTO employee_row;

  SELECT COALESCE(max(cycle.cycle_number), 0) + 1 INTO cycle_number_value
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = employee_id_value;

  INSERT INTO public.employee_employment_cycles (
    company_id, employee_id, candidate_id, cycle_number, status, source,
    start_date, created_by
  ) VALUES (
    candidate_row.company_id,
    employee_id_value,
    candidate_row.id,
    cycle_number_value,
    'active',
    CASE
      WHEN candidate_row.rehire_employee_id IS NULL THEN 'selection'::public.employment_cycle_source
      ELSE 'rehire'::public.employment_cycle_source
    END,
    hire_date_value,
    (SELECT auth.uid())
  ) RETURNING id INTO cycle_id_value;

  INSERT INTO public.employee_work_info (
    employee_id, company_id, operation_center_id, position_id, area_id,
    position_name, work_city, hire_date, link_type, is_current,
    valid_from, created_by, employment_cycle_id
  ) VALUES (
    employee_id_value,
    candidate_row.company_id,
    operation_center_id_value,
    position_id_value,
    area_id_value,
    COALESCE(NULLIF(p_hiring ->> 'position_name', ''), vacancy_row.position_title, 'Por definir'),
    COALESCE(NULLIF(p_hiring ->> 'work_city', ''), vacancy_row.operation_city),
    hire_date_value,
    COALESCE(NULLIF(p_hiring ->> 'link_type', ''), 'indefinido')::public.link_type,
    true,
    hire_date_value,
    (SELECT auth.uid()),
    cycle_id_value
  ) RETURNING id INTO work_info_id_value;

  SELECT public.get_next_contract_number(candidate_row.company_id, NULL)
  INTO contract_number_value;

  IF contract_number_value IS NULL THEN
    RAISE EXCEPTION 'No se pudo generar el consecutivo del contrato';
  END IF;

  contract_id_value := gen_random_uuid();
  INSERT INTO public.contracts (
    id, employee_id, company_id, contract_number, contract_type,
    start_date, end_date, salary, salary_type, transport_allowance,
    trial_period_days, trial_end_date, work_city, work_address,
    has_confidentiality_clause, has_non_compete_clause, special_clauses,
    created_by, employment_cycle_id
  ) VALUES (
    contract_id_value,
    employee_id_value,
    candidate_row.company_id,
    contract_number_value,
    COALESCE(NULLIF(p_hiring ->> 'contract_type', ''), 'indefinido'),
    hire_date_value,
    end_date_value,
    COALESCE(NULLIF(p_hiring ->> 'salary', '')::numeric, 0),
    COALESCE(NULLIF(p_hiring ->> 'salary_type', ''), vacancy_row.salary_type, 'mensual'),
    COALESCE(NULLIF(p_hiring ->> 'transport_allowance', '')::numeric, 0),
    trial_days_value,
    CASE WHEN trial_days_value > 0 THEN hire_date_value + trial_days_value ELSE NULL END,
    COALESCE(NULLIF(p_hiring ->> 'work_city', ''), vacancy_row.operation_city),
    COALESCE(NULLIF(p_hiring ->> 'work_address', ''), vacancy_row.operation_address),
    true,
    false,
    NULLIF(p_hiring ->> 'special_clauses', ''),
    (SELECT auth.uid()),
    cycle_id_value
  );

  INSERT INTO public.employee_contact (
    employee_id, company_id, email, personal_email, phone, mobile,
    residence_address, residence_neighborhood, residence_city, residence_department,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    is_current, valid_from, employment_cycle_id
  ) VALUES (
    employee_id_value, candidate_row.company_id,
    candidate_row.email, candidate_row.email, candidate_row.phone, candidate_row.mobile,
    candidate_row.address, candidate_row.neighborhood, candidate_row.city, candidate_row.department,
    candidate_row.emergency_contact_name, candidate_row.emergency_contact_phone, candidate_row.emergency_contact_relationship,
    true, hire_date_value, cycle_id_value
  );

  INSERT INTO public.employee_family (
    employee_id, company_id, spouse_works, children_count, is_current, valid_from, employment_cycle_id
  ) VALUES (
    employee_id_value, candidate_row.company_id, false, 0, true, hire_date_value, cycle_id_value
  );

  INSERT INTO public.employee_family_members (
    employee_id, company_id, relationship, full_name, age, gender, observations, employment_cycle_id
  )
  SELECT
    employee_id_value, candidate_row.company_id,
    member.relationship, member.full_name, member.age, member.gender, member.observations, cycle_id_value
  FROM public.candidate_family_members member
  WHERE member.candidate_id = candidate_row.id;

  INSERT INTO public.employee_schedule (
    employee_id, company_id, payroll_type, is_office_schedule, rest_day,
    is_current, valid_from, employment_cycle_id
  ) VALUES (
    employee_id_value, candidate_row.company_id, 'quincenal', true,
    NULLIF(p_hiring ->> 'rest_day', ''), true, hire_date_value, cycle_id_value
  );

  INSERT INTO public.employee_operation_center_assignments (
    employee_id, company_id, operation_center_id, created_by, employment_cycle_id
  ) VALUES (
    employee_id_value, candidate_row.company_id, operation_center_id_value, (SELECT auth.uid()), cycle_id_value
  );

  entry_exam_id_value := gen_random_uuid();
  INSERT INTO public.medical_exams (
    id, employee_id, company_id, exam_type, exam_date, result, concept,
    provider, doctor_name, order_type, created_by, employment_cycle_id
  ) VALUES (
    entry_exam_id_value,
    employee_id_value,
    candidate_row.company_id,
    'ingreso',
    COALESCE(medical_step.completed_date::date, hire_date_value),
    CASE
      WHEN medical_step.result = 'apto_restricciones' THEN 'apto_restricciones'::public.exam_result
      WHEN medical_step.result IN ('apto', 'favorable') THEN 'apto'::public.exam_result
      ELSE 'pendiente'::public.exam_result
    END,
    COALESCE(medical_step.medical_concept, medical_step.notes, 'Examen de ingreso'),
    COALESCE(medical_step.provider, 'Por definir'),
    COALESCE(medical_step.doctor_name, 'Por definir'),
    medical_step.order_type,
    (SELECT auth.uid()),
    cycle_id_value
  );

  INSERT INTO public.employee_documents (
    employee_id, company_id, document_type, document_name, file_url,
    file_name, file_size, mime_type, expiry_date, is_valid, observations,
    uploaded_by, employment_cycle_id
  )
  SELECT
    employee_id_value,
    candidate_row.company_id,
    document.document_type,
    document.document_name,
    document.file_url,
    document.file_name,
    document.file_size,
    document.mime_type,
    document.expiry_date,
    true,
    document.observations,
    COALESCE(document.uploaded_by, (SELECT auth.uid())),
    cycle_id_value
  FROM public.candidate_documents document
  WHERE document.candidate_id = candidate_row.id;

  IF jsonb_typeof(COALESCE(p_hiring -> 'onboarding_tasks', '[]'::jsonb)) = 'array' THEN
    INSERT INTO public.employee_onboarding_tasks (
      employee_id, company_id, task_key, task_label, task_description,
      sort_order, employment_cycle_id
    )
    SELECT
      employee_id_value,
      candidate_row.company_id,
      task.task_key,
      task.task_label,
      task.task_description,
      task.sort_order,
      cycle_id_value
    FROM jsonb_to_recordset(COALESCE(p_hiring -> 'onboarding_tasks', '[]'::jsonb)) AS task(
      task_key text,
      task_label text,
      task_description text,
      sort_order integer
    );
  END IF;

  INSERT INTO public.vacation_balances (
    employee_id, company_id, period_start, period_end,
    days_accrued, days_taken, days_compensated, notes, employment_cycle_id
  ) VALUES (
    employee_id_value,
    candidate_row.company_id,
    hire_date_value,
    (hire_date_value + INTERVAL '1 year - 1 day')::date,
    0,
    0,
    0,
    'Saldo inicial del ciclo laboral',
    cycle_id_value
  );

  INSERT INTO public.leave_balances (
    employee_id, company_id, leave_type, year,
    entitled_days, used_days, pending_days, employment_cycle_id
  )
  SELECT
    employee_id_value,
    candidate_row.company_id,
    leave_type_value,
    EXTRACT(YEAR FROM hire_date_value)::integer,
    0,
    0,
    0,
    cycle_id_value
  FROM unnest(enum_range(NULL::public.leave_type)) AS leave_type_value;

  UPDATE public.candidates
  SET status = 'hired', is_selected = true, employee_id = employee_id_value
  WHERE id = candidate_row.id;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    (SELECT auth.uid()),
    (SELECT auth.jwt() ->> 'email'),
    candidate_row.company_id,
    'complete_candidate_hiring',
    'employee_employment_cycle',
    cycle_id_value,
    concat_ws(' ', candidate_row.first_name, candidate_row.last_name),
    jsonb_build_object(
      'candidate_id', candidate_row.id,
      'employee_id', employee_id_value,
      'contract_id', contract_id_value,
      'cycle_number', cycle_number_value,
      'is_rehire', candidate_row.rehire_employee_id IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'employee_id', employee_id_value,
    'employment_cycle_id', cycle_id_value,
    'contract_id', contract_id_value,
    'entry_exam_id', entry_exam_id_value,
    'existing', false
  );
END;
$$;

REVOKE ALL ON FUNCTION private.complete_candidate_hiring(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.complete_candidate_hiring(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_candidate_hiring(
  p_candidate_id uuid,
  p_hiring jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, private, pg_temp
AS $$
  SELECT private.complete_candidate_hiring(p_candidate_id, p_hiring);
$$;

REVOKE ALL ON FUNCTION public.complete_candidate_hiring(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_candidate_hiring(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION private.sync_termination_employment_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cycle_id_value uuid;
BEGIN
  IF NEW.employment_cycle_id IS NULL THEN
    SELECT cycle.id INTO cycle_id_value
    FROM public.employee_employment_cycles cycle
    WHERE cycle.employee_id = NEW.employee_id
      AND cycle.company_id = NEW.company_id
      AND cycle.status = 'active'
    ORDER BY cycle.cycle_number DESC
    LIMIT 1;

    NEW.employment_cycle_id := cycle_id_value;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.is_completed IS DISTINCT FROM OLD.is_completed THEN
    IF NEW.is_completed AND NEW.employment_cycle_id IS NOT NULL THEN
      UPDATE public.employee_employment_cycles
      SET status = 'terminated', end_date = NEW.effective_date
      WHERE id = NEW.employment_cycle_id;

      UPDATE public.employee_contact
      SET is_current = false, valid_to = COALESCE(valid_to, NEW.effective_date)
      WHERE employee_id = NEW.employee_id AND is_current;
      UPDATE public.employee_family
      SET is_current = false, valid_to = COALESCE(valid_to, NEW.effective_date)
      WHERE employee_id = NEW.employee_id AND is_current;
      UPDATE public.employee_bank_info
      SET is_current = false, valid_to = COALESCE(valid_to, NEW.effective_date)
      WHERE employee_id = NEW.employee_id AND is_current;
      UPDATE public.employee_social_security
      SET is_current = false, valid_to = COALESCE(valid_to, NEW.effective_date)
      WHERE employee_id = NEW.employee_id AND is_current;
      UPDATE public.employee_schedule
      SET is_current = false, valid_to = COALESCE(valid_to, NEW.effective_date)
      WHERE employee_id = NEW.employee_id AND is_current;
      UPDATE public.employee_time_config
      SET is_active = false, end_date = COALESCE(end_date, NEW.effective_date)
      WHERE employee_id = NEW.employee_id AND COALESCE(is_active, false);
      UPDATE public.employee_work_info
      SET is_current = false,
          valid_to = COALESCE(valid_to, NEW.effective_date),
          termination_date = COALESCE(termination_date, NEW.effective_date)
      WHERE employment_cycle_id = NEW.employment_cycle_id AND is_current;
      UPDATE public.contracts
      SET is_terminated = true,
          termination_date = COALESCE(termination_date, NEW.effective_date),
          end_date = COALESCE(end_date, NEW.effective_date)
      WHERE employment_cycle_id = NEW.employment_cycle_id
        AND COALESCE(is_terminated, false) = false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_termination_employment_cycle_trigger ON public.employee_terminations;
CREATE TRIGGER sync_termination_employment_cycle_trigger
BEFORE INSERT OR UPDATE OF is_completed, employment_cycle_id
ON public.employee_terminations
FOR EACH ROW EXECUTE FUNCTION private.sync_termination_employment_cycle();

CREATE OR REPLACE FUNCTION public.get_candidate_by_token_and_document(
  p_token text,
  p_document_number text,
  p_document_type text DEFAULT 'CC'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  token_row public.self_registration_tokens%ROWTYPE;
  candidate_row public.candidates%ROWTYPE;
  employee_row public.employees_v2%ROWTYPE;
  contact_row public.employee_contact%ROWTYPE;
  vacancy_company_id uuid;
  document_type_value public.document_type;
  family_members jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO token_row FROM public.self_registration_tokens WHERE token = p_token;
  IF NOT FOUND OR token_row.target_type <> 'candidate' OR token_row.vacancy_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Token no vÃ¡lido para registro de candidato');
  END IF;
  IF token_row.is_used AND NOT COALESCE(token_row.is_reusable, false) THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;
  IF token_row.expires_at IS NOT NULL AND token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;
  IF NULLIF(btrim(COALESCE(p_document_number, '')), '') IS NULL THEN
    RETURN json_build_object('success', true, 'found', false);
  END IF;

  SELECT company_id INTO vacancy_company_id FROM public.vacancies WHERE id = token_row.vacancy_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'La vacante del enlace no existe');
  END IF;
  document_type_value := COALESCE(NULLIF(p_document_type, ''), 'CC')::public.document_type;

  SELECT * INTO candidate_row
  FROM public.candidates candidate
  WHERE candidate.vacancy_id = token_row.vacancy_id
    AND candidate.company_id = vacancy_company_id
    AND candidate.document_type = document_type_value
    AND lower(btrim(candidate.document_number)) = lower(btrim(p_document_number))
    AND candidate.status NOT IN ('hired', 'not_selected', 'withdrawn')
  ORDER BY candidate.updated_at DESC NULLS LAST, candidate.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'relationship', member.relationship, 'fullName', member.full_name,
      'full_name', member.full_name, 'age', member.age,
      'gender', member.gender, 'observations', member.observations
    ) ORDER BY member.created_at), '[]'::jsonb)
    INTO family_members
    FROM public.candidate_family_members member
    WHERE member.candidate_id = candidate_row.id;

    RETURN json_build_object(
      'success', true, 'found', true, 'same_vacancy', true,
      'rehire', candidate_row.rehire_employee_id IS NOT NULL,
      'rehire_employee_id', candidate_row.rehire_employee_id,
      'candidate', row_to_json(candidate_row), 'family_members', family_members
    );
  END IF;

  SELECT * INTO employee_row
  FROM public.employees_v2 employee
  WHERE employee.company_id = vacancy_company_id
    AND employee.document_type = document_type_value
    AND lower(btrim(employee.document_number)) = lower(btrim(p_document_number))
  LIMIT 1;

  IF FOUND THEN
    IF employee_row.is_active OR employee_row.status IN ('active', 'en_retiro') THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Este documento pertenece a un empleado activo. Debe gestionarse mediante traslado interno.'
      );
    END IF;

    SELECT * INTO contact_row
    FROM public.employee_contact contact
    WHERE contact.employee_id = employee_row.id
    ORDER BY contact.is_current DESC, contact.created_at DESC
    LIMIT 1;

    RETURN json_build_object(
      'success', true, 'found', true, 'same_vacancy', false,
      'rehire', true, 'rehire_employee_id', employee_row.id,
      'candidate', jsonb_build_object(
        'first_name', employee_row.first_name,
        'last_name', employee_row.last_name,
        'document_type', employee_row.document_type,
        'document_number', employee_row.document_number,
        'identification_type_id', employee_row.identification_type_id,
        'document_issue_date', employee_row.document_issue_date,
        'document_issue_city', employee_row.document_issue_city,
        'birth_date', employee_row.birth_date,
        'gender', employee_row.gender,
        'gender_identity', employee_row.gender_identity,
        'gender_identity_other', employee_row.gender_identity_other,
        'marital_status', employee_row.marital_status,
        'blood_type', employee_row.blood_type,
        'is_first_job', employee_row.is_first_job,
        'is_head_of_household', employee_row.is_head_of_household,
        'disability_type', employee_row.disability_type,
        'ethnic_group', employee_row.ethnic_group,
        'is_conflict_victim', employee_row.is_conflict_victim,
        'is_demobilized', employee_row.is_demobilized,
        'email', COALESCE(contact_row.email, contact_row.personal_email),
        'phone', contact_row.phone,
        'mobile', contact_row.mobile,
        'address', contact_row.residence_address,
        'neighborhood', contact_row.residence_neighborhood,
        'city', contact_row.residence_city,
        'department', contact_row.residence_department,
        'emergency_contact_name', contact_row.emergency_contact_name,
        'emergency_contact_phone', contact_row.emergency_contact_phone,
        'emergency_contact_relationship', contact_row.emergency_contact_relationship
      ),
      'family_members', '[]'::jsonb
    );
  END IF;

  SELECT * INTO candidate_row
  FROM public.candidates candidate
  WHERE candidate.company_id = vacancy_company_id
    AND candidate.document_type = document_type_value
    AND lower(btrim(candidate.document_number)) = lower(btrim(p_document_number))
  ORDER BY candidate.updated_at DESC NULLS LAST, candidate.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', true, 'found', false);
  END IF;

  RETURN json_build_object(
    'success', true, 'found', true, 'same_vacancy', false,
    'rehire', false, 'candidate', row_to_json(candidate_row), 'family_members', '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_candidate_by_token_and_document(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_candidate_by_token_and_document(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_employee_rehire_registration(
  p_token text,
  p_profile jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  token_row public.self_registration_tokens%ROWTYPE;
  employee_row public.employees_v2%ROWTYPE;
  existing_candidate_id uuid;
  candidate_id_value uuid;
  vacancy_company_id uuid;
  document_type_value public.document_type;
  document_number_value text := btrim(COALESCE(p_profile ->> 'document_number', ''));
BEGIN
  SELECT * INTO token_row
  FROM public.self_registration_tokens
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND OR token_row.target_type <> 'candidate' OR token_row.vacancy_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Token no vÃ¡lido para registro de candidato');
  END IF;
  IF token_row.is_used AND NOT COALESCE(token_row.is_reusable, false) THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;
  IF token_row.expires_at IS NOT NULL AND token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;
  IF document_number_value = '' THEN
    RETURN json_build_object('success', false, 'error', 'El documento es obligatorio');
  END IF;

  SELECT company_id INTO vacancy_company_id FROM public.vacancies WHERE id = token_row.vacancy_id;
  IF NOT FOUND OR vacancy_company_id IS DISTINCT FROM token_row.company_id THEN
    RETURN json_build_object('success', false, 'error', 'La vacante no pertenece a la empresa del enlace');
  END IF;
  document_type_value := COALESCE(NULLIF(p_profile ->> 'document_type', ''), 'CC')::public.document_type;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    vacancy_company_id::text || ':' || token_row.vacancy_id::text || ':' || document_type_value::text || ':' || lower(document_number_value),
    0
  ));

  SELECT * INTO employee_row
  FROM public.employees_v2 employee
  WHERE employee.company_id = vacancy_company_id
    AND employee.document_type = document_type_value
    AND lower(btrim(employee.document_number)) = lower(document_number_value)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No se encontrÃ³ el empleado histÃ³rico asociado al reingreso');
  END IF;
  IF employee_row.is_active OR employee_row.status IN ('active', 'en_retiro') THEN
    RETURN json_build_object('success', false, 'error', 'El empleado todavÃ­a estÃ¡ activo. Use traslado interno.');
  END IF;

  SELECT candidate.id INTO existing_candidate_id
  FROM public.candidates candidate
  WHERE candidate.company_id = vacancy_company_id
    AND candidate.vacancy_id = token_row.vacancy_id
    AND candidate.document_type = document_type_value
    AND lower(btrim(candidate.document_number)) = lower(document_number_value)
    AND candidate.status NOT IN ('hired', 'not_selected', 'withdrawn')
  ORDER BY candidate.created_at DESC
  LIMIT 1;

  IF existing_candidate_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true, 'candidate_id', existing_candidate_id,
      'vacancy_id', token_row.vacancy_id, 'company_id', vacancy_company_id, 'existing', true
    );
  END IF;

  INSERT INTO public.candidates (
    company_id, vacancy_id, rehire_employee_id,
    first_name, last_name, document_type, document_number,
    email, phone, mobile, address, neighborhood, city, department,
    birth_date, gender, gender_identity, gender_identity_other,
    document_issue_date, document_issue_city, marital_status, blood_type,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    education_level_id, profession_id, experience_years,
    current_company, current_position, salary_expectation, general_notes,
    is_first_job, is_head_of_household, disability_type, ethnic_group,
    is_conflict_victim, is_demobilized, identification_type_id,
    source, status
  ) VALUES (
    vacancy_company_id, token_row.vacancy_id, employee_row.id,
    p_profile ->> 'first_name', p_profile ->> 'last_name', document_type_value, document_number_value,
    NULLIF(p_profile ->> 'email', ''), NULLIF(p_profile ->> 'phone', ''), NULLIF(p_profile ->> 'mobile', ''),
    NULLIF(p_profile ->> 'address', ''), NULLIF(p_profile ->> 'neighborhood', ''),
    NULLIF(p_profile ->> 'city', ''), NULLIF(p_profile ->> 'department', ''),
    NULLIF(p_profile ->> 'birth_date', '')::date, NULLIF(p_profile ->> 'gender', ''),
    NULLIF(p_profile ->> 'gender_identity', ''), NULLIF(p_profile ->> 'gender_identity_other', ''),
    NULLIF(p_profile ->> 'document_issue_date', '')::date, NULLIF(p_profile ->> 'document_issue_city', ''),
    NULLIF(p_profile ->> 'marital_status', ''), NULLIF(p_profile ->> 'blood_type', ''),
    NULLIF(p_profile ->> 'emergency_contact_name', ''), NULLIF(p_profile ->> 'emergency_contact_phone', ''),
    NULLIF(p_profile ->> 'emergency_contact_relationship', ''),
    NULLIF(p_profile ->> 'education_level_id', '')::uuid, NULLIF(p_profile ->> 'profession_id', '')::uuid,
    COALESCE(NULLIF(p_profile ->> 'experience_years', '')::integer, 0),
    NULLIF(p_profile ->> 'current_company', ''), NULLIF(p_profile ->> 'current_position', ''),
    NULLIF(p_profile ->> 'salary_expectation', '')::numeric, NULLIF(p_profile ->> 'general_notes', ''),
    COALESCE((p_profile ->> 'is_first_job')::boolean, false),
    COALESCE((p_profile ->> 'is_head_of_household')::boolean, false),
    NULLIF(p_profile ->> 'disability_type', ''), NULLIF(p_profile ->> 'ethnic_group', ''),
    COALESCE((p_profile ->> 'is_conflict_victim')::boolean, false),
    COALESCE((p_profile ->> 'is_demobilized')::boolean, false),
    NULLIF(p_profile ->> 'identification_type_id', '')::uuid,
    'reingreso_publico', 'applied'
  ) RETURNING id INTO candidate_id_value;

  IF token_row.enabled_fields ? 'familyMembers'
    AND jsonb_typeof(COALESCE(p_profile -> 'family_members', '[]'::jsonb)) = 'array'
  THEN
    INSERT INTO public.candidate_family_members (
      candidate_id, company_id, relationship, full_name, age, gender, observations
    )
    SELECT
      candidate_id_value, vacancy_company_id,
      NULLIF(member ->> 'relationship', ''),
      NULLIF(COALESCE(member ->> 'full_name', member ->> 'fullName'), ''),
      CASE WHEN member ->> 'age' ~ '^[0-9]+$' THEN (member ->> 'age')::integer ELSE NULL END,
      NULLIF(member ->> 'gender', ''), NULLIF(member ->> 'observations', '')
    FROM jsonb_array_elements(COALESCE(p_profile -> 'family_members', '[]'::jsonb)) member
    WHERE NULLIF(member ->> 'relationship', '') IS NOT NULL
      AND NULLIF(COALESCE(member ->> 'full_name', member ->> 'fullName'), '') IS NOT NULL;
  END IF;

  UPDATE public.self_registration_tokens
  SET is_used = NOT COALESCE(token_row.is_reusable, false), used_at = now()
  WHERE id = token_row.id;

  RETURN json_build_object(
    'success', true, 'candidate_id', candidate_id_value,
    'vacancy_id', token_row.vacancy_id, 'company_id', vacancy_company_id,
    'existing', false, 'rehire', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_employee_rehire_registration(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_employee_rehire_registration(text, jsonb) TO anon, authenticated;
