BEGIN;

CREATE TABLE public.copasst_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 180),
  description text,
  term_label text NOT NULL CHECK (length(btrim(term_label)) BETWEEN 3 AND 80),
  seats integer NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 50),
  allow_blank_vote boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Bogota',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
  public_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex') UNIQUE,
  token_active boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE public.copasst_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.copasst_elections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE RESTRICT,
  ballot_order integer NOT NULL CHECK (ballot_order > 0),
  display_name text NOT NULL,
  position_name text,
  operation_center_name text,
  photo_url text NOT NULL CHECK (length(btrim(photo_url)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, employee_id),
  UNIQUE (election_id, ballot_order)
);

CREATE TABLE public.copasst_electorate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.copasst_elections(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE RESTRICT,
  document_number text NOT NULL,
  display_name text NOT NULL,
  gender text,
  operation_center_id uuid,
  operation_center_name text,
  area_id uuid,
  area_name text,
  position_id uuid,
  position_name text,
  voted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, employee_id)
);

CREATE TABLE public.copasst_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.copasst_elections(id) ON DELETE RESTRICT,
  candidate_id uuid REFERENCES public.copasst_candidates(id) ON DELETE RESTRICT,
  is_blank boolean NOT NULL DEFAULT false,
  receipt_code uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  CHECK ((is_blank AND candidate_id IS NULL) OR (NOT is_blank AND candidate_id IS NOT NULL))
);

CREATE TABLE public.copasst_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.copasst_elections(id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL REFERENCES public.copasst_candidates(id) ON DELETE RESTRICT,
  selection_order integer NOT NULL CHECK (selection_order > 0),
  selection_source text NOT NULL CHECK (selection_source IN ('automatic', 'tie_resolution')),
  resolution_note text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, candidate_id),
  UNIQUE (election_id, selection_order)
);

CREATE TABLE public.copasst_access_attempts (
  election_id uuid NOT NULL REFERENCES public.copasst_elections(id) ON DELETE CASCADE,
  document_hash text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  PRIMARY KEY (election_id, document_hash)
);

CREATE INDEX copasst_elections_company_created_idx ON public.copasst_elections(company_id, created_at DESC);
CREATE INDEX copasst_candidates_election_idx ON public.copasst_candidates(election_id, ballot_order);
CREATE INDEX copasst_electorate_election_vote_idx ON public.copasst_electorate(election_id, voted_at);
CREATE INDEX copasst_electorate_document_idx ON public.copasst_electorate(election_id, document_number);
CREATE INDEX copasst_ballots_election_candidate_idx ON public.copasst_ballots(election_id, candidate_id);
CREATE INDEX copasst_winners_election_idx ON public.copasst_winners(election_id, selection_order);

ALTER TABLE public.copasst_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copasst_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copasst_electorate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copasst_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copasst_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copasst_access_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.copasst_elections, public.copasst_candidates, public.copasst_electorate,
  public.copasst_ballots, public.copasst_winners, public.copasst_access_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.copasst_elections, public.copasst_candidates, public.copasst_electorate,
  public.copasst_winners TO authenticated;

WITH parent_module AS (
  INSERT INTO public.modules (code, name, icon, sort_order, is_active)
  VALUES ('copasst', 'COPASST', 'Vote', 1650, true)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, is_active = true
  RETURNING id
), module_rows AS (
  INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
  SELECT code, name, (SELECT id FROM parent_module), icon, sort_order, true
  FROM (VALUES
    ('copasst_elecciones', 'COPASST: Elecciones', 'Vote', 1651),
    ('copasst_cumplimiento', 'COPASST: Cumplimiento', 'ClipboardCheck', 1652),
    ('analitica_copasst', 'COPASST: Analítica', 'BarChart3', 1653)
  ) AS child(code, name, icon, sort_order)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
    icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = true
  RETURNING id, code, name
)
INSERT INTO public.permissions (module_id, action, description)
SELECT module_rows.id, actions.action::public.permission_action,
  module_rows.name || ' - ' || actions.label
