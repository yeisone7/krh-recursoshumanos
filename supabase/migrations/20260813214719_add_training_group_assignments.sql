BEGIN;

CREATE TABLE public.training_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE RESTRICT,
  token_id uuid REFERENCES public.training_access_tokens(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 3 AND 160),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  expires_at timestamptz NOT NULL,
  requires_evaluation boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX training_group_assignments_token_unique
  ON public.training_group_assignments(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX training_group_assignments_company_idx
  ON public.training_group_assignments(company_id, created_at DESC);

CREATE TABLE public.training_group_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.training_group_assignments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE RESTRICT,
  completion_id uuid REFERENCES public.training_completions(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  added_by uuid NOT NULL REFERENCES auth.users(id),
  removed_by uuid REFERENCES auth.users(id),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_group_participants_unique UNIQUE (assignment_id, employee_id)
);

CREATE INDEX training_group_participants_employee_idx
  ON public.training_group_participants(employee_id, is_active);
CREATE INDEX training_group_participants_assignment_idx
  ON public.training_group_participants(assignment_id, is_active);

ALTER TABLE public.training_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_group_participants ENABLE ROW LEVEL SECURITY;

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'capacitaciones' LIMIT 1
)
INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
SELECT 'capacitaciones_grupos', 'Capacitaciones: Grupos', parent_module.id, 'UsersRound', 1607, true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order, is_active = true;

UPDATE public.modules SET sort_order = sort_order + 1
WHERE parent_id = (SELECT id FROM public.modules WHERE code = 'capacitaciones')
  AND code IN ('capacitaciones_evidencias', 'analitica_capacitaciones');

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, action.name::public.permission_action,
       'Capacitaciones: Grupos - ' || action.label
