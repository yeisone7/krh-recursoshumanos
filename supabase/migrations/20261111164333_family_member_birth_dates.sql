ALTER TABLE public.employee_family_members
  ADD COLUMN birth_date date,
  ADD CONSTRAINT employee_family_member_birth_date_valid CHECK (
    birth_date IS NULL OR (birth_date >= DATE '0001-01-01' AND birth_date <= (now() AT TIME ZONE 'America/Bogota')::date)
  );

ALTER TABLE public.candidate_family_members
  ADD COLUMN birth_date date,
  ADD CONSTRAINT candidate_family_member_birth_date_valid CHECK (
    birth_date IS NULL OR (birth_date >= DATE '0001-01-01' AND birth_date <= (now() AT TIME ZONE 'America/Bogota')::date)
  );

CREATE FUNCTION public.replace_employee_family_members(p_employee_id uuid, p_members jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  company uuid;
  cycle_id uuid;
  member jsonb;
  member_id uuid;
  saved_ids uuid[] := '{}';
  name text;
  relation text;
  birth text;
  legacy_age integer;
BEGIN
  IF p_members IS NULL OR p_members = 'null'::jsonb THEN
    RETURN;
  END IF;
  IF jsonb_typeof(p_members) <> 'array' THEN
    RAISE EXCEPTION 'La lista de familiares no es válida.' USING ERRCODE = '22023';
  END IF;

  SELECT parent.company_id INTO STRICT company
  FROM public.employees_v2 parent WHERE parent.id = p_employee_id;
  PERFORM pg_advisory_xact_lock(hashtextextended('employee_family_members:' || p_employee_id::text, 0));

  SELECT cycle.id INTO cycle_id
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = p_employee_id AND cycle.company_id = company AND cycle.status = 'active'
  ORDER BY cycle.cycle_number DESC
  LIMIT 1;

  FOR member IN SELECT value FROM jsonb_array_elements(p_members)
  LOOP
    name := NULLIF(btrim(COALESCE(member->>'full_name', member->>'fullName')), '');
    relation := NULLIF(btrim(member->>'relationship'), '');
    IF name IS NULL OR relation IS NULL THEN
      RAISE EXCEPTION 'Complete el nombre y el parentesco de cada familiar.' USING ERRCODE = '22023';
    END IF;

    birth := NULLIF(member->>'birth_date', '');
    IF birth IS NOT NULL AND birth !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'Ingrese una fecha de nacimiento válida que no sea futura.' USING ERRCODE = '22007';
    END IF;

    member_id := NULLIF(member->>'id', '')::uuid;

    -- Older public clients send names and relationships without record IDs.
    IF member_id IS NULL AND NOT (member ? 'birth_date') THEN
      SELECT (array_agg(saved.id))[1] INTO member_id
      FROM public.employee_family_members saved
      WHERE saved.employee_id = p_employee_id AND saved.company_id = company
        AND saved.employment_cycle_id IS NOT DISTINCT FROM cycle_id
        AND saved.full_name = name AND saved.relationship = relation
        AND NOT (saved.id = ANY(saved_ids))
      HAVING count(*) = 1;
    END IF;

    IF member_id IS NULL THEN
      legacy_age := CASE WHEN member->>'age' ~ '^[0-9]{1,3}$' THEN (member->>'age')::integer END;
      INSERT INTO public.employee_family_members (
        employee_id, company_id, full_name, relationship, birth_date, age, gender, observations, employment_cycle_id
      ) VALUES (
        p_employee_id, company, name, relation, birth::date, legacy_age, NULLIF(member->>'gender', ''),
        COALESCE(NULLIF(member->>'observations', ''),
          'Documento: ' || COALESCE(NULLIF(member->>'document_type', ''), 'CC') || ' ' || NULLIF(btrim(member->>'document_number'), '')), cycle_id
      )
      RETURNING id INTO member_id;
    ELSE
      IF member_id = ANY(saved_ids) THEN
        RAISE EXCEPTION 'La lista contiene un familiar repetido.' USING ERRCODE = '22023';
      END IF;
      UPDATE public.employee_family_members saved
      SET full_name = name,
          relationship = relation,
          birth_date = CASE WHEN member ? 'birth_date' THEN birth::date ELSE saved.birth_date END,
          gender = CASE WHEN member ? 'gender' THEN NULLIF(member->>'gender', '') ELSE saved.gender END,
          observations = CASE
            WHEN member ? 'observations' THEN NULLIF(member->>'observations', '')
            WHEN NULLIF(btrim(member->>'document_number'), '') IS NOT NULL
              THEN 'Documento: ' || COALESCE(NULLIF(member->>'document_type', ''), 'CC') || ' ' || btrim(member->>'document_number')
            ELSE saved.observations
          END
      WHERE saved.id = member_id AND saved.employee_id = p_employee_id AND saved.company_id = company
        AND saved.employment_cycle_id IS NOT DISTINCT FROM cycle_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'El familiar no pertenece al registro que se está actualizando.' USING ERRCODE = '22023';
      END IF;
    END IF;
    saved_ids := array_append(saved_ids, member_id);
  END LOOP;

  DELETE FROM public.employee_family_members saved
  WHERE saved.employee_id = p_employee_id AND saved.company_id = company
        AND saved.employment_cycle_id IS NOT DISTINCT FROM cycle_id
    AND NOT (saved.id = ANY(saved_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.replace_employee_family_members(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_employee_family_members(uuid, jsonb) TO authenticated;

CREATE FUNCTION public.replace_candidate_family_members(p_candidate_id uuid, p_members jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  company uuid;
  member jsonb;
  member_id uuid;
  saved_ids uuid[] := '{}';
  name text;
  relation text;
  birth text;
  legacy_age integer;
BEGIN
  IF p_members IS NULL OR p_members = 'null'::jsonb THEN
    RETURN;
  END IF;
  IF jsonb_typeof(p_members) <> 'array' THEN
    RAISE EXCEPTION 'La lista de familiares no es válida.' USING ERRCODE = '22023';
  END IF;

  SELECT parent.company_id INTO STRICT company
  FROM public.candidates parent WHERE parent.id = p_candidate_id;
  PERFORM pg_advisory_xact_lock(hashtextextended('candidate_family_members:' || p_candidate_id::text, 0));

  FOR member IN SELECT value FROM jsonb_array_elements(p_members)
  LOOP
    name := NULLIF(btrim(COALESCE(member->>'full_name', member->>'fullName')), '');
    relation := NULLIF(btrim(member->>'relationship'), '');
    IF name IS NULL OR relation IS NULL THEN
      RAISE EXCEPTION 'Complete el nombre y el parentesco de cada familiar.' USING ERRCODE = '22023';
    END IF;

    birth := NULLIF(member->>'birth_date', '');
    IF birth IS NOT NULL AND birth !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'Ingrese una fecha de nacimiento válida que no sea futura.' USING ERRCODE = '22007';
    END IF;

    member_id := NULLIF(member->>'id', '')::uuid;

    -- Older public clients send names and relationships without record IDs.
    IF member_id IS NULL AND NOT (member ? 'birth_date') THEN
      SELECT (array_agg(saved.id))[1] INTO member_id
      FROM public.candidate_family_members saved
      WHERE saved.candidate_id = p_candidate_id AND saved.company_id = company
        AND saved.full_name = name AND saved.relationship = relation
        AND NOT (saved.id = ANY(saved_ids))
      HAVING count(*) = 1;
    END IF;

    IF member_id IS NULL THEN
      legacy_age := CASE WHEN member->>'age' ~ '^[0-9]{1,3}$' THEN (member->>'age')::integer END;
      INSERT INTO public.candidate_family_members (
        candidate_id, company_id, full_name, relationship, birth_date, age, gender, observations
      ) VALUES (
        p_candidate_id, company, name, relation, birth::date, legacy_age, NULLIF(member->>'gender', ''),
        NULLIF(member->>'observations', '')
      )
      RETURNING id INTO member_id;
    ELSE
      IF member_id = ANY(saved_ids) THEN
        RAISE EXCEPTION 'La lista contiene un familiar repetido.' USING ERRCODE = '22023';
      END IF;
      UPDATE public.candidate_family_members saved
      SET full_name = name,
          relationship = relation,
          birth_date = CASE WHEN member ? 'birth_date' THEN birth::date ELSE saved.birth_date END,
          gender = CASE WHEN member ? 'gender' THEN NULLIF(member->>'gender', '') ELSE saved.gender END,
          observations = CASE
            WHEN member ? 'observations' THEN NULLIF(member->>'observations', '')
            ELSE saved.observations
          END
      WHERE saved.id = member_id AND saved.candidate_id = p_candidate_id AND saved.company_id = company;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'El familiar no pertenece al registro que se está actualizando.' USING ERRCODE = '22023';
      END IF;
    END IF;
    saved_ids := array_append(saved_ids, member_id);
  END LOOP;

  DELETE FROM public.candidate_family_members saved
  WHERE saved.candidate_id = p_candidate_id AND saved.company_id = company
    AND NOT (saved.id = ANY(saved_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.replace_candidate_family_members(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_candidate_family_members(uuid, jsonb) TO authenticated;


-- Build on the current RPC definitions so their existing permissions, token rules,
-- and hiring behavior are retained. Abort the migration if a source block has changed.
CREATE FUNCTION pg_temp.replace_expected(source text, pattern text, replacement text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF regexp_count(source, pattern) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one migration match for %', pattern;
  END IF;
  RETURN regexp_replace(source, pattern, replacement);
END;
$$;

DO $migration$
DECLARE
  definition text;
  new_function regprocedure;
BEGIN
  SELECT pg_get_functiondef(oid) INTO STRICT definition
  FROM pg_proc WHERE pronamespace = 'public'::regnamespace
    AND proname = 'submit_employee_registration' AND pronargs = 51;

  definition := pg_temp.replace_expected(definition, 'FUNCTION public\.submit_employee_registration\(', 'FUNCTION public.submit_employee_registration_with_family(');
  definition := pg_temp.replace_expected(definition, 'p_last_name text,', 'p_last_name text, p_family_members jsonb,');
  definition := pg_temp.replace_expected(definition, 'p_profession_id uuid DEFAULT NULL::uuid\)', 'p_profession_id uuid DEFAULT NULL::uuid, p_avatar_url text DEFAULT NULL, p_vaccines jsonb DEFAULT NULL)');
  definition := pg_temp.replace_expected(definition, 'WHERE token = p_token;', 'WHERE token = p_token FOR UPDATE;');
  definition := pg_temp.replace_expected(definition, '  UPDATE self_registration_tokens', $body$
  IF v_token_row.enabled_fields ? 'familyMembers' THEN
    PERFORM public.replace_employee_family_members(v_employee_id, p_family_members);
  END IF;

  IF p_avatar_url IS NOT NULL THEN
    UPDATE public.employees_v2 SET avatar_url = p_avatar_url WHERE id = v_employee_id;
  END IF;

  IF jsonb_typeof(p_vaccines) = 'array' THEN
    INSERT INTO public.employee_vaccinations (company_id, employee_id, vaccine_name, vaccine_type, dose_number, application_date, provider)
    SELECT v_token_row.company_id, v_employee_id, vaccine->>'vaccine_name',
      (vaccine->>'vaccine_type')::public.vaccine_type,
      COALESCE((vaccine->>'dose_number')::integer, 1),
      COALESCE(NULLIF(vaccine->>'application_date', '')::date, CURRENT_DATE),
      vaccine->>'provider'
    FROM jsonb_array_elements(p_vaccines) AS vaccine;
  END IF;

  UPDATE self_registration_tokens$body$);
  EXECUTE definition;

  SELECT oid::regprocedure INTO STRICT new_function FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace AND proname = 'submit_employee_registration_with_family';
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', new_function);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', new_function);

  SELECT pg_get_functiondef(oid) INTO STRICT definition
  FROM pg_proc WHERE pronamespace = 'public'::regnamespace
    AND proname = 'update_employee_from_registration' AND pronargs = 55;

  definition := pg_temp.replace_expected(definition, 'p_family_members jsonb DEFAULT ''\[\]''::jsonb', 'p_family_members jsonb DEFAULT NULL');
  definition := pg_temp.replace_expected(definition, 'WHERE token = p_token;', 'WHERE token = p_token FOR UPDATE;');
  definition := pg_temp.replace_expected(definition, '  -- Update family members if provided.*?  -- Update social security', $body$
  -- An empty array from the former client meant the family section was not provided.
  IF v_token_row.enabled_fields ? 'familyMembers'
    AND p_family_members NOT IN ('null'::jsonb, '[]'::jsonb) THEN
    IF btrim(p_document_number) IS DISTINCT FROM btrim(v_employee.document_number) THEN
      RAISE EXCEPTION 'El documento no corresponde al empleado.';
    END IF;
    PERFORM public.replace_employee_family_members(p_employee_id,
      CASE WHEN jsonb_typeof(p_family_members) = 'object' THEN p_family_members->'members' ELSE p_family_members END);
  END IF;

  -- Update social security$body$);
  EXECUTE definition;

  definition := pg_get_functiondef('public.get_employee_by_token_and_document(text,text)'::regprocedure);
  definition := pg_temp.replace_expected(definition, '''vaccinations'', v_vaccinations', $body$
    'vaccinations', v_vaccinations,
    'family_members', CASE WHEN v_token_row.enabled_fields ? 'familyMembers' THEN (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', member.id, 'full_name', member.full_name, 'relationship', member.relationship,
        'birth_date', member.birth_date, 'age', member.age
      ) ORDER BY member.created_at, member.id), '[]'::jsonb)
      FROM public.employee_family_members member
      WHERE member.company_id = v_employee.company_id AND member.employee_id = v_employee.id
        AND member.employment_cycle_id IS NOT DISTINCT FROM (
          SELECT cycle.id FROM public.employee_employment_cycles cycle
          WHERE cycle.employee_id = v_employee.id AND cycle.company_id = v_employee.company_id
            AND cycle.status = 'active'
          ORDER BY cycle.cycle_number DESC LIMIT 1
        )
    ) END$body$);
  EXECUTE definition;

  SELECT pg_get_functiondef(oid) INTO STRICT definition
  FROM pg_proc WHERE pronamespace = 'public'::regnamespace
    AND proname = 'submit_candidate_registration' AND pronargs = 40;

  definition := pg_temp.replace_expected(definition, 'p_family_members jsonb DEFAULT ''\[\]''::jsonb', 'p_family_members jsonb DEFAULT NULL');
  definition := pg_temp.replace_expected(definition, '  IF \(v_token_row.enabled_fields \? ''familyMembers''\).*?  UPDATE self_registration_tokens', $body$
  IF v_token_row.enabled_fields ? 'familyMembers' THEN
    PERFORM public.replace_candidate_family_members(v_candidate_id, p_family_members);
  END IF;

  UPDATE self_registration_tokens$body$);
  EXECUTE definition;

  definition := pg_get_functiondef('public.get_candidate_by_token_and_document(text,text,text)'::regprocedure);
  definition := pg_temp.replace_expected(definition, '''full_name'', member.full_name, ''age'', member.age,', $body$
      'id', member.id, 'full_name', member.full_name, 'age', member.age, 'birth_date', member.birth_date,$body$);
  definition := pg_temp.replace_expected(definition, 'WHERE member.candidate_id = candidate_row.id;', $body$
    WHERE member.candidate_id = candidate_row.id AND member.company_id = vacancy_company_id
      AND token_row.enabled_fields ? 'familyMembers';$body$);
  definition := pg_temp.replace_expected(definition, '''family_members'', ''\[\]''::jsonb\s+\);\s+END IF;', $body$
      'family_members', CASE WHEN token_row.enabled_fields ? 'familyMembers' THEN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'full_name', member.full_name, 'relationship', member.relationship,
          'birth_date', member.birth_date, 'age', member.age
        ) ORDER BY member.created_at, member.id), '[]'::jsonb)
        FROM public.employee_family_members member
        WHERE member.company_id = vacancy_company_id AND member.employee_id = employee_row.id
          AND member.employment_cycle_id IS NOT DISTINCT FROM (
            SELECT cycle.id FROM public.employee_employment_cycles cycle
            WHERE cycle.employee_id = employee_row.id AND cycle.company_id = vacancy_company_id
            ORDER BY cycle.cycle_number DESC LIMIT 1
          )
      ) END
    );
  END IF;$body$);
  EXECUTE definition;

  definition := pg_get_functiondef('public.submit_employee_rehire_registration(text,jsonb)'::regprocedure);
  definition := pg_temp.replace_expected(definition, '  IF token_row.enabled_fields \? ''familyMembers''.*?  UPDATE public.self_registration_tokens', $body$
  IF token_row.enabled_fields ? 'familyMembers' THEN
    PERFORM public.replace_candidate_family_members(candidate_id_value, p_profile->'family_members');
  END IF;

  UPDATE public.self_registration_tokens$body$);
  definition := pg_temp.replace_expected(definition, '  IF existing_candidate_id IS NOT NULL THEN', $body$
  IF existing_candidate_id IS NOT NULL THEN
    IF token_row.enabled_fields ? 'familyMembers' AND jsonb_typeof(p_profile->'family_members') <> 'null' THEN
      PERFORM public.replace_candidate_family_members(existing_candidate_id, p_profile->'family_members');
      UPDATE public.self_registration_tokens
      SET is_used = NOT COALESCE(token_row.is_reusable, false), used_at = now()
      WHERE id = token_row.id;
    END IF;$body$);
  EXECUTE definition;

  definition := pg_get_functiondef('public.start_employee_rehire(uuid,uuid)'::regprocedure);
  definition := pg_temp.replace_expected(definition, 'RETURNING id INTO new_candidate_id;', $body$
  RETURNING id INTO new_candidate_id;

  INSERT INTO public.candidate_family_members (
    candidate_id, company_id, full_name, relationship, birth_date, age, gender, observations
  )
  SELECT new_candidate_id, employee_row.company_id, member.full_name, member.relationship,
    member.birth_date, member.age, member.gender, member.observations
  FROM public.employee_family_members member
  WHERE member.company_id = employee_row.company_id AND member.employee_id = employee_row.id
    AND member.employment_cycle_id IS NOT DISTINCT FROM (
      SELECT cycle.id FROM public.employee_employment_cycles cycle
      WHERE cycle.company_id = employee_row.company_id AND cycle.employee_id = employee_row.id
      ORDER BY cycle.cycle_number DESC LIMIT 1
    );$body$);
  EXECUTE definition;

  definition := pg_get_functiondef('private.complete_candidate_hiring(uuid,jsonb)'::regprocedure);
  definition := pg_temp.replace_expected(definition, 'full_name, age, gender, observations, employment_cycle_id', 'full_name, age, birth_date, gender, observations, employment_cycle_id');
  definition := pg_temp.replace_expected(definition, 'member.full_name, member.age, member.gender, member.observations, cycle_id_value', 'member.full_name, member.age, member.birth_date, member.gender, member.observations, cycle_id_value');
  EXECUTE definition;

  definition := pg_get_viewdef('report_data.employee_family_members'::regclass);
  definition := pg_temp.replace_expected(definition, 'b\.age,', $body$
    COALESCE(
      extract(year FROM age((now() AT TIME ZONE 'America/Bogota')::date::timestamp, b.birth_date::timestamp))::integer,
      b.age
    ) AS age,$body$);
  EXECUTE 'CREATE OR REPLACE VIEW report_data.employee_family_members WITH (security_invoker=true, security_barrier=true) AS ' || definition;
END;
$migration$;
