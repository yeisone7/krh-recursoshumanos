-- Resume matching active applications without losing selection progress.
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
  existing_candidate_row public.candidates%ROWTYPE;
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

  -- Use the same identity and lock as the duplicate-candidate trigger.
  -- Auto-registration may have left an active application without a rehire link.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    employee_row.company_id::text || ':' || p_vacancy_id::text || ':' || employee_row.document_type::text || ':' || lower(btrim(employee_row.document_number)),
    0
  ));

  SELECT * INTO existing_candidate_row
  FROM public.candidates
  WHERE vacancy_id = p_vacancy_id
    AND company_id = employee_row.company_id
    AND document_type = employee_row.document_type
    AND lower(btrim(document_number)) = lower(btrim(employee_row.document_number))
    AND status NOT IN ('hired', 'not_selected', 'withdrawn')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF existing_candidate_row.employee_id IS NOT NULL
      OR (existing_candidate_row.rehire_employee_id IS NOT NULL
          AND existing_candidate_row.rehire_employee_id <> employee_row.id) THEN
      RAISE EXCEPTION 'La postulación activa ya está vinculada a otro proceso laboral. Revise su vínculo antes de iniciar el reingreso.';
    END IF;

    IF existing_candidate_row.rehire_employee_id IS NULL THEN
      UPDATE public.candidates
      SET rehire_employee_id = employee_row.id, source = 'reingreso'
      WHERE id = existing_candidate_row.id;

      INSERT INTO public.audit_logs (
        user_id, user_email, company_id, action, entity_type, entity_id,
        entity_name, old_values, new_values
      ) VALUES (
        (SELECT auth.uid()), (SELECT auth.jwt() ->> 'email'), employee_row.company_id,
        'link_existing_employee_rehire', 'candidate', existing_candidate_row.id,
        concat_ws(' ', employee_row.first_name, employee_row.last_name),
        jsonb_build_object('rehire_employee_id', NULL, 'source', existing_candidate_row.source),
        jsonb_build_object('rehire_employee_id', employee_row.id, 'source', 'reingreso', 'vacancy_id', p_vacancy_id)
      );
    END IF;

    RETURN jsonb_build_object(
      'candidate_id', existing_candidate_row.id,
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

REVOKE ALL ON FUNCTION public.start_employee_rehire(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_employee_rehire(uuid, uuid) TO authenticated;