FROM module_rows
CROSS JOIN (VALUES
  ('view', 'Ver'), ('create', 'Crear'), ('update', 'Modificar'),
  ('delete', 'Cancelar/Eliminar'), ('export', 'Exportar')
) AS actions(action, label)
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, actions.action::public.permission_action, 'COPASST - ' || actions.label
FROM public.modules module
CROSS JOIN (VALUES
  ('view', 'Ver'), ('create', 'Crear'), ('update', 'Modificar'),
  ('delete', 'Cancelar/Eliminar'), ('export', 'Exportar')
) AS actions(action, label)
WHERE module.code = 'copasst'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.custom_roles role
JOIN public.permissions permission ON true
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true
  AND module.code IN ('copasst', 'copasst_elecciones', 'copasst_cumplimiento', 'analitica_copasst')
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.can_manage_copasst(target_company_id uuid, target_module text, target_action text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.is_super_admin()
    OR (
      public.is_company_member(target_company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission((SELECT auth.uid()), target_module, target_action)
        OR public.check_user_permission((SELECT auth.uid()), 'copasst', target_action)
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_manage_copasst(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_copasst(uuid, text, text) TO authenticated;

CREATE POLICY "COPASST elections are visible to authorized users"
ON public.copasst_elections FOR SELECT TO authenticated
USING (private.can_manage_copasst(company_id, 'copasst_elecciones', 'view')
  OR private.can_manage_copasst(company_id, 'copasst_cumplimiento', 'view')
  OR private.can_manage_copasst(company_id, 'analitica_copasst', 'view'));

CREATE POLICY "COPASST candidates are visible to authorized users"
ON public.copasst_candidates FOR SELECT TO authenticated
USING (private.can_manage_copasst(company_id, 'copasst_elecciones', 'view')
  OR private.can_manage_copasst(company_id, 'analitica_copasst', 'view'));

CREATE POLICY "COPASST electorate is visible to compliance users"
ON public.copasst_electorate FOR SELECT TO authenticated
USING (private.can_manage_copasst(company_id, 'copasst_cumplimiento', 'view'));

CREATE POLICY "COPASST winners are visible to authorized users"
ON public.copasst_winners FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.copasst_elections election
  WHERE election.id = copasst_winners.election_id
    AND (private.can_manage_copasst(election.company_id, 'copasst_elecciones', 'view')
      OR private.can_manage_copasst(election.company_id, 'analitica_copasst', 'view'))
));

CREATE OR REPLACE FUNCTION private.log_copasst_action(
  target_election public.copasst_elections,
  target_action text,
  target_values jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    (SELECT auth.uid()), (SELECT auth.jwt() ->> 'email'), target_election.company_id,
    target_action, 'copasst_election', target_election.id, target_election.title, target_values
  );
END;
$$;
REVOKE ALL ON FUNCTION private.log_copasst_action(public.copasst_elections, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.replace_copasst_candidates(target_election public.copasst_elections, candidate_payload jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE candidate_item jsonb;
DECLARE employee_row public.employees_v2;
DECLARE work_row public.employee_work_info;
DECLARE candidate_position integer := 0;
DECLARE candidate_photo text;
BEGIN
  IF jsonb_typeof(candidate_payload) <> 'array' OR jsonb_array_length(candidate_payload) = 0 THEN
    RAISE EXCEPTION 'Seleccione al menos un candidato';
  END IF;

  DELETE FROM public.copasst_candidates WHERE election_id = target_election.id;
  FOR candidate_item IN SELECT value FROM jsonb_array_elements(candidate_payload)
  LOOP
    candidate_position := candidate_position + 1;
    SELECT * INTO employee_row
    FROM public.employees_v2 employee
    WHERE employee.id = (candidate_item ->> 'employee_id')::uuid
      AND employee.company_id = target_election.company_id
      AND employee.is_active = true AND employee.status = 'active';
    IF NOT FOUND THEN RAISE EXCEPTION 'Todos los candidatos deben ser empleados activos de la empresa'; END IF;

    SELECT * INTO work_row FROM public.employee_work_info work
    WHERE work.employee_id = employee_row.id AND work.is_current = true
    ORDER BY work.valid_from DESC LIMIT 1;
    candidate_photo := nullif(btrim(candidate_item ->> 'photo_url'), '');
    candidate_photo := coalesce(candidate_photo, nullif(btrim(employee_row.avatar_url), ''));
    IF candidate_photo IS NULL THEN RAISE EXCEPTION 'Todos los candidatos deben tener fotografía'; END IF;

    INSERT INTO public.copasst_candidates (
      election_id, company_id, employee_id, ballot_order, display_name,
      position_name, operation_center_name, photo_url
    )
    SELECT target_election.id, target_election.company_id, employee_row.id, candidate_position,
      concat_ws(' ', employee_row.first_name, employee_row.middle_name, employee_row.last_name, employee_row.second_last_name),
      work_row.position_name, center.name, candidate_photo
    FROM (SELECT 1) seed
    LEFT JOIN public.operation_centers center ON center.id = work_row.operation_center_id;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION private.replace_copasst_candidates(public.copasst_elections, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.create_copasst_election_impl(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE company_value uuid := (payload ->> 'company_id')::uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT private.can_manage_copasst(company_value, 'copasst_elecciones', 'create') THEN
    RAISE EXCEPTION 'No tienes permiso para crear elecciones COPASST';
  END IF;
  INSERT INTO public.copasst_elections (
    company_id, title, description, term_label, seats, allow_blank_vote,
    starts_at, ends_at, created_by
  ) VALUES (
    company_value, btrim(payload ->> 'title'), nullif(btrim(payload ->> 'description'), ''),
    btrim(payload ->> 'term_label'), coalesce((payload ->> 'seats')::integer, 1),
    coalesce((payload ->> 'allow_blank_vote')::boolean, true),
    (payload ->> 'starts_at')::timestamptz, (payload ->> 'ends_at')::timestamptz, (SELECT auth.uid())
  ) RETURNING * INTO election_row;
  PERFORM private.replace_copasst_candidates(election_row, payload -> 'candidates');
  PERFORM private.log_copasst_action(election_row, 'create', jsonb_build_object('status', 'draft'));
  RETURN to_jsonb(election_row);
END;
$$;

CREATE OR REPLACE FUNCTION private.update_copasst_draft_impl(election_id_value uuid, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'update') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  IF election_row.status <> 'draft' THEN RAISE EXCEPTION 'La papeleta publicada es inmutable'; END IF;
  UPDATE public.copasst_elections SET
    title = btrim(payload ->> 'title'), description = nullif(btrim(payload ->> 'description'), ''),
    term_label = btrim(payload ->> 'term_label'), seats = coalesce((payload ->> 'seats')::integer, 1),
    allow_blank_vote = coalesce((payload ->> 'allow_blank_vote')::boolean, true),
    starts_at = (payload ->> 'starts_at')::timestamptz, ends_at = (payload ->> 'ends_at')::timestamptz,
    updated_at = now()
  WHERE id = election_id_value RETURNING * INTO election_row;
  PERFORM private.replace_copasst_candidates(election_row, payload -> 'candidates');
  PERFORM private.log_copasst_action(election_row, 'update', jsonb_build_object('status', 'draft'));
  RETURN to_jsonb(election_row);
END;
$$;

CREATE OR REPLACE FUNCTION private.publish_copasst_election_impl(election_id_value uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE candidate_count integer;
DECLARE electorate_count integer;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'update') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  IF election_row.status <> 'draft' THEN RAISE EXCEPTION 'Solo se pueden publicar borradores'; END IF;
  SELECT count(*) INTO candidate_count FROM public.copasst_candidates
  WHERE election_id = election_row.id AND nullif(btrim(photo_url), '') IS NOT NULL;
  IF candidate_count < election_row.seats THEN RAISE EXCEPTION 'El número de candidatos debe ser igual o mayor a los puestos'; END IF;

  INSERT INTO public.copasst_electorate (
    election_id, company_id, employee_id, document_number, display_name, gender,
    operation_center_id, operation_center_name, area_id, area_name, position_id, position_name
  )
  SELECT election_row.id, employee.company_id, employee.id, employee.document_number,
    concat_ws(' ', employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name),
    employee.gender::text, work.operation_center_id, center.name, work.area_id, area.name,
    work.position_id, coalesce(position.name, work.position_name)
  FROM public.employees_v2 employee
  LEFT JOIN LATERAL (
    SELECT current_work.* FROM public.employee_work_info current_work
    WHERE current_work.employee_id = employee.id AND current_work.is_current = true
    ORDER BY current_work.valid_from DESC LIMIT 1
  ) work ON true
  LEFT JOIN public.operation_centers center ON center.id = work.operation_center_id
  LEFT JOIN public.areas area ON area.id = work.area_id
  LEFT JOIN public.positions position ON position.id = work.position_id
  WHERE employee.company_id = election_row.company_id
    AND employee.is_active = true AND employee.status = 'active';
  GET DIAGNOSTICS electorate_count = ROW_COUNT;
  IF electorate_count = 0 THEN RAISE EXCEPTION 'La empresa no tiene empleados activos para conformar el censo'; END IF;

  UPDATE public.copasst_elections SET status = 'published', published_at = now(),
    published_by = (SELECT auth.uid()), updated_at = now()
  WHERE id = election_row.id RETURNING * INTO election_row;
  PERFORM private.log_copasst_action(election_row, 'publish', jsonb_build_object(
    'candidate_count', candidate_count, 'electorate_count', electorate_count));
  RETURN to_jsonb(election_row);
END;
$$;

CREATE OR REPLACE FUNCTION private.rotate_copasst_token_impl(election_id_value uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'update') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  IF election_row.status = 'draft' OR election_row.status = 'cancelled' THEN
    RAISE EXCEPTION 'El enlace solo está disponible para elecciones publicadas';
  END IF;
  UPDATE public.copasst_elections SET public_token = encode(extensions.gen_random_bytes(24), 'hex'),
    token_active = true, updated_at = now() WHERE id = election_id_value RETURNING * INTO election_row;
  PERFORM private.log_copasst_action(election_row, 'rotate_link');
  RETURN election_row.public_token;
END;
$$;

CREATE OR REPLACE FUNCTION private.update_copasst_schedule_impl(election_id_value uuid, starts_at_value timestamptz, ends_at_value timestamptz)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'update') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  IF election_row.status NOT IN ('published') OR election_row.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Las fechas solo pueden ajustarse en una elección publicada y no cerrada';
  END IF;
  IF starts_at_value IS NULL OR ends_at_value IS NULL OR ends_at_value <= starts_at_value THEN
    RAISE EXCEPTION 'La fecha de cierre debe ser posterior a la fecha de inicio';
  END IF;
  UPDATE public.copasst_elections SET starts_at = starts_at_value, ends_at = ends_at_value, updated_at = now()
  WHERE id = election_id_value RETURNING * INTO election_row;
  PERFORM private.log_copasst_action(election_row, 'update_schedule',
    jsonb_build_object('starts_at', starts_at_value, 'ends_at', ends_at_value));
  RETURN to_jsonb(election_row);
END;
$$;

CREATE OR REPLACE FUNCTION private.set_copasst_token_active_impl(election_id_value uuid, active_value boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'update') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  IF election_row.status = 'draft' THEN RAISE EXCEPTION 'La elección aún no tiene enlace público'; END IF;
  UPDATE public.copasst_elections SET token_active = active_value, updated_at = now()
  WHERE id = election_id_value RETURNING * INTO election_row;
  PERFORM private.log_copasst_action(election_row, CASE WHEN active_value THEN 'activate_link' ELSE 'deactivate_link' END);
  RETURN election_row.token_active;
END;
$$;

CREATE OR REPLACE FUNCTION private.delete_copasst_draft_impl(election_id_value uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'delete') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  IF election_row.status <> 'draft' THEN RAISE EXCEPTION 'Solo se pueden eliminar borradores'; END IF;
  PERFORM private.log_copasst_action(election_row, 'delete', jsonb_build_object('status', 'draft'));
  DELETE FROM public.copasst_elections WHERE id = election_id_value;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION private.cancel_copasst_election_impl(election_id_value uuid, note_value text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE vote_count integer;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'delete') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  SELECT count(*) INTO vote_count FROM public.copasst_ballots WHERE election_id = election_id_value;
  IF election_row.status NOT IN ('published') OR vote_count > 0 THEN
    RAISE EXCEPTION 'Solo se puede cancelar una elección publicada sin votos';
  END IF;
  IF length(btrim(coalesce(note_value, ''))) < 5 THEN RAISE EXCEPTION 'Registre el motivo de cancelación'; END IF;
  UPDATE public.copasst_elections SET status = 'cancelled', token_active = false,
    cancelled_at = now(), cancelled_by = (SELECT auth.uid()), updated_at = now()
  WHERE id = election_id_value RETURNING * INTO election_row;
  PERFORM private.log_copasst_action(election_row, 'cancel', jsonb_build_object('note', btrim(note_value)));
  RETURN to_jsonb(election_row);
END;
$$;

CREATE OR REPLACE FUNCTION private.log_copasst_export_impl(election_id_value uuid, export_type_value text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id,
    CASE WHEN export_type_value = 'electorate_xlsx' THEN 'copasst_cumplimiento' ELSE 'analitica_copasst' END, 'export') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso para exportar';
  END IF;
  IF export_type_value NOT IN ('minutes_pdf', 'electorate_xlsx') THEN RAISE EXCEPTION 'Tipo de exportación inválido'; END IF;
  PERFORM private.log_copasst_action(election_row, 'export', jsonb_build_object('type', export_type_value));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION private.close_copasst_election_impl(election_id_value uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE boundary_votes bigint;
DECLARE above_count integer;
DECLARE boundary_count integer;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'update') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  IF election_row.status <> 'published' THEN RAISE EXCEPTION 'Solo se pueden cerrar elecciones publicadas'; END IF;
  UPDATE public.copasst_elections SET status = 'closed', closed_at = now(), closed_by = (SELECT auth.uid()), updated_at = now()
  WHERE id = election_id_value RETURNING * INTO election_row;
  DELETE FROM public.copasst_winners WHERE election_id = election_row.id;

  SELECT votes INTO boundary_votes FROM (
    SELECT candidate.id, count(ballot.id) AS votes
    FROM public.copasst_candidates candidate
    LEFT JOIN public.copasst_ballots ballot ON ballot.candidate_id = candidate.id
    WHERE candidate.election_id = election_row.id
    GROUP BY candidate.id ORDER BY count(ballot.id) DESC, candidate.ballot_order
    OFFSET greatest(election_row.seats - 1, 0) LIMIT 1
  ) boundary;
  SELECT count(*) INTO above_count FROM (
    SELECT candidate.id FROM public.copasst_candidates candidate
    LEFT JOIN public.copasst_ballots ballot ON ballot.candidate_id = candidate.id
    WHERE candidate.election_id = election_row.id GROUP BY candidate.id
    HAVING count(ballot.id) > coalesce(boundary_votes, 0)
  ) ranked;
  SELECT count(*) INTO boundary_count FROM (
    SELECT candidate.id FROM public.copasst_candidates candidate
    LEFT JOIN public.copasst_ballots ballot ON ballot.candidate_id = candidate.id
    WHERE candidate.election_id = election_row.id GROUP BY candidate.id
    HAVING count(ballot.id) = coalesce(boundary_votes, 0)
  ) tied;

  INSERT INTO public.copasst_winners (election_id, candidate_id, selection_order, selection_source)
  SELECT election_row.id, result.candidate_id, row_number() OVER (ORDER BY result.votes DESC, result.ballot_order), 'automatic'
  FROM (
    SELECT candidate.id AS candidate_id, candidate.ballot_order, count(ballot.id) AS votes
    FROM public.copasst_candidates candidate
    LEFT JOIN public.copasst_ballots ballot ON ballot.candidate_id = candidate.id
    WHERE candidate.election_id = election_row.id
    GROUP BY candidate.id, candidate.ballot_order
  ) result
  WHERE result.votes > coalesce(boundary_votes, 0)
     OR (result.votes = coalesce(boundary_votes, 0) AND boundary_count <= election_row.seats - above_count)
  ORDER BY result.votes DESC, result.ballot_order
  LIMIT election_row.seats;
  PERFORM private.log_copasst_action(election_row, 'close');
  RETURN jsonb_build_object('election', to_jsonb(election_row),
    'tie_pending', boundary_count > election_row.seats - above_count);
END;
$$;

CREATE OR REPLACE FUNCTION private.resolve_copasst_tie_impl(election_id_value uuid, candidate_ids uuid[], note_value text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE slots_left integer;
DECLARE boundary_votes bigint;
DECLARE selected_id uuid;
DECLARE next_order integer;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value FOR UPDATE;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_elecciones', 'update') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  IF election_row.status <> 'closed' THEN RAISE EXCEPTION 'La elección debe estar cerrada'; END IF;
  IF length(btrim(coalesce(note_value, ''))) < 5 THEN RAISE EXCEPTION 'Registre la justificación del desempate'; END IF;
  SELECT election_row.seats - count(*) INTO slots_left FROM public.copasst_winners WHERE election_id = election_row.id;
  IF slots_left <= 0 OR coalesce(array_length(candidate_ids, 1), 0) <> slots_left THEN
    RAISE EXCEPTION 'Seleccione exactamente los candidatos requeridos para completar los puestos';
  END IF;
  SELECT votes INTO boundary_votes FROM (
    SELECT candidate.id, count(ballot.id) votes FROM public.copasst_candidates candidate
    LEFT JOIN public.copasst_ballots ballot ON ballot.candidate_id = candidate.id
    WHERE candidate.election_id = election_row.id
    GROUP BY candidate.id ORDER BY count(ballot.id) DESC, candidate.ballot_order
    OFFSET greatest(election_row.seats - 1, 0) LIMIT 1
  ) boundary;
  SELECT coalesce(max(selection_order), 0) + 1 INTO next_order FROM public.copasst_winners WHERE election_id = election_row.id;
  FOREACH selected_id IN ARRAY candidate_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.copasst_candidates candidate
      LEFT JOIN public.copasst_ballots ballot ON ballot.candidate_id = candidate.id
      WHERE candidate.election_id = election_row.id AND candidate.id = selected_id
      GROUP BY candidate.id HAVING count(ballot.id) = coalesce(boundary_votes, 0)
    ) THEN RAISE EXCEPTION 'Solo se pueden seleccionar candidatos empatados en el límite'; END IF;
    INSERT INTO public.copasst_winners (
      election_id, candidate_id, selection_order, selection_source, resolution_note, resolved_by
    ) VALUES (election_row.id, selected_id, next_order, 'tie_resolution', btrim(note_value), (SELECT auth.uid()));
    next_order := next_order + 1;
  END LOOP;
  PERFORM private.log_copasst_action(election_row, 'resolve_tie', jsonb_build_object('selected_count', slots_left, 'note', btrim(note_value)));
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION private.record_copasst_attempt(election_row public.copasst_elections, normalized_document text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE attempt_row public.copasst_access_attempts;
DECLARE hash_value text := encode(extensions.digest(coalesce(normalized_document, '') || election_row.id::text || election_row.public_token, 'sha256'), 'hex');
BEGIN
  INSERT INTO public.copasst_access_attempts (election_id, document_hash)
  VALUES (election_row.id, hash_value)
  ON CONFLICT (election_id, document_hash) DO UPDATE SET
    attempts = CASE WHEN public.copasst_access_attempts.window_started_at < now() - interval '10 minutes'
      THEN 1 ELSE public.copasst_access_attempts.attempts + 1 END,
    window_started_at = CASE WHEN public.copasst_access_attempts.window_started_at < now() - interval '10 minutes'
      THEN now() ELSE public.copasst_access_attempts.window_started_at END
  RETURNING * INTO attempt_row;
  IF attempt_row.attempts > 8 THEN RAISE EXCEPTION 'No fue posible validar la información suministrada'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.record_copasst_attempt(public.copasst_elections, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.copasst_effective_status(election_row public.copasst_elections)
RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT CASE
    WHEN election_row.status = 'cancelled' THEN 'cancelled'
    WHEN election_row.status = 'closed' OR election_row.ends_at <= now() THEN 'closed'
    WHEN election_row.status = 'draft' THEN 'draft'
    WHEN election_row.starts_at > now() THEN 'scheduled'
    ELSE 'open'
  END;
$$;

CREATE OR REPLACE FUNCTION private.copasst_result_payload(election_row public.copasst_elections)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH tallies AS (
    SELECT candidate.id, candidate.display_name, candidate.position_name, candidate.operation_center_name,
      candidate.photo_url, candidate.ballot_order, count(ballot.id)::integer AS votes
    FROM public.copasst_candidates candidate
    LEFT JOIN public.copasst_ballots ballot ON ballot.candidate_id = candidate.id
    WHERE candidate.election_id = election_row.id
    GROUP BY candidate.id
  ), boundary AS (
    SELECT votes FROM tallies ORDER BY votes DESC, ballot_order OFFSET greatest(election_row.seats - 1, 0) LIMIT 1
  ), counts AS (
    SELECT count(*) FILTER (WHERE votes > coalesce((SELECT votes FROM boundary), 0))::integer AS above_count,
      count(*) FILTER (WHERE votes = coalesce((SELECT votes FROM boundary), 0))::integer AS boundary_count
    FROM tallies
  )
  SELECT jsonb_build_object(
    'candidates', coalesce((SELECT jsonb_agg(to_jsonb(tallies) ORDER BY votes DESC, ballot_order) FROM tallies), '[]'::jsonb),
    'blank_votes', (SELECT count(*) FROM public.copasst_ballots ballot WHERE ballot.election_id = election_row.id AND ballot.is_blank),
    'total_votes', (SELECT count(*) FROM public.copasst_ballots ballot WHERE ballot.election_id = election_row.id),
    'tie_pending', (SELECT boundary_count > election_row.seats - above_count FROM counts),
    'winners', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'candidate_id', winner.candidate_id, 'selection_order', winner.selection_order,
      'selection_source', winner.selection_source, 'resolution_note', winner.resolution_note
    ) ORDER BY winner.selection_order) FROM public.copasst_winners winner WHERE winner.election_id = election_row.id),
    CASE WHEN private.copasst_effective_status(election_row) = 'closed'
      AND NOT (SELECT boundary_count > election_row.seats - above_count FROM counts)
    THEN (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'candidate_id', automatic.id, 'selection_order', automatic.selection_order,
        'selection_source', 'automatic', 'resolution_note', NULL
      ) ORDER BY automatic.selection_order), '[]'::jsonb)
      FROM (SELECT tallies.id, row_number() OVER (ORDER BY tallies.votes DESC, tallies.ballot_order) AS selection_order
        FROM tallies ORDER BY tallies.votes DESC, tallies.ballot_order LIMIT election_row.seats) automatic)
    ELSE '[]'::jsonb END)
  );
