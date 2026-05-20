-- Redefine public.submit_candidate_registration to respect is_reusable
CREATE OR REPLACE FUNCTION public.submit_candidate_registration(
    p_token text,
    p_first_name text,
    p_last_name text,
    p_document_type text DEFAULT 'CC'::text,
    p_document_number text DEFAULT ''::text,
    p_email text DEFAULT NULL::text,
    p_phone text DEFAULT NULL::text,
    p_mobile text DEFAULT NULL::text,
    p_address text DEFAULT NULL::text,
    p_city text DEFAULT NULL::text,
    p_department text DEFAULT NULL::text,
    p_birth_date text DEFAULT NULL::text,
    p_gender text DEFAULT NULL::text,
    p_gender_identity text DEFAULT NULL::text,
    p_gender_identity_other text DEFAULT NULL::text,
    p_education_level text DEFAULT NULL::text,
    p_profession text DEFAULT NULL::text,
    p_experience_years integer DEFAULT 0,
    p_current_company text DEFAULT NULL::text,
    p_current_position text DEFAULT NULL::text,
    p_salary_expectation numeric DEFAULT NULL::numeric,
    p_general_notes text DEFAULT NULL::text,
    p_neighborhood text DEFAULT NULL::text,
    p_document_issue_date text DEFAULT NULL::text,
    p_document_issue_city text DEFAULT NULL::text,
    p_marital_status text DEFAULT NULL::text,
    p_blood_type text DEFAULT NULL::text,
    p_emergency_contact_name text DEFAULT NULL::text,
    p_emergency_contact_phone text DEFAULT NULL::text,
    p_emergency_contact_relationship text DEFAULT NULL::text,
    p_is_first_job boolean DEFAULT NULL::boolean,
    p_is_head_of_household boolean DEFAULT NULL::boolean,
    p_disability_type text DEFAULT NULL::text,
    p_ethnic_group text DEFAULT NULL::text,
    p_is_conflict_victim boolean DEFAULT NULL::boolean,
    p_is_demobilized boolean DEFAULT NULL::boolean,
    p_identification_type_id uuid DEFAULT NULL::uuid,
    p_education_level_id uuid DEFAULT NULL::uuid,
    p_profession_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_token_row self_registration_tokens%ROWTYPE;
    v_candidate_id uuid;
BEGIN
    SELECT * INTO v_token_row FROM self_registration_tokens WHERE token = p_token;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Token no válido');
    END IF;

    -- ONLY block if token is used AND is NOT reusable
    IF v_token_row.is_used AND NOT v_token_row.is_reusable THEN
        RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
    END IF;

    IF v_token_row.expires_at < now() THEN
        RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
    END IF;

    IF v_token_row.target_type != 'candidate' OR v_token_row.vacancy_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Token no válido para registro de candidato');
    END IF;

    INSERT INTO candidates (
        vacancy_id, first_name, last_name, document_type, document_number,
        email, phone, mobile, address, neighborhood, city, department,
        birth_date, gender, gender_identity, gender_identity_other,
        document_issue_date, document_issue_city,
        marital_status, blood_type,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        education_level, profession, education_level_id, profession_id, experience_years,
        current_company, current_position, salary_expectation,
        general_notes, source, status,
        is_first_job, is_head_of_household, disability_type, ethnic_group,
        is_conflict_victim, is_demobilized, identification_type_id
    ) VALUES (
        v_token_row.vacancy_id, p_first_name, p_last_name, p_document_type::document_type, p_document_number,
        p_email, p_phone, p_mobile, p_address, p_neighborhood, p_city, p_department,
        CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
        p_gender, p_gender_identity, p_gender_identity_other,
        CASE WHEN p_document_issue_date IS NOT NULL AND p_document_issue_date != '' THEN p_document_issue_date::date ELSE NULL END,
        p_document_issue_city,
        p_marital_status, p_blood_type,
        p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship,
        p_education_level, p_profession, p_education_level_id, p_profession_id, p_experience_years,
        p_current_company, p_current_position, p_salary_expectation,
        p_general_notes, 'auto_registro', 'applied',
        COALESCE(p_is_first_job, false),
        COALESCE(p_is_head_of_household, false),
        p_disability_type,
        p_ethnic_group,
        COALESCE(p_is_conflict_victim, false),
        COALESCE(p_is_demobilized, false),
        p_identification_type_id
    ) RETURNING id INTO v_candidate_id;

    -- ONLY set is_used = true if NOT reusable
    UPDATE self_registration_tokens 
    SET is_used = (NOT v_token_row.is_reusable), 
        used_at = now() 
    WHERE id = v_token_row.id;

    RETURN json_build_object('success', true, 'candidate_id', v_candidate_id);
END;
$$;


-- Redefine public.submit_employee_registration to respect is_reusable
CREATE OR REPLACE FUNCTION public.submit_employee_registration(
    p_token text,
    p_first_name text,
    p_last_name text,
    p_middle_name text DEFAULT NULL::text,
    p_second_last_name text DEFAULT NULL::text,
    p_document_type text DEFAULT 'CC'::text,
    p_document_number text DEFAULT ''::text,
    p_birth_date text DEFAULT NULL::text,
    p_birth_city text DEFAULT NULL::text,
    p_birth_department text DEFAULT NULL::text,
    p_birth_country text DEFAULT NULL::text,
    p_gender text DEFAULT NULL::text,
    p_gender_identity text DEFAULT NULL::text,
    p_gender_identity_other text DEFAULT NULL::text,
    p_marital_status text DEFAULT NULL::text,
    p_blood_type text DEFAULT NULL::text,
    p_document_issue_date text DEFAULT NULL::text,
    p_document_issue_city text DEFAULT NULL::text,
    p_email text DEFAULT NULL::text,
    p_personal_email text DEFAULT NULL::text,
    p_mobile text DEFAULT NULL::text,
    p_phone text DEFAULT NULL::text,
    p_residence_address text DEFAULT NULL::text,
    p_residence_city text DEFAULT NULL::text,
    p_residence_department text DEFAULT NULL::text,
    p_residence_neighborhood text DEFAULT NULL::text,
    p_emergency_contact_name text DEFAULT NULL::text,
    p_emergency_contact_phone text DEFAULT NULL::text,
    p_emergency_contact_relationship text DEFAULT NULL::text,
    p_spouse_name text DEFAULT NULL::text,
    p_spouse_birth_date text DEFAULT NULL::text,
    p_children_count integer DEFAULT NULL::integer,
    p_eps text DEFAULT NULL::text,
    p_afp text DEFAULT NULL::text,
    p_arl text DEFAULT NULL::text,
    p_ccf text DEFAULT NULL::text,
    p_afc text DEFAULT NULL::text,
    p_ips text DEFAULT NULL::text,
    p_risk_level text DEFAULT NULL::text,
    p_bank_name text DEFAULT NULL::text,
    p_account_type text DEFAULT NULL::text,
    p_account_number text DEFAULT NULL::text,
    p_is_first_job boolean DEFAULT NULL::boolean,
    p_is_head_of_household boolean DEFAULT NULL::boolean,
    p_disability_type text DEFAULT NULL::text,
    p_ethnic_group text DEFAULT NULL::text,
    p_is_conflict_victim boolean DEFAULT NULL::boolean,
    p_is_demobilized boolean DEFAULT NULL::boolean,
    p_identification_type_id uuid DEFAULT NULL::uuid,
    p_education_level_id uuid DEFAULT NULL::uuid,
    p_profession_id uuid DEFAULT NULL::uuid
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
DECLARE
  v_token_row self_registration_tokens%ROWTYPE;
  v_employee_id uuid;
BEGIN
  SELECT * INTO v_token_row FROM self_registration_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  -- ONLY block if token is used AND is NOT reusable
  IF v_token_row.is_used AND NOT v_token_row.is_reusable THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  IF v_token_row.target_type != 'employee' THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido para registro de empleado');
  END IF;

  INSERT INTO employees_v2 (
    company_id, first_name, middle_name, last_name, second_last_name,
    document_type, document_number, birth_date, birth_city, birth_department, birth_country,
    gender, gender_identity, gender_identity_other, marital_status, blood_type,
    document_issue_date, document_issue_city,
    is_first_job, is_head_of_household, disability_type, ethnic_group, is_conflict_victim, is_demobilized,
    identification_type_id,
    education_level_id,
    profession_id
  ) VALUES (
    v_token_row.company_id,
    p_first_name, p_middle_name, p_last_name, p_second_last_name,
    p_document_type::document_type, p_document_number,
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
    p_birth_city, p_birth_department, p_birth_country,
    CASE WHEN p_gender IS NOT NULL AND p_gender != '' THEN p_gender::gender_type ELSE NULL END,
    p_gender_identity, p_gender_identity_other,
    CASE WHEN p_marital_status IS NOT NULL AND p_marital_status != '' THEN p_marital_status::marital_status_type ELSE NULL END,
    CASE WHEN p_blood_type IS NOT NULL AND p_blood_type != '' THEN p_blood_type::blood_type ELSE NULL END,
    CASE WHEN p_document_issue_date IS NOT NULL AND p_document_issue_date != '' THEN p_document_issue_date::date ELSE NULL END,
    p_document_issue_city,
    COALESCE(p_is_first_job, false),
    COALESCE(p_is_head_of_household, false),
    p_disability_type,
    p_ethnic_group,
    COALESCE(p_is_conflict_victim, false),
    COALESCE(p_is_demobilized, false),
    p_identification_type_id,
    p_education_level_id,
    p_profession_id
  ) RETURNING id INTO v_employee_id;

  IF COALESCE(p_email, p_personal_email, p_mobile, p_phone, p_residence_address, p_residence_city, p_residence_department, p_residence_neighborhood, p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship) IS NOT NULL THEN
    INSERT INTO employee_contact (
      employee_id, email, personal_email, mobile, phone,
      residence_address, residence_city, residence_department, residence_neighborhood,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      is_current
    ) VALUES (
      v_employee_id, p_email, p_personal_email, p_mobile, p_phone,
      p_residence_address, p_residence_city, p_residence_department, p_residence_neighborhood,
      p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship,
      true
    );
  END IF;

  IF COALESCE(p_spouse_name, p_spouse_birth_date) IS NOT NULL OR p_children_count IS NOT NULL THEN
    INSERT INTO employee_family (
      employee_id, spouse_name, spouse_birth_date, children_count, is_current
    ) VALUES (
      v_employee_id, p_spouse_name,
      CASE WHEN p_spouse_birth_date IS NOT NULL AND p_spouse_birth_date != '' THEN p_spouse_birth_date::date ELSE NULL END,
      COALESCE(p_children_count, 0),
      true
    );
  END IF;

  IF COALESCE(p_eps, p_afp, p_arl, p_ccf, p_afc, p_ips, p_risk_level) IS NOT NULL THEN
    INSERT INTO employee_social_security (
      employee_id, eps, afp, arl, ccf, afc, ips,
      risk_level, is_current
    ) VALUES (
      v_employee_id, p_eps, p_afp, p_arl, p_ccf, p_afc, p_ips,
      CASE WHEN p_risk_level IS NOT NULL AND p_risk_level != '' THEN p_risk_level::risk_level ELSE NULL END,
      true
    );
  END IF;

  IF COALESCE(p_bank_name, p_account_type, p_account_number) IS NOT NULL THEN
    INSERT INTO employee_bank_info (
      employee_id, bank_name,
      account_type,
      account_number, is_current
    ) VALUES (
      v_employee_id, p_bank_name,
      CASE WHEN p_account_type IS NOT NULL AND p_account_type != '' THEN p_account_type::account_type ELSE NULL END,
      p_account_number, true
    );
  END IF;

  -- ONLY set is_used = true if NOT reusable
  UPDATE self_registration_tokens 
  SET is_used = (NOT v_token_row.is_reusable), 
      used_at = now() 
  WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'employee_id', v_employee_id);
END;
$$;


-- Redefine public.get_employee_by_token_and_document to respect is_reusable
CREATE OR REPLACE FUNCTION public.get_employee_by_token_and_document(
    p_token text,
    p_document_number text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_token_row self_registration_tokens%ROWTYPE;
    v_employee employees_v2%ROWTYPE;
    v_contact employee_contact%ROWTYPE;
    v_family employee_family%ROWTYPE;
    v_social employee_social_security%ROWTYPE;
    v_bank employee_bank_info%ROWTYPE;
    v_vaccinations json;
BEGIN
    SELECT * INTO v_token_row FROM self_registration_tokens WHERE token = p_token;
    
    -- ONLY block if token is used AND is NOT reusable
    IF NOT FOUND OR (v_token_row.is_used AND NOT v_token_row.is_reusable) OR v_token_row.expires_at < now() OR v_token_row.target_type != 'employee' THEN
        RETURN json_build_object('success', false, 'error', 'Token inválido o expirado');
    END IF;

    SELECT * INTO v_employee FROM employees_v2 
    WHERE document_number = p_document_number AND company_id = v_token_row.company_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', true, 'found', false);
    END IF;

    SELECT * INTO v_contact FROM employee_contact WHERE employee_id = v_employee.id AND is_current = true LIMIT 1;
    SELECT * INTO v_family FROM employee_family WHERE employee_id = v_employee.id AND is_current = true LIMIT 1;
    SELECT * INTO v_social FROM employee_social_security WHERE employee_id = v_employee.id AND is_current = true LIMIT 1;
    SELECT * INTO v_bank FROM employee_bank_info WHERE employee_id = v_employee.id AND is_current = true LIMIT 1;
    
    SELECT json_agg(row_to_json(v)) INTO v_vaccinations FROM employee_vaccinations v WHERE employee_id = v_employee.id;

    RETURN json_build_object(
        'success', true,
        'found', true,
        'employee', row_to_json(v_employee),
        'contact', row_to_json(v_contact),
        'family', row_to_json(v_family),
        'social', row_to_json(v_social),
        'bank', row_to_json(v_bank),
        'vaccinations', v_vaccinations
    );
END;
$$;


-- Redefine public.update_employee_from_registration to respect is_reusable
CREATE OR REPLACE FUNCTION public.update_employee_from_registration(
    p_token text,
    p_employee_id uuid,
    p_first_name text,
    p_last_name text,
    p_middle_name text DEFAULT NULL,
    p_second_last_name text DEFAULT NULL,
    p_document_type text DEFAULT 'CC',
    p_document_number text DEFAULT '',
    p_birth_date text DEFAULT NULL,
    p_birth_city text DEFAULT NULL,
    p_birth_department text DEFAULT NULL,
    p_birth_country text DEFAULT NULL,
    p_gender text DEFAULT NULL,
    p_gender_identity text DEFAULT NULL,
    p_gender_identity_other text DEFAULT NULL,
    p_marital_status text DEFAULT NULL,
    p_blood_type text DEFAULT NULL,
    p_document_issue_date text DEFAULT NULL,
    p_document_issue_city text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_personal_email text DEFAULT NULL,
    p_mobile text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_residence_address text DEFAULT NULL,
    p_residence_city text DEFAULT NULL,
    p_residence_department text DEFAULT NULL,
    p_residence_neighborhood text DEFAULT NULL,
    p_emergency_contact_name text DEFAULT NULL,
    p_emergency_contact_phone text DEFAULT NULL,
    p_emergency_contact_relationship text DEFAULT NULL,
    p_spouse_name text DEFAULT NULL,
    p_spouse_birth_date text DEFAULT NULL,
    p_children_count integer DEFAULT NULL,
    p_eps text DEFAULT NULL,
    p_afp text DEFAULT NULL,
    p_arl text DEFAULT NULL,
    p_ccf text DEFAULT NULL,
    p_afc text DEFAULT NULL,
    p_ips text DEFAULT NULL,
    p_risk_level text DEFAULT NULL,
    p_bank_name text DEFAULT NULL,
    p_account_type text DEFAULT NULL,
    p_account_number text DEFAULT NULL,
    p_is_first_job boolean DEFAULT NULL,
    p_is_head_of_household boolean DEFAULT NULL,
    p_disability_type text DEFAULT NULL,
    p_ethnic_group text DEFAULT NULL,
    p_is_conflict_victim boolean DEFAULT NULL,
    p_is_demobilized boolean DEFAULT NULL,
    p_identification_type_id uuid DEFAULT NULL,
    p_education_level_id uuid DEFAULT NULL,
    p_profession_id uuid DEFAULT NULL,
    p_avatar_url text DEFAULT NULL,
    p_vaccines jsonb DEFAULT '[]'::jsonb,
    p_family_members jsonb DEFAULT '[]'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token_row self_registration_tokens%ROWTYPE;
  v_employee employees_v2%ROWTYPE;
  v_vaccine jsonb;
  v_member jsonb;
BEGIN
  SELECT * INTO v_token_row FROM self_registration_tokens WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  -- ONLY block if token is used AND is NOT reusable
  IF v_token_row.is_used AND NOT v_token_row.is_reusable THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  IF v_token_row.target_type != 'employee' THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido para registro de empleado');
  END IF;

  SELECT * INTO v_employee FROM employees_v2 WHERE id = p_employee_id AND company_id = v_token_row.company_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Empleado no encontrado en esta empresa');
  END IF;

  UPDATE employees_v2 SET
    first_name = p_first_name,
    middle_name = p_middle_name,
    last_name = p_last_name,
    second_last_name = p_second_last_name,
    document_type = p_document_type::document_type,
    document_number = p_document_number,
    birth_date = CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE birth_date END,
    birth_city = p_birth_city,
    birth_department = p_birth_department,
    birth_country = p_birth_country,
    gender = CASE WHEN p_gender IS NOT NULL AND p_gender != '' THEN p_gender::gender_type ELSE gender END,
    gender_identity = p_gender_identity,
    gender_identity_other = p_gender_identity_other,
    marital_status = CASE WHEN p_marital_status IS NOT NULL AND p_marital_status != '' THEN p_marital_status::marital_status_type ELSE marital_status END,
    blood_type = CASE WHEN p_blood_type IS NOT NULL AND p_blood_type != '' THEN p_blood_type::blood_type ELSE blood_type END,
    document_issue_date = CASE WHEN p_document_issue_date IS NOT NULL AND p_document_issue_date != '' THEN p_document_issue_date::date ELSE document_issue_date END,
    document_issue_city = p_document_issue_city,
    is_first_job = COALESCE(p_is_first_job, is_first_job),
    is_head_of_household = COALESCE(p_is_head_of_household, is_head_of_household),
    disability_type = p_disability_type,
    ethnic_group = p_ethnic_group,
    is_conflict_victim = COALESCE(p_is_conflict_victim, is_conflict_victim),
    is_demobilized = COALESCE(p_is_demobilized, is_demobilized),
    identification_type_id = p_identification_type_id,
    education_level_id = p_education_level_id,
    profession_id = p_profession_id,
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = now()
  WHERE id = p_employee_id;

  -- Update contact info
  UPDATE employee_contact SET
    email = p_email,
    personal_email = p_personal_email,
    mobile = p_mobile,
    phone = p_phone,
    residence_address = p_residence_address,
    residence_city = p_residence_city,
    residence_department = p_residence_department,
    residence_neighborhood = p_residence_neighborhood,
    emergency_contact_name = p_emergency_contact_name,
    emergency_contact_phone = p_emergency_contact_phone,
    emergency_contact_relationship = p_emergency_contact_relationship,
    updated_at = now()
  WHERE employee_id = p_employee_id AND is_current = true;

  IF NOT FOUND AND COALESCE(p_email, p_personal_email, p_mobile, p_phone, p_residence_address) IS NOT NULL THEN
    INSERT INTO employee_contact (
      company_id, employee_id, email, personal_email, mobile, phone,
      residence_address, residence_city, residence_department, residence_neighborhood,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      is_current
    ) VALUES (
      v_token_row.company_id, p_employee_id, p_email, p_personal_email, p_mobile, p_phone,
      p_residence_address, p_residence_city, p_residence_department, p_residence_neighborhood,
      p_emergency_contact_name, p_emergency_contact_phone, p_emergency_contact_relationship,
      true
    );
  END IF;

  -- Update family
  UPDATE employee_family SET
    spouse_name = p_spouse_name,
    spouse_birth_date = CASE WHEN p_spouse_birth_date IS NOT NULL AND p_spouse_birth_date != '' THEN p_spouse_birth_date::date ELSE spouse_birth_date END,
    children_count = COALESCE(p_children_count, children_count),
    updated_at = now()
  WHERE employee_id = p_employee_id AND is_current = true;
  
  IF NOT FOUND AND (p_spouse_name IS NOT NULL OR p_children_count IS NOT NULL) THEN
    INSERT INTO employee_family (
      company_id, employee_id, spouse_name, spouse_birth_date, children_count, is_current
    ) VALUES (
      v_token_row.company_id, p_employee_id, p_spouse_name,
      CASE WHEN p_spouse_birth_date IS NOT NULL AND p_spouse_birth_date != '' THEN p_spouse_birth_date::date ELSE NULL END,
      COALESCE(p_children_count, 0), true
    );
  END IF;

  -- Update family members if provided
  IF jsonb_array_length(p_family_members) > 0 THEN
    DELETE FROM employee_family_members WHERE employee_id = p_employee_id;
    FOR v_member IN SELECT * FROM jsonb_array_elements(p_family_members)
    LOOP
      INSERT INTO employee_family_members (company_id, employee_id, full_name, relationship, observations)
      VALUES (
        v_token_row.company_id, p_employee_id,
        v_member->>'full_name', v_member->>'relationship',
        CASE WHEN (v_member->>'document_number') IS NOT NULL AND (v_member->>'document_number') != '' 
             THEN 'Documento: ' || COALESCE(v_member->>'document_type', 'CC') || ' ' || (v_member->>'document_number') 
             ELSE NULL 
        END
      );
    END LOOP;
  END IF;

  -- Update social security
  UPDATE employee_social_security SET
    eps = p_eps,
    afp = p_afp,
    arl = p_arl,
    ccf = p_ccf,
    afc = p_afc,
    ips = p_ips,
    risk_level = CASE WHEN p_risk_level IS NOT NULL AND p_risk_level != '' THEN p_risk_level::risk_level ELSE risk_level END,
    updated_at = now()
  WHERE employee_id = p_employee_id AND is_current = true;

  IF NOT FOUND AND COALESCE(p_eps, p_afp, p_arl, p_ccf) IS NOT NULL THEN
    INSERT INTO employee_social_security (
      company_id, employee_id, eps, afp, arl, ccf, afc, ips,
      risk_level, is_current
    ) VALUES (
      v_token_row.company_id, p_employee_id, p_eps, p_afp, p_arl, p_ccf, p_afc, p_ips,
      CASE WHEN p_risk_level IS NOT NULL AND p_risk_level != '' THEN p_risk_level::risk_level ELSE NULL END,
      true
    );
  END IF;

  -- Update vaccines if provided
  IF jsonb_array_length(p_vaccines) > 0 THEN
    DELETE FROM employee_vaccinations WHERE employee_id = p_employee_id;
    FOR v_vaccine IN SELECT * FROM jsonb_array_elements(p_vaccines)
    LOOP
      INSERT INTO employee_vaccinations (company_id, employee_id, vaccine_name, vaccine_type, dose_number, application_date, provider)
      VALUES (
        v_token_row.company_id, p_employee_id,
        v_vaccine->>'vaccine_name', (v_vaccine->>'vaccine_type')::vaccine_type,
        COALESCE((v_vaccine->>'dose_number')::integer, 1),
        CASE WHEN (v_vaccine->>'application_date') IS NOT NULL AND (v_vaccine->>'application_date') != '' THEN (v_vaccine->>'application_date')::date ELSE now() END,
        v_vaccine->>'provider'
      );
    END LOOP;
  END IF;

  -- Update bank
  UPDATE employee_bank_info SET
    bank_name = p_bank_name,
    account_type = CASE WHEN p_account_type IS NOT NULL AND p_account_type != '' THEN p_account_type::account_type ELSE account_type END,
    account_number = p_account_number,
    updated_at = now()
  WHERE employee_id = p_employee_id AND is_current = true;

  IF NOT FOUND AND p_bank_name IS NOT NULL THEN
    INSERT INTO employee_bank_info (
      company_id, employee_id, bank_name, account_type, account_number, is_current
    ) VALUES (
      v_token_row.company_id, p_employee_id, p_bank_name,
      CASE WHEN p_account_type IS NOT NULL AND p_account_type != '' THEN p_account_type::account_type ELSE NULL END,
      p_account_number, true
    );
  END IF;

  -- ONLY set is_used = true if NOT reusable
  UPDATE self_registration_tokens 
  SET is_used = (NOT v_token_row.is_reusable), 
      used_at = now() 
  WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'employee_id', p_employee_id);
END;
$$;


-- Correct the SELECT RLS policy for self_registration_tokens to allow both anon and authenticated users
DROP POLICY IF EXISTS "Public can read tokens for validation" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Anyone can read tokens for validation" ON public.self_registration_tokens;

CREATE POLICY "Anyone can read tokens for validation"
  ON public.self_registration_tokens FOR SELECT
  TO anon, authenticated
  USING (true);
