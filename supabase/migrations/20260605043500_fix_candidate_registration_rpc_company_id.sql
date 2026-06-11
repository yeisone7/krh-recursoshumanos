-- Ensure the current candidate self-registration RPC stores candidates.company_id.

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
  p_profession_id uuid DEFAULT NULL::uuid,
  p_family_members jsonb DEFAULT '[]'::jsonb
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
    RETURN json_build_object('success', false, 'error', 'Token no valido');
  END IF;

  IF v_token_row.is_used AND NOT COALESCE(v_token_row.is_reusable, false) THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at IS NOT NULL AND v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  IF v_token_row.target_type != 'candidate' OR v_token_row.vacancy_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Token no valido para registro de candidato');
  END IF;

  INSERT INTO candidates (
    company_id, vacancy_id, first_name, last_name, document_type, document_number,
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
    v_token_row.company_id, v_token_row.vacancy_id, p_first_name, p_last_name, p_document_type::document_type, p_document_number,
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

  IF jsonb_typeof(COALESCE(p_family_members, '[]'::jsonb)) = 'array' THEN
    INSERT INTO candidate_family_members (
      candidate_id, company_id, relationship, full_name, age, gender, observations
    )
    SELECT
      v_candidate_id,
      v_token_row.company_id,
      NULLIF(member->>'relationship', ''),
      NULLIF(COALESCE(member->>'full_name', member->>'fullName'), ''),
      CASE
        WHEN member->>'age' ~ '^[0-9]+$' THEN (member->>'age')::integer
        ELSE NULL
      END,
      NULLIF(member->>'gender', ''),
      NULLIF(member->>'observations', '')
    FROM jsonb_array_elements(COALESCE(p_family_members, '[]'::jsonb)) AS member
    WHERE NULLIF(member->>'relationship', '') IS NOT NULL
      AND NULLIF(COALESCE(member->>'full_name', member->>'fullName'), '') IS NOT NULL;
  END IF;

  UPDATE self_registration_tokens
  SET is_used = (NOT COALESCE(v_token_row.is_reusable, false)),
      used_at = now()
  WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'candidate_id', v_candidate_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_candidate_registration(
  text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, integer, text, text,
  numeric, text, text, text, text, text, text, text, text, text,
  boolean, boolean, text, text, boolean, boolean, uuid, uuid, uuid, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_candidate_registration(
  text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, integer, text, text,
  numeric, text, text, text, text, text, text, text, text, text,
  boolean, boolean, text, text, boolean, boolean, uuid, uuid, uuid, jsonb
) TO anon, authenticated;