FROM public.modules module
CROSS JOIN (VALUES
  ('view', 'Ver'), ('create', 'Crear'), ('update', 'Modificar'),
  ('delete', 'Eliminar enlace'), ('export', 'Exportar')
) AS action(name, label)
WHERE module.code = 'capacitaciones_grupos'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.custom_roles role
CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true AND module.code = 'capacitaciones_grupos'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.can_manage_training_groups(
  target_company_id uuid,
  target_action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_super_admin()
    OR (
      public.is_company_member(target_company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), 'capacitaciones_grupos', target_action)
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_manage_training_groups(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_training_groups(uuid, text) TO authenticated;

CREATE POLICY "Training group permissions can view assignments"
ON public.training_group_assignments FOR SELECT TO authenticated
USING (private.can_manage_training_groups(company_id, 'view'));

CREATE POLICY "Training group permissions can view participants"
ON public.training_group_participants FOR SELECT TO authenticated
USING (private.can_manage_training_groups(company_id, 'view'));

-- All mutations go through validated transactional RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.training_group_assignments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.training_group_participants FROM anon, authenticated;
GRANT SELECT ON public.training_group_assignments, public.training_group_participants TO authenticated;

CREATE OR REPLACE FUNCTION private.training_group_employee_is_allowed(
  target_company_id uuid,
  target_employee_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees_v2 employee
    WHERE employee.id = target_employee_id
      AND employee.company_id = target_company_id
      AND employee.is_active = true
      AND employee.status = 'active'
      AND (
        public.is_super_admin()
        OR public.is_admin_or_rrhh()
        OR NOT EXISTS (
          SELECT 1 FROM public.user_center_assignments access
          WHERE access.user_id = (SELECT auth.uid())
        )
        OR EXISTS (
          SELECT 1
          FROM public.employee_work_info work
          JOIN public.user_center_assignments access
            ON access.operation_center_id = work.operation_center_id
           AND access.user_id = (SELECT auth.uid())
          WHERE work.employee_id = employee.id AND work.is_current = true
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.training_group_employee_is_allowed(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.training_group_employee_is_allowed(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_view_training_group_assignment(
  target_assignment_id uuid,
  target_company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.can_manage_training_groups(target_company_id, 'view')
    AND (
      public.is_super_admin()
      OR public.is_admin_or_rrhh()
      OR NOT EXISTS (
        SELECT 1 FROM public.user_center_assignments access
        WHERE access.user_id = (SELECT auth.uid())
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.training_group_participants participant
        JOIN public.employee_work_info work
          ON work.employee_id = participant.employee_id AND work.is_current = true
        WHERE participant.assignment_id = target_assignment_id
          AND participant.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM public.user_center_assignments access
            WHERE access.user_id = (SELECT auth.uid())
              AND access.operation_center_id = work.operation_center_id
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_view_training_group_assignment(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_training_group_assignment(uuid, uuid) TO authenticated;

DROP POLICY "Training group permissions can view assignments" ON public.training_group_assignments;
CREATE POLICY "Training group permissions can view assignments"
ON public.training_group_assignments FOR SELECT TO authenticated
USING (private.can_view_training_group_assignment(id, company_id));

DROP POLICY "Training group permissions can view participants" ON public.training_group_participants;
CREATE POLICY "Training group permissions can view participants"
ON public.training_group_participants FOR SELECT TO authenticated
USING (
  private.can_view_training_group_assignment(assignment_id, company_id)
  AND (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR NOT EXISTS (
      SELECT 1 FROM public.user_center_assignments access
      WHERE access.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.employee_work_info work
      JOIN public.user_center_assignments access
        ON access.operation_center_id = work.operation_center_id
       AND access.user_id = (SELECT auth.uid())
      WHERE work.employee_id = employee_id AND work.is_current = true
    )
  )
);

CREATE OR REPLACE FUNCTION private.log_training_group_action(
  assignment public.training_group_assignments,
  action_name text,
  previous_values jsonb DEFAULT NULL,
  next_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id,
    entity_name, old_values, new_values
  ) VALUES (
    (SELECT auth.uid()), (SELECT auth.jwt() ->> 'email'), assignment.company_id,
    action_name, 'training_group_assignment', assignment.id, assignment.name,
    previous_values, next_values
  );
END;
$$;

REVOKE ALL ON FUNCTION private.log_training_group_action(public.training_group_assignments, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.link_training_group_completions(target_assignment_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.training_group_participants participant
  SET completion_id = (
        SELECT completion.id
        FROM public.training_completions completion
        JOIN public.training_group_assignments assignment
          ON assignment.id = participant.assignment_id
        WHERE completion.company_id = assignment.company_id
          AND completion.course_id = assignment.course_id
          AND completion.employee_id = participant.employee_id
        ORDER BY completion.completed_at DESC
        LIMIT 1
      ),
      updated_at = now()
  WHERE participant.assignment_id = target_assignment_id
    AND participant.is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.training_completions completion
      JOIN public.training_group_assignments assignment
        ON assignment.id = participant.assignment_id
      WHERE completion.company_id = assignment.company_id
        AND completion.course_id = assignment.course_id
        AND completion.employee_id = participant.employee_id
    );
$$;

REVOKE ALL ON FUNCTION private.link_training_group_completions(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_training_group_assignment(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  company_id_value uuid := nullif(payload ->> 'company_id', '')::uuid;
  course_id_value uuid := nullif(payload ->> 'course_id', '')::uuid;
  expires_at_value timestamptz := coalesce(nullif(payload ->> 'expires_at', '')::timestamptz, now() + interval '30 days');
  employee_ids uuid[];
  assignment_row public.training_group_assignments;
  token_row public.training_access_tokens;
BEGIN
  IF NOT private.can_manage_training_groups(company_id_value, 'create') THEN
    RAISE EXCEPTION 'No tiene permisos para crear capacitaciones por grupo';
  END IF;
  IF nullif(btrim(payload ->> 'name'), '') IS NULL OR expires_at_value <= now() THEN
    RAISE EXCEPTION 'Nombre y vencimiento futuro son obligatorios';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.training_courses course
    WHERE course.id = course_id_value AND course.company_id = company_id_value
      AND course.is_active = true AND course.status = 'publicado'
  ) THEN RAISE EXCEPTION 'La capacitacion no esta publicada o no pertenece a la empresa'; END IF;

  SELECT coalesce(array_agg(DISTINCT value::uuid), ARRAY[]::uuid[])
  INTO employee_ids FROM jsonb_array_elements_text(coalesce(payload -> 'employee_ids', '[]'::jsonb));
  IF cardinality(employee_ids) = 0 THEN RAISE EXCEPTION 'Seleccione al menos un empleado'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(employee_ids) id WHERE NOT private.training_group_employee_is_allowed(company_id_value, id)) THEN
    RAISE EXCEPTION 'Uno o mas empleados no estan activos o no estan autorizados';
  END IF;

  INSERT INTO public.training_access_tokens (
    company_id, course_id, access_type, usage_type, max_uses, expires_at,
    requires_evaluation, created_by, operation_center_id
  ) VALUES (
    company_id_value, course_id_value, 'link_cedula', 'multiple', NULL, expires_at_value,
    coalesce((payload ->> 'requires_evaluation')::boolean, true), (SELECT auth.uid()), NULL
  ) RETURNING * INTO token_row;

  INSERT INTO public.training_group_assignments (
    company_id, course_id, token_id, name, expires_at, requires_evaluation, created_by
  ) VALUES (
    company_id_value, course_id_value, token_row.id, btrim(payload ->> 'name'),
    expires_at_value, coalesce((payload ->> 'requires_evaluation')::boolean, true), (SELECT auth.uid())
  ) RETURNING * INTO assignment_row;

  INSERT INTO public.training_group_participants (assignment_id, company_id, employee_id, added_by)
  SELECT assignment_row.id, company_id_value, id, (SELECT auth.uid()) FROM unnest(employee_ids) id;
  PERFORM private.link_training_group_completions(assignment_row.id);
  PERFORM private.log_training_group_action(assignment_row, 'create_training_group_assignment', NULL,
    jsonb_build_object('course_id', course_id_value, 'participant_count', cardinality(employee_ids), 'token_id', token_row.id));
  RETURN jsonb_build_object('assignment_id', assignment_row.id, 'token', token_row.token);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_training_group_assignment(
  assignment_id_value uuid,
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assignment_row public.training_group_assignments;
  old_row public.training_group_assignments;
  employee_ids uuid[];
BEGIN
  SELECT * INTO assignment_row FROM public.training_group_assignments WHERE id = assignment_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_training_groups(assignment_row.company_id, 'update') THEN
    RAISE EXCEPTION 'Asignacion no encontrada o sin permisos';
  END IF;
  IF assignment_row.status <> 'active' OR assignment_row.expires_at <= now() THEN
    RAISE EXCEPTION 'La asignacion cerrada o vencida no se puede editar';
  END IF;
  old_row := assignment_row;
  SELECT coalesce(array_agg(DISTINCT value::uuid), ARRAY[]::uuid[])
  INTO employee_ids FROM jsonb_array_elements_text(coalesce(payload -> 'employee_ids', '[]'::jsonb));
  IF cardinality(employee_ids) = 0 THEN RAISE EXCEPTION 'Seleccione al menos un empleado'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(employee_ids) id WHERE NOT private.training_group_employee_is_allowed(assignment_row.company_id, id)) THEN
    RAISE EXCEPTION 'Uno o mas empleados no estan activos o no estan autorizados';
  END IF;
  IF nullif(payload ->> 'expires_at', '') IS NOT NULL
     AND (payload ->> 'expires_at')::timestamptz <= now() THEN
    RAISE EXCEPTION 'El vencimiento debe ser futuro';
  END IF;

  UPDATE public.training_group_assignments SET
    name = coalesce(nullif(btrim(payload ->> 'name'), ''), name),
    expires_at = coalesce(nullif(payload ->> 'expires_at', '')::timestamptz, expires_at),
    requires_evaluation = coalesce((payload ->> 'requires_evaluation')::boolean, requires_evaluation),
    updated_at = now()
  WHERE id = assignment_id_value RETURNING * INTO assignment_row;
  IF assignment_row.token_id IS NOT NULL THEN
    UPDATE public.training_access_tokens SET expires_at = assignment_row.expires_at,
      requires_evaluation = assignment_row.requires_evaluation, updated_at = now()
    WHERE id = assignment_row.token_id;
  END IF;

  UPDATE public.training_group_participants SET is_active = false, removed_at = now(),
    removed_by = (SELECT auth.uid()), updated_at = now()
  WHERE assignment_id = assignment_id_value AND is_active = true
    AND NOT (employee_id = ANY(employee_ids));
  INSERT INTO public.training_group_participants (assignment_id, company_id, employee_id, added_by)
  SELECT assignment_id_value, assignment_row.company_id, id, (SELECT auth.uid()) FROM unnest(employee_ids) id
  ON CONFLICT (assignment_id, employee_id) DO UPDATE SET
    is_active = true, removed_at = NULL, removed_by = NULL, added_by = EXCLUDED.added_by, updated_at = now();
  PERFORM private.link_training_group_completions(assignment_id_value);
  PERFORM private.log_training_group_action(assignment_row, 'update_training_group_assignment', to_jsonb(old_row),
    jsonb_build_object('name', assignment_row.name, 'expires_at', assignment_row.expires_at, 'participant_count', cardinality(employee_ids)));
  RETURN jsonb_build_object('assignment_id', assignment_id_value, 'updated', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_training_group_assignment(assignment_id_value uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assignment_row public.training_group_assignments;
BEGIN
  SELECT * INTO assignment_row FROM public.training_group_assignments WHERE id = assignment_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_training_groups(assignment_row.company_id, 'update') THEN RAISE EXCEPTION 'Asignacion no encontrada o sin permisos'; END IF;
  UPDATE public.training_group_assignments SET status = 'closed', closed_at = now(), closed_by = (SELECT auth.uid()), updated_at = now() WHERE id = assignment_id_value RETURNING * INTO assignment_row;
  IF assignment_row.token_id IS NOT NULL THEN UPDATE public.training_access_tokens SET is_active = false, updated_at = now() WHERE id = assignment_row.token_id; END IF;
  PERFORM private.log_training_group_action(assignment_row, 'close_training_group_assignment');
  RETURN jsonb_build_object('closed', true);
END; $$;

CREATE OR REPLACE FUNCTION public.get_training_group_compliance(assignment_id_value uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  assignment_row public.training_group_assignments;
  valid_count integer;
  completed_count integer;
  excluded_count integer;
BEGIN
  SELECT * INTO assignment_row
  FROM public.training_group_assignments
  WHERE id = assignment_id_value;
  IF NOT FOUND OR NOT private.can_view_training_group_assignment(assignment_row.id, assignment_row.company_id) THEN
    RAISE EXCEPTION 'Asignacion no encontrada o sin permisos';
  END IF;

  SELECT
    count(*) FILTER (WHERE participant.is_active AND employee.is_active AND employee.status = 'active'),
    count(*) FILTER (WHERE participant.is_active AND employee.is_active AND employee.status = 'active' AND participant.completion_id IS NOT NULL),
    count(*) FILTER (WHERE NOT participant.is_active OR NOT employee.is_active OR employee.status <> 'active')
  INTO valid_count, completed_count, excluded_count
  FROM public.training_group_participants participant
  JOIN public.employees_v2 employee ON employee.id = participant.employee_id
  WHERE participant.assignment_id = assignment_id_value;

  RETURN jsonb_build_object(
    'assignment_id', assignment_id_value,
    'valid', valid_count,
    'completed', completed_count,
    'pending', valid_count - completed_count,
    'excluded', excluded_count,
    'percentage', CASE WHEN valid_count = 0 THEN 0 ELSE round(completed_count * 100.0 / valid_count) END
  );
END; $$;

CREATE OR REPLACE FUNCTION public.delete_training_group_link(assignment_id_value uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assignment_row public.training_group_assignments; deleted_token uuid;
BEGIN
  SELECT * INTO assignment_row FROM public.training_group_assignments WHERE id = assignment_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_training_groups(assignment_row.company_id, 'delete') THEN RAISE EXCEPTION 'Asignacion no encontrada o sin permisos'; END IF;
  deleted_token := assignment_row.token_id;
  IF deleted_token IS NOT NULL THEN DELETE FROM public.training_access_tokens WHERE id = deleted_token; END IF;
  SELECT * INTO assignment_row FROM public.training_group_assignments WHERE id = assignment_id_value;
  PERFORM private.log_training_group_action(assignment_row, 'delete_training_group_link', jsonb_build_object('token_id', deleted_token), jsonb_build_object('token_id', NULL));
  RETURN jsonb_build_object('deleted', deleted_token IS NOT NULL);
END; $$;

CREATE OR REPLACE FUNCTION public.regenerate_training_group_link(assignment_id_value uuid, expires_at_value timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assignment_row public.training_group_assignments; token_row public.training_access_tokens;
BEGIN
  SELECT * INTO assignment_row FROM public.training_group_assignments WHERE id = assignment_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_training_groups(assignment_row.company_id, 'update') THEN RAISE EXCEPTION 'Asignacion no encontrada o sin permisos'; END IF;
  IF assignment_row.status <> 'active' OR assignment_row.token_id IS NOT NULL OR expires_at_value <= now() THEN RAISE EXCEPTION 'No se puede generar el enlace solicitado'; END IF;
  INSERT INTO public.training_access_tokens (company_id, course_id, access_type, usage_type, expires_at, requires_evaluation, created_by)
  VALUES (assignment_row.company_id, assignment_row.course_id, 'link_cedula', 'multiple', expires_at_value, assignment_row.requires_evaluation, (SELECT auth.uid()))
  RETURNING * INTO token_row;
  UPDATE public.training_group_assignments SET token_id = token_row.id, expires_at = expires_at_value, updated_at = now() WHERE id = assignment_id_value RETURNING * INTO assignment_row;
  PERFORM private.log_training_group_action(assignment_row, 'regenerate_training_group_link', NULL, jsonb_build_object('token_id', token_row.id, 'expires_at', expires_at_value));
  RETURN jsonb_build_object('token', token_row.token, 'expires_at', expires_at_value);
END; $$;

CREATE OR REPLACE FUNCTION public.verify_training_group_participant(token_value text, document_value text)
RETURNS TABLE(employee_id uuid, employee_name text, assignment_id uuid, group_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT employee.id, concat_ws(' ', employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name), assignment.id, assignment.name
  FROM public.training_group_assignments assignment
  JOIN public.training_access_tokens token ON token.id = assignment.token_id
  JOIN public.training_group_participants participant ON participant.assignment_id = assignment.id AND participant.is_active = true
  JOIN public.employees_v2 employee ON employee.id = participant.employee_id
  WHERE token.token = token_value AND token.is_active = true AND token.expires_at > now()
    AND assignment.status = 'active' AND assignment.expires_at > now()
    AND employee.is_active = true AND employee.status = 'active'
    AND public.normalize_document_number(employee.document_number) = public.normalize_document_number(document_value);
$$;

REVOKE ALL ON FUNCTION public.verify_training_group_participant(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_training_group_participant(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolve_training_group_token(token_value text)
RETURNS TABLE(assignment_id uuid, group_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT assignment.id, assignment.name
  FROM public.training_group_assignments assignment
  JOIN public.training_access_tokens token ON token.id = assignment.token_id
  WHERE token.token = token_value
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_training_group_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_training_group_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.validate_training_group_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assignment_row public.training_group_assignments;
BEGIN
  IF NEW.token_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO assignment_row FROM public.training_group_assignments WHERE token_id = NEW.token_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.employee_id IS NULL OR assignment_row.status <> 'active' OR assignment_row.expires_at <= now()
     OR NOT EXISTS (
       SELECT 1 FROM public.training_group_participants participant
       JOIN public.employees_v2 employee ON employee.id = participant.employee_id
       WHERE participant.assignment_id = assignment_row.id AND participant.employee_id = NEW.employee_id
         AND participant.is_active = true AND employee.is_active = true AND employee.status = 'active'
     ) THEN RAISE EXCEPTION 'La persona no pertenece al grupo activo de esta capacitacion'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER validate_training_group_completion_before_insert
BEFORE INSERT ON public.training_completions FOR EACH ROW EXECUTE FUNCTION private.validate_training_group_completion();

CREATE OR REPLACE FUNCTION private.sync_training_group_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    UPDATE public.training_group_participants participant SET completion_id = NEW.id, updated_at = now()
    FROM public.training_group_assignments assignment
    WHERE assignment.id = participant.assignment_id AND participant.company_id = NEW.company_id
      AND assignment.course_id = NEW.course_id AND participant.employee_id = NEW.employee_id
      AND participant.is_active = true AND participant.completion_id IS NULL;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER sync_training_group_completion_after_insert
AFTER INSERT ON public.training_completions FOR EACH ROW EXECUTE FUNCTION private.sync_training_group_completion();

REVOKE ALL ON FUNCTION public.create_training_group_assignment(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_training_group_assignment(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_training_group_assignment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_training_group_link(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_training_group_link(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_training_group_compliance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_training_group_assignment(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_training_group_assignment(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_training_group_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_training_group_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_training_group_link(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_group_compliance(uuid) TO authenticated;

COMMIT;
