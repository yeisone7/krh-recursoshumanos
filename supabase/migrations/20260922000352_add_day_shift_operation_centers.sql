-- Scope Turnos Dia to zero (global), one, or many operation centers.
CREATE TABLE public.shift_operation_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT shift_operation_centers_shift_center_key UNIQUE (shift_id, operation_center_id)
);

COMMENT ON TABLE public.shift_operation_centers IS
  'Operation centers allowed for a day shift. A day shift with no rows is global.';

CREATE INDEX shift_operation_centers_company_idx
  ON public.shift_operation_centers (company_id);
CREATE INDEX shift_operation_centers_company_center_idx
  ON public.shift_operation_centers (company_id, operation_center_id);

CREATE OR REPLACE FUNCTION public.validate_shift_operation_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  shift_company_id uuid;
  shift_kind text;
  center_company_id uuid;
BEGIN
  SELECT company_id, kind
    INTO shift_company_id, shift_kind
  FROM public.shifts
  WHERE id = NEW.shift_id;

  IF shift_company_id IS NULL THEN
    RAISE EXCEPTION 'El turno seleccionado no existe o no esta disponible';
  END IF;

  IF shift_kind <> 'day' THEN
    RAISE EXCEPTION 'Solo los Turnos Dia pueden asociarse a centros de operacion';
  END IF;

  SELECT company_id
    INTO center_company_id
  FROM public.operation_centers
  WHERE id = NEW.operation_center_id;

  IF center_company_id IS NULL OR center_company_id <> shift_company_id THEN
    RAISE EXCEPTION 'El centro de operacion debe pertenecer a la misma empresa del turno';
  END IF;

  IF NEW.company_id <> shift_company_id THEN
    RAISE EXCEPTION 'La empresa de la asociacion no coincide con la empresa del turno';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_shift_operation_center_before_write
BEFORE INSERT OR UPDATE ON public.shift_operation_centers
FOR EACH ROW
EXECUTE FUNCTION public.validate_shift_operation_center();

ALTER TABLE public.shift_operation_centers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shift_operation_centers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_operation_centers TO authenticated;

CREATE POLICY "Company members can view shift operation centers"
ON public.shift_operation_centers
FOR SELECT TO authenticated
USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Schedule managers can create shift operation centers"
ON public.shift_operation_centers
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
);

CREATE POLICY "Schedule managers can update shift operation centers"
ON public.shift_operation_centers
FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
)
WITH CHECK (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
);

CREATE POLICY "Schedule managers can delete shift operation centers"
ON public.shift_operation_centers
FOR DELETE TO authenticated
USING (
  public.is_super_admin()
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
);

-- Replaces the full set atomically. An empty array makes the shift global.
CREATE OR REPLACE FUNCTION public.sync_shift_operation_centers(
  p_shift_id uuid,
  p_operation_center_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_company_id uuid;
  target_kind text;
BEGIN
  SELECT company_id, kind
    INTO target_company_id, target_kind
  FROM public.shifts
  WHERE id = p_shift_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'El turno seleccionado no existe o no esta disponible';
  END IF;

  IF target_kind <> 'day' THEN
    RAISE EXCEPTION 'Solo los Turnos Dia pueden asociarse a centros de operacion';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_operation_center_ids, '{}'::uuid[])) AS requested(center_id)
    LEFT JOIN public.operation_centers center
      ON center.id = requested.center_id
     AND center.company_id = target_company_id
    WHERE requested.center_id IS NULL OR center.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Uno o mas centros no pertenecen a la empresa del turno';
  END IF;

  DELETE FROM public.shift_operation_centers
  WHERE shift_id = p_shift_id;

  INSERT INTO public.shift_operation_centers (
    company_id,
    shift_id,
    operation_center_id,
    created_by
  )
  SELECT DISTINCT
    target_company_id,
    p_shift_id,
    requested.center_id,
    auth.uid()
  FROM unnest(COALESCE(p_operation_center_ids, '{}'::uuid[])) AS requested(center_id)
  WHERE requested.center_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_shift_operation_centers(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_shift_operation_centers(uuid, uuid[]) TO authenticated;

-- Existing assignments are intentionally not backfilled or rejected. This
-- trigger only protects new assignments and assignments whose employee/shift
-- is changed after this migration.
CREATE OR REPLACE FUNCTION public.validate_day_shift_employee_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  shift_company_id uuid;
  shift_kind text;
BEGIN
  SELECT company_id, kind
    INTO shift_company_id, shift_kind
  FROM public.shifts
  WHERE id = NEW.shift_id;

  IF shift_kind IS DISTINCT FROM 'day'
     OR NOT EXISTS (
       SELECT 1
       FROM public.shift_operation_centers scope
       WHERE scope.shift_id = NEW.shift_id
     ) THEN
    RETURN NEW;
  END IF;

  IF shift_company_id <> NEW.company_id THEN
    RAISE EXCEPTION 'El turno y la asignacion deben pertenecer a la misma empresa';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.shift_operation_centers scope
    WHERE scope.shift_id = NEW.shift_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.employee_work_info work_info
          WHERE work_info.employee_id = NEW.employee_id
            AND work_info.company_id = NEW.company_id
            AND work_info.is_current = true
            AND work_info.operation_center_id = scope.operation_center_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.employee_operation_center_assignments assignment
          LEFT JOIN public.employee_employment_cycles cycle
            ON cycle.id = assignment.employment_cycle_id
          WHERE assignment.employee_id = NEW.employee_id
            AND assignment.company_id = NEW.company_id
            AND assignment.operation_center_id = scope.operation_center_id
            AND (
              (
                assignment.employment_cycle_id IS NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.employee_employment_cycles active_cycle
                  WHERE active_cycle.employee_id = NEW.employee_id
                    AND active_cycle.status = 'active'
                )
              )
              OR cycle.status = 'active'
            )
        )
      )
  ) THEN
    RAISE EXCEPTION 'El Turno Dia no esta habilitado para los centros activos del empleado';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_day_shift_employee_center_before_write
BEFORE INSERT OR UPDATE OF employee_id, shift_id, company_id
ON public.employee_shift_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_day_shift_employee_center();