$$;

CREATE OR REPLACE FUNCTION private.get_copasst_ballot_impl(token_value text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE effective_status text;
DECLARE candidates_value jsonb;
DECLARE company_value jsonb;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections
  WHERE public_token = token_value AND token_active = true AND status <> 'draft';
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
  effective_status := private.copasst_effective_status(election_row);
  IF effective_status = 'cancelled' THEN RETURN jsonb_build_object('valid', false); END IF;
  SELECT jsonb_build_object('name', company.name, 'logo_url', company.horizontal_logo_url)
    INTO company_value FROM public.companies company WHERE company.id = election_row.company_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', candidate.id, 'display_name', candidate.display_name, 'position_name', candidate.position_name,
    'operation_center_name', candidate.operation_center_name, 'photo_url', candidate.photo_url,
    'ballot_order', candidate.ballot_order
  ) ORDER BY candidate.ballot_order), '[]'::jsonb) INTO candidates_value
  FROM public.copasst_candidates candidate WHERE candidate.election_id = election_row.id;
  RETURN jsonb_build_object(
    'valid', true, 'election', jsonb_build_object(
      'id', election_row.id, 'title', election_row.title, 'description', election_row.description,
      'term_label', election_row.term_label, 'seats', election_row.seats,
      'allow_blank_vote', election_row.allow_blank_vote, 'starts_at', election_row.starts_at,
      'ends_at', election_row.ends_at, 'status', effective_status
    ), 'company', company_value, 'candidates', candidates_value,
    'results', CASE WHEN effective_status = 'closed' THEN private.copasst_result_payload(election_row) ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.verify_copasst_voter_impl(token_value text, document_value text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE voter_row public.copasst_electorate;
DECLARE normalized_document text := public.normalize_document_number(document_value);
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections
  WHERE public_token = token_value AND token_active = true;
  IF NOT FOUND OR private.copasst_effective_status(election_row) <> 'open' OR normalized_document IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'already_voted', false, 'message', 'No fue posible validar la información suministrada');
  END IF;
  PERFORM private.record_copasst_attempt(election_row, normalized_document);
  SELECT * INTO voter_row FROM public.copasst_electorate voter
  WHERE voter.election_id = election_row.id
    AND public.normalize_document_number(voter.document_number) = normalized_document;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'already_voted', false, 'message', 'No fue posible validar la información suministrada');
  END IF;
  RETURN jsonb_build_object('eligible', voter_row.voted_at IS NULL,
    'already_voted', voter_row.voted_at IS NOT NULL,
    'message', CASE WHEN voter_row.voted_at IS NULL THEN 'Documento habilitado para votar' ELSE 'Este documento ya registró su participación' END);
