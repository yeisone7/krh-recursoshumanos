-- Use company-scoped Jornadas permissions while retaining existing legacy access.
ALTER POLICY shifts_insert ON public.shifts TO authenticated
WITH CHECK (
  payroll_private.can(company_id, 'jornadas', 'create')
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
);

ALTER POLICY shifts_update ON public.shifts TO authenticated
USING (
  payroll_private.can(company_id, 'jornadas', 'update')
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
)
WITH CHECK (
  payroll_private.can(company_id, 'jornadas', 'update')
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
);

ALTER POLICY shifts_delete ON public.shifts TO authenticated
USING (payroll_private.can(company_id, 'jornadas', 'delete'));

-- Assigning centers to an existing shift is an update, not a catalog deletion.
-- A create-only user may attach centers only to a shift they just inserted in
-- this transaction. xmin prevents using create permission to edit older shifts.
ALTER POLICY "Schedule managers can create shift operation centers"
ON public.shift_operation_centers
WITH CHECK (
  payroll_private.can(company_id, 'jornadas', 'update')
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
  OR (
    payroll_private.can(company_id, 'jornadas', 'create')
    AND EXISTS (
      SELECT 1 FROM public.shifts parent
      WHERE parent.id = shift_id
        AND parent.company_id = shift_operation_centers.company_id
        AND parent.created_by = auth.uid()
        AND parent.xmin = pg_current_xact_id_if_assigned()::text::xid
    )
  )
);

ALTER POLICY "Schedule managers can update shift operation centers"
ON public.shift_operation_centers
USING (
  payroll_private.can(company_id, 'jornadas', 'update')
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
)
WITH CHECK (
  payroll_private.can(company_id, 'jornadas', 'update')
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
);

ALTER POLICY "Schedule managers can delete shift operation centers"
ON public.shift_operation_centers
USING (
  payroll_private.can(company_id, 'jornadas', 'update')
  OR (public.is_company_member(company_id) AND public.is_admin_or_rrhh())
);

-- SECURITY INVOKER: the policies above authorize all writes. The shift and its
-- center associations either commit together or are both rolled back.
CREATE OR REPLACE FUNCTION public.create_shift_with_centers(
  p_company_id uuid,
  p_values jsonb,
  p_operation_center_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS public.shifts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  saved public.shifts;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    payroll_private.can(p_company_id, 'jornadas', 'create')
    OR (public.is_company_member(p_company_id) AND public.is_admin_or_rrhh())
  ) THEN
    RAISE EXCEPTION 'No tienes autorización para crear turnos en esta empresa'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.shifts (
    company_id, created_by, name, code, description, start_time, end_time,
    break_minutes, crosses_midnight, color, is_rest_day, is_not_worked_day,
    is_suspension_day, is_active, kind
  ) VALUES (
    p_company_id, auth.uid(), p_values->>'name', p_values->>'code',
    p_values->>'description', (p_values->>'start_time')::time,
    (p_values->>'end_time')::time, COALESCE((p_values->>'break_minutes')::integer, 0),
    COALESCE((p_values->>'crosses_midnight')::boolean, false),
    COALESCE(p_values->>'color', 'transparent'),
    COALESCE((p_values->>'is_rest_day')::boolean, false),
    COALESCE((p_values->>'is_not_worked_day')::boolean, false),
    COALESCE((p_values->>'is_suspension_day')::boolean, false),
    COALESCE((p_values->>'is_active')::boolean, true),
    COALESCE(p_values->>'kind', 'operational')
  ) RETURNING * INTO saved;

  IF saved.kind <> 'day' AND cardinality(p_operation_center_ids) > 0 THEN
    RAISE EXCEPTION 'Solo los Turnos Día pueden asociarse a centros de operación'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.shift_operation_centers (
    company_id, shift_id, operation_center_id, created_by
  )
  SELECT DISTINCT saved.company_id, saved.id, center_id, auth.uid()
  FROM unnest(COALESCE(p_operation_center_ids, '{}'::uuid[])) AS requested(center_id);

  RETURN saved;
END;
$$;

REVOKE ALL ON FUNCTION public.create_shift_with_centers(uuid, jsonb, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_shift_with_centers(uuid, jsonb, uuid[]) TO authenticated;
