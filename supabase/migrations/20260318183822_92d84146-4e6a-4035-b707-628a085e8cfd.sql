CREATE OR REPLACE FUNCTION public.submit_employee_registration(
  p_token text,
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
  p_is_demobilized boolean DEFAULT NULL
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

  IF v_token_row.is_used THEN
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
    is_first_job, is_head_of_household, disability_type, ethnic_group, is_conflict_victim, is_demobilized
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
    COALESCE(p_is_demobilized, false)
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

  UPDATE self_registration_tokens SET is_used = true, used_at = now() WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'employee_id', v_employee_id);
END;
$$;