END;
$$;

CREATE OR REPLACE FUNCTION private.cast_copasst_vote_impl(
  token_value text, document_value text, candidate_id_value uuid, blank_vote_value boolean
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE voter_row public.copasst_electorate;
DECLARE receipt_value uuid;
DECLARE normalized_document text := public.normalize_document_number(document_value);
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections
  WHERE public_token = token_value AND token_active = true FOR UPDATE;
  IF NOT FOUND OR private.copasst_effective_status(election_row) <> 'open' OR normalized_document IS NULL THEN
    RAISE EXCEPTION 'No fue posible registrar el voto';
  END IF;
  PERFORM private.record_copasst_attempt(election_row, normalized_document);
  SELECT * INTO voter_row FROM public.copasst_electorate voter
  WHERE voter.election_id = election_row.id
    AND public.normalize_document_number(voter.document_number) = normalized_document
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No fue posible registrar el voto'; END IF;
  IF voter_row.voted_at IS NOT NULL THEN RAISE EXCEPTION 'Este documento ya registró su participación'; END IF;
  IF coalesce(blank_vote_value, false) THEN
    IF NOT election_row.allow_blank_vote OR candidate_id_value IS NOT NULL THEN RAISE EXCEPTION 'Selección de voto inválida'; END IF;
  ELSIF candidate_id_value IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.copasst_candidates candidate
    WHERE candidate.id = candidate_id_value AND candidate.election_id = election_row.id
  ) THEN RAISE EXCEPTION 'Selección de voto inválida'; END IF;

  INSERT INTO public.copasst_ballots (election_id, candidate_id, is_blank)
  VALUES (election_row.id, CASE WHEN blank_vote_value THEN NULL ELSE candidate_id_value END, coalesce(blank_vote_value, false))
  RETURNING receipt_code INTO receipt_value;
  UPDATE public.copasst_electorate SET voted_at = clock_timestamp() WHERE id = voter_row.id;
  RETURN jsonb_build_object('success', true, 'receipt_code', receipt_value);
