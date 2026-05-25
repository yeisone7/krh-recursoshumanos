-- HR automations: "Cuando X, entonces Y"
-- Phase 1: catalog, permissions, queued executions and database event capture.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_automation_entity_type') THEN
    CREATE TYPE public.hr_automation_entity_type AS ENUM (
      'employee',
      'candidate',
      'leave_request',
      'vacation_request',
      'performance_review',
      'onboarding'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_automation_trigger_type') THEN
    CREATE TYPE public.hr_automation_trigger_type AS ENUM (
      'employee_hired',
      'status_changed',
      'department_changed',
      'review_completed',
      'leave_requested',
      'vacation_requested',
      'candidate_status_changed',
      'onboarding_task_completed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_automation_action_type') THEN
    CREATE TYPE public.hr_automation_action_type AS ENUM (
      'set_status',
      'assign_to',
      'notify',
      'schedule_meeting',
      'create_task'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.hr_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type public.hr_automation_entity_type NOT NULL,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  trigger_type public.hr_automation_trigger_type NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type public.hr_automation_action_type NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.hr_automations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type public.hr_automation_entity_type NOT NULL,
  record_id uuid NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  success boolean NOT NULL DEFAULT false,
  message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_automations_company_entity
  ON public.hr_automations(company_id, entity_type, enabled);

CREATE INDEX IF NOT EXISTS idx_hr_automations_trigger
  ON public.hr_automations(company_id, trigger_type, enabled);

CREATE INDEX IF NOT EXISTS idx_hr_automation_runs_automation_created
  ON public.hr_automation_runs(automation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hr_automation_runs_company_created
  ON public.hr_automation_runs(company_id, created_at DESC);

ALTER TABLE public.hr_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Automation permissions can view automations" ON public.hr_automations;
CREATE POLICY "Automation permissions can view automations"
ON public.hr_automations
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'automatizaciones', 'view')
  )
);

DROP POLICY IF EXISTS "Automation permissions can insert automations" ON public.hr_automations;
CREATE POLICY "Automation permissions can insert automations"
ON public.hr_automations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'automatizaciones', 'create')
  )
);

DROP POLICY IF EXISTS "Automation permissions can update automations" ON public.hr_automations;
CREATE POLICY "Automation permissions can update automations"
ON public.hr_automations
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'automatizaciones', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'automatizaciones', 'update')
  )
);

DROP POLICY IF EXISTS "Automation permissions can delete automations" ON public.hr_automations;
CREATE POLICY "Automation permissions can delete automations"
ON public.hr_automations
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'automatizaciones', 'delete')
  )
);

DROP POLICY IF EXISTS "Automation permissions can view runs" ON public.hr_automation_runs;
CREATE POLICY "Automation permissions can view runs"
ON public.hr_automation_runs
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'automatizaciones', 'view')
  )
);

DROP POLICY IF EXISTS "Automation permissions can insert runs" ON public.hr_automation_runs;
CREATE POLICY "Automation permissions can insert runs"
ON public.hr_automation_runs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'automatizaciones', 'create')
  )
);

DROP TRIGGER IF EXISTS update_hr_automations_updated_at ON public.hr_automations;
CREATE TRIGGER update_hr_automations_updated_at
BEFORE UPDATE ON public.hr_automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_automations TO authenticated;
GRANT SELECT, INSERT ON public.hr_automation_runs TO authenticated;