END;
$$;

CREATE OR REPLACE FUNCTION private.get_copasst_compliance_impl(election_id_value uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'copasst_cumplimiento', 'view') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  RETURN jsonb_build_object(
    'summary', (SELECT jsonb_build_object(
      'eligible', count(*), 'voted', count(*) FILTER (WHERE voted_at IS NOT NULL),
      'pending', count(*) FILTER (WHERE voted_at IS NULL),
      'participation', CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE voted_at IS NOT NULL) / count(*), 1) END
    ) FROM public.copasst_electorate WHERE election_id = election_row.id),
    'electors', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', voter.id, 'employee_id', voter.employee_id, 'document_number', voter.document_number,
      'display_name', voter.display_name, 'gender', voter.gender,
      'operation_center_name', voter.operation_center_name, 'area_name', voter.area_name,
      'position_name', voter.position_name, 'voted_at', voter.voted_at
    ) ORDER BY voter.display_name), '[]'::jsonb) FROM public.copasst_electorate voter WHERE voter.election_id = election_row.id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.get_copasst_analytics_impl(election_id_value uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE total_eligible integer;
DECLARE total_voted integer;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'analitica_copasst', 'view') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  SELECT count(*), count(*) FILTER (WHERE voted_at IS NOT NULL) INTO total_eligible, total_voted
  FROM public.copasst_electorate WHERE election_id = election_row.id;
  RETURN jsonb_build_object(
    'election', jsonb_build_object('id', election_row.id, 'title', election_row.title,
      'term_label', election_row.term_label, 'seats', election_row.seats,
      'status', private.copasst_effective_status(election_row), 'starts_at', election_row.starts_at, 'ends_at', election_row.ends_at),
    'kpis', jsonb_build_object('eligible', total_eligible, 'voted', total_voted,
      'pending', total_eligible - total_voted,
      'participation', CASE WHEN total_eligible = 0 THEN 0 ELSE round(100.0 * total_voted / total_eligible, 1) END),
    'results', private.copasst_result_payload(election_row),
    'segments', jsonb_build_object(
      'gender', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.label), '[]'::jsonb) FROM (
        SELECT coalesce(gender, 'Sin dato') label, count(*)::integer eligible,
          count(*) FILTER (WHERE voted_at IS NOT NULL)::integer voted
        FROM public.copasst_electorate WHERE election_id = election_row.id GROUP BY coalesce(gender, 'Sin dato')
      ) grouped),
      'center', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.label), '[]'::jsonb) FROM (
        SELECT coalesce(operation_center_name, 'Sin dato') label, count(*)::integer eligible,
          count(*) FILTER (WHERE voted_at IS NOT NULL)::integer voted
        FROM public.copasst_electorate WHERE election_id = election_row.id GROUP BY coalesce(operation_center_name, 'Sin dato')
      ) grouped),
      'area', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.label), '[]'::jsonb) FROM (
        SELECT coalesce(area_name, 'Sin dato') label, count(*)::integer eligible,
          count(*) FILTER (WHERE voted_at IS NOT NULL)::integer voted
        FROM public.copasst_electorate WHERE election_id = election_row.id GROUP BY coalesce(area_name, 'Sin dato')
      ) grouped),
      'position', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.label), '[]'::jsonb) FROM (
        SELECT coalesce(position_name, 'Sin dato') label, count(*)::integer eligible,
          count(*) FILTER (WHERE voted_at IS NOT NULL)::integer voted
        FROM public.copasst_electorate WHERE election_id = election_row.id GROUP BY coalesce(position_name, 'Sin dato')
      ) grouped)
    ),
    'timeline', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.bucket), '[]'::jsonb) FROM (
      SELECT date_trunc(CASE WHEN election_row.ends_at - election_row.starts_at <= interval '3 days' THEN 'hour' ELSE 'day' END, voted_at) bucket,
        count(*)::integer votes FROM public.copasst_electorate
      WHERE election_id = election_row.id AND voted_at IS NOT NULL GROUP BY 1
    ) grouped),
    'quality', (SELECT jsonb_build_object(
      'missing_gender', count(*) FILTER (WHERE gender IS NULL),
      'missing_center', count(*) FILTER (WHERE operation_center_name IS NULL),
      'missing_area', count(*) FILTER (WHERE area_name IS NULL),
      'missing_position', count(*) FILTER (WHERE position_name IS NULL)
    ) FROM public.copasst_electorate WHERE election_id = election_row.id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_copasst_election(payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.create_copasst_election_impl(payload) $$;
CREATE OR REPLACE FUNCTION public.update_copasst_draft(election_id uuid, payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.update_copasst_draft_impl(election_id, payload) $$;
CREATE OR REPLACE FUNCTION public.publish_copasst_election(election_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.publish_copasst_election_impl(election_id) $$;
CREATE OR REPLACE FUNCTION public.rotate_copasst_token(election_id uuid) RETURNS text
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.rotate_copasst_token_impl(election_id) $$;
CREATE OR REPLACE FUNCTION public.update_copasst_schedule(election_id uuid, starts_at timestamptz, ends_at timestamptz) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.update_copasst_schedule_impl(election_id, starts_at, ends_at) $$;
CREATE OR REPLACE FUNCTION public.set_copasst_token_active(election_id uuid, active boolean) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.set_copasst_token_active_impl(election_id, active) $$;
CREATE OR REPLACE FUNCTION public.delete_copasst_draft(election_id uuid) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.delete_copasst_draft_impl(election_id) $$;
CREATE OR REPLACE FUNCTION public.cancel_copasst_election(election_id uuid, note text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.cancel_copasst_election_impl(election_id, note) $$;
CREATE OR REPLACE FUNCTION public.log_copasst_export(election_id uuid, export_type text) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.log_copasst_export_impl(election_id, export_type) $$;
CREATE OR REPLACE FUNCTION public.close_copasst_election(election_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.close_copasst_election_impl(election_id) $$;
CREATE OR REPLACE FUNCTION public.resolve_copasst_tie(election_id uuid, candidate_ids uuid[], note text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.resolve_copasst_tie_impl(election_id, candidate_ids, note) $$;
CREATE OR REPLACE FUNCTION public.get_copasst_ballot(token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT private.get_copasst_ballot_impl(token) $$;
CREATE OR REPLACE FUNCTION public.verify_copasst_voter(token text, document text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.verify_copasst_voter_impl(token, document) $$;
CREATE OR REPLACE FUNCTION public.cast_copasst_vote(token text, document text, candidate_id uuid, blank_vote boolean) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.cast_copasst_vote_impl(token, document, candidate_id, blank_vote) $$;
CREATE OR REPLACE FUNCTION public.get_copasst_compliance(election_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT private.get_copasst_compliance_impl(election_id) $$;
CREATE OR REPLACE FUNCTION public.get_copasst_analytics(election_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT private.get_copasst_analytics_impl(election_id) $$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
REVOKE ALL ON FUNCTION private.create_copasst_election_impl(jsonb),
  private.update_copasst_draft_impl(uuid, jsonb), private.publish_copasst_election_impl(uuid),
  private.rotate_copasst_token_impl(uuid), private.update_copasst_schedule_impl(uuid, timestamptz, timestamptz),
  private.set_copasst_token_active_impl(uuid, boolean), private.delete_copasst_draft_impl(uuid),
  private.cancel_copasst_election_impl(uuid, text), private.log_copasst_export_impl(uuid, text),
  private.close_copasst_election_impl(uuid), private.resolve_copasst_tie_impl(uuid, uuid[], text),
  private.get_copasst_ballot_impl(text), private.verify_copasst_voter_impl(text, text),
  private.cast_copasst_vote_impl(text, text, uuid, boolean), private.get_copasst_compliance_impl(uuid),
  private.get_copasst_analytics_impl(uuid), private.copasst_effective_status(public.copasst_elections),
  private.copasst_result_payload(public.copasst_elections) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_copasst(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.create_copasst_election_impl(jsonb),
  private.update_copasst_draft_impl(uuid, jsonb), private.publish_copasst_election_impl(uuid),
  private.rotate_copasst_token_impl(uuid), private.update_copasst_schedule_impl(uuid, timestamptz, timestamptz),
  private.set_copasst_token_active_impl(uuid, boolean), private.delete_copasst_draft_impl(uuid),
  private.cancel_copasst_election_impl(uuid, text), private.log_copasst_export_impl(uuid, text),
  private.close_copasst_election_impl(uuid),
  private.resolve_copasst_tie_impl(uuid, uuid[], text), private.get_copasst_ballot_impl(text),
  private.verify_copasst_voter_impl(text, text), private.cast_copasst_vote_impl(text, text, uuid, boolean),
  private.get_copasst_compliance_impl(uuid), private.get_copasst_analytics_impl(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_copasst_ballot_impl(text), private.verify_copasst_voter_impl(text, text),
  private.cast_copasst_vote_impl(text, text, uuid, boolean) TO anon;

REVOKE ALL ON FUNCTION public.create_copasst_election(jsonb), public.update_copasst_draft(uuid, jsonb),
  public.publish_copasst_election(uuid), public.rotate_copasst_token(uuid), public.close_copasst_election(uuid),
  public.update_copasst_schedule(uuid, timestamptz, timestamptz), public.set_copasst_token_active(uuid, boolean),
  public.delete_copasst_draft(uuid), public.cancel_copasst_election(uuid, text), public.log_copasst_export(uuid, text),
  public.resolve_copasst_tie(uuid, uuid[], text), public.get_copasst_ballot(text),
  public.verify_copasst_voter(text, text), public.cast_copasst_vote(text, text, uuid, boolean),
  public.get_copasst_compliance(uuid), public.get_copasst_analytics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_copasst_election(jsonb), public.update_copasst_draft(uuid, jsonb),
  public.publish_copasst_election(uuid), public.rotate_copasst_token(uuid), public.close_copasst_election(uuid),
  public.update_copasst_schedule(uuid, timestamptz, timestamptz), public.set_copasst_token_active(uuid, boolean),
  public.delete_copasst_draft(uuid), public.cancel_copasst_election(uuid, text), public.log_copasst_export(uuid, text),
  public.resolve_copasst_tie(uuid, uuid[], text), public.get_copasst_compliance(uuid),
  public.get_copasst_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_copasst_ballot(text), public.verify_copasst_voter(text, text),
  public.cast_copasst_vote(text, text, uuid, boolean) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('copasst-assets', 'copasst-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "COPASST authorized users can upload candidate photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'copasst-assets'
  AND private.can_manage_copasst(((storage.foldername(name))[1])::uuid, 'copasst_elecciones', 'create'));
CREATE POLICY "COPASST authorized users can update candidate photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'copasst-assets'
  AND private.can_manage_copasst(((storage.foldername(name))[1])::uuid, 'copasst_elecciones', 'update'))
WITH CHECK (bucket_id = 'copasst-assets'
  AND private.can_manage_copasst(((storage.foldername(name))[1])::uuid, 'copasst_elecciones', 'update'));
CREATE POLICY "COPASST authorized users can delete candidate photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'copasst-assets'
  AND private.can_manage_copasst(((storage.foldername(name))[1])::uuid, 'copasst_elecciones', 'delete'));

COMMIT;