CREATE OR REPLACE FUNCTION public.hr_automation_config_matches(
  _config jsonb,
  _payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  condition_key text;
  condition_value text;
BEGIN
  IF coalesce(_config, '{}'::jsonb) = '{}'::jsonb THEN
    RETURN true;
  END IF;

  IF nullif(_config->>'status_from', '') IS NOT NULL
     AND _config->>'status_from' <> coalesce(_payload->>'old_status', '') THEN
    RETURN false;
  END IF;

  IF nullif(_config->>'status_to', '') IS NOT NULL
     AND _config->>'status_to' <> coalesce(_payload->>'new_status', '') THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(_config->'conditions') = 'object' THEN
    FOR condition_key, condition_value IN
      SELECT key, value #>> '{}'
      FROM jsonb_each(_config->'conditions')
    LOOP
      IF condition_value IS NOT NULL
         AND condition_value <> coalesce(_payload->'new_record'->>condition_key, '') THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_hr_automation_runs(
  _company_id uuid,
  _entity_type public.hr_automation_entity_type,
  _record_id uuid,
  _trigger_type public.hr_automation_trigger_type,
  _payload jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  IF _company_id IS NULL OR _record_id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.hr_automation_runs (
    automation_id,
    company_id,
    entity_type,
    record_id,
    event_type,
    status,
    success,
    message,
    payload
  )
  SELECT
    automation.id,
    automation.company_id,
    automation.entity_type,
    _record_id,
    _trigger_type::text,
    'queued',
    false,
    'Ejecucion registrada y lista para procesamiento',
    coalesce(_payload, '{}'::jsonb)
  FROM public.hr_automations automation
  WHERE automation.company_id = _company_id
    AND automation.entity_type = _entity_type
    AND automation.trigger_type = _trigger_type
    AND automation.enabled = true
    AND public.hr_automation_config_matches(automation.trigger_config, coalesce(_payload, '{}'::jsonb));

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  UPDATE public.hr_automations automation
  SET
    last_run_at = now(),
    run_count = automation.run_count + 1
  WHERE EXISTS (
    SELECT 1
    FROM public.hr_automation_runs run
    WHERE run.automation_id = automation.id
      AND run.created_at >= now() - interval '5 seconds'
      AND run.record_id = _record_id
      AND run.event_type = _trigger_type::text
  );

  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_hr_automation_runs(uuid, public.hr_automation_entity_type, uuid, public.hr_automation_trigger_type, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_hr_automation_runs(uuid, public.hr_automation_entity_type, uuid, public.hr_automation_trigger_type, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_hr_automation_runs(uuid, public.hr_automation_entity_type, uuid, public.hr_automation_trigger_type, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_hr_automation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row_data jsonb;
  old_data jsonb;
  company_id_value uuid;
  record_id_value uuid;
  entity_value public.hr_automation_entity_type;
  trigger_value public.hr_automation_trigger_type;
  payload jsonb;
  old_status text;
  new_status text;
BEGIN
  row_data := to_jsonb(NEW);
  old_data := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  record_id_value := nullif(row_data->>'id', '')::uuid;
  company_id_value := nullif(row_data->>'company_id', '')::uuid;
  old_status := old_data->>'status';
  new_status := row_data->>'status';

  IF TG_TABLE_NAME = 'employees_v2' THEN
    entity_value := 'employee';

    IF TG_OP = 'INSERT' THEN
      trigger_value := 'employee_hired';
    ELSIF TG_OP = 'UPDATE' AND coalesce(old_data->>'is_active', '') IS DISTINCT FROM coalesce(row_data->>'is_active', '') THEN
      trigger_value := 'status_changed';
      old_status := CASE WHEN old_data->>'is_active' = 'true' THEN 'activo' ELSE 'inactivo' END;
      new_status := CASE WHEN row_data->>'is_active' = 'true' THEN 'activo' ELSE 'inactivo' END;
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'employee_work_info' THEN
    entity_value := 'employee';
    record_id_value := nullif(row_data->>'employee_id', '')::uuid;

    IF TG_OP = 'UPDATE'
       AND (
         coalesce(old_data->>'area_id', '') IS DISTINCT FROM coalesce(row_data->>'area_id', '')
         OR coalesce(old_data->>'position_id', '') IS DISTINCT FROM coalesce(row_data->>'position_id', '')
         OR coalesce(old_data->>'operation_center_id', '') IS DISTINCT FROM coalesce(row_data->>'operation_center_id', '')
       ) THEN
      trigger_value := 'department_changed';
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'leave_requests' THEN
    entity_value := 'leave_request';

    IF TG_OP = 'INSERT' THEN
      trigger_value := 'leave_requested';
    ELSIF TG_OP = 'UPDATE' AND coalesce(old_status, '') IS DISTINCT FROM coalesce(new_status, '') THEN
      trigger_value := 'status_changed';
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'vacation_requests' THEN
    entity_value := 'vacation_request';

    IF TG_OP = 'INSERT' THEN
      trigger_value := 'vacation_requested';
    ELSIF TG_OP = 'UPDATE' AND coalesce(old_status, '') IS DISTINCT FROM coalesce(new_status, '') THEN
      trigger_value := 'status_changed';
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'candidates' THEN
    entity_value := 'candidate';
    IF company_id_value IS NULL THEN
      SELECT v.company_id INTO company_id_value
      FROM public.vacancies v
      WHERE v.id = nullif(row_data->>'vacancy_id', '')::uuid;
    END IF;

    IF TG_OP = 'UPDATE' AND coalesce(old_status, '') IS DISTINCT FROM coalesce(new_status, '') THEN
      trigger_value := 'candidate_status_changed';
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'performance_evaluations' THEN
    entity_value := 'performance_review';

    IF TG_OP = 'UPDATE'
       AND coalesce(old_status, '') IS DISTINCT FROM coalesce(new_status, '')
       AND lower(coalesce(new_status, '')) IN ('completed', 'completado', 'finalizada', 'finalizado') THEN
      trigger_value := 'review_completed';
    ELSE
      RETURN NEW;
    END IF;

  ELSE
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'old_status', old_status,
    'new_status', new_status,
    'old_record', old_data,
    'new_record', row_data
  );

  PERFORM public.enqueue_hr_automation_runs(
    company_id_value,
    entity_value,
    record_id_value,
    trigger_value,
    payload
  );

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.employees_v2') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_hr_automations_employees_v2 ON public.employees_v2;
    CREATE TRIGGER trg_hr_automations_employees_v2
    AFTER INSERT OR UPDATE ON public.employees_v2
    FOR EACH ROW EXECUTE FUNCTION public.handle_hr_automation_event();
  END IF;

  IF to_regclass('public.employee_work_info') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_hr_automations_employee_work_info ON public.employee_work_info;
    CREATE TRIGGER trg_hr_automations_employee_work_info
    AFTER UPDATE ON public.employee_work_info
    FOR EACH ROW EXECUTE FUNCTION public.handle_hr_automation_event();
  END IF;

  IF to_regclass('public.leave_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_hr_automations_leave_requests ON public.leave_requests;
    CREATE TRIGGER trg_hr_automations_leave_requests
    AFTER INSERT OR UPDATE ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_hr_automation_event();
  END IF;

  IF to_regclass('public.vacation_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_hr_automations_vacation_requests ON public.vacation_requests;
    CREATE TRIGGER trg_hr_automations_vacation_requests
    AFTER INSERT OR UPDATE ON public.vacation_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_hr_automation_event();
  END IF;

  IF to_regclass('public.candidates') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_hr_automations_candidates ON public.candidates;
    CREATE TRIGGER trg_hr_automations_candidates
    AFTER UPDATE ON public.candidates
    FOR EACH ROW EXECUTE FUNCTION public.handle_hr_automation_event();
  END IF;

  IF to_regclass('public.performance_evaluations') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_hr_automations_performance_evaluations ON public.performance_evaluations;
    CREATE TRIGGER trg_hr_automations_performance_evaluations
    AFTER UPDATE ON public.performance_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.handle_hr_automation_event();
  END IF;
END $$;

INSERT INTO public.modules (code, name, icon, sort_order)
VALUES ('automatizaciones', 'Automatizaciones RRHH', 'Workflow', 28)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, action_value::public.permission_action, description_value
FROM public.modules m
CROSS JOIN (
  VALUES
    ('view', 'Automatizaciones RRHH - Ver'),
    ('create', 'Automatizaciones RRHH - Crear'),
    ('update', 'Automatizaciones RRHH - Modificar'),
    ('delete', 'Automatizaciones RRHH - Eliminar')
) AS permission_seed(action_value, description_value)
WHERE m.code = 'automatizaciones'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'automatizaciones'
ON CONFLICT (role_id, permission_id) DO NOTHING;
