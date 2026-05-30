-- Keep public employee/candidate registration links aligned with their reusable/no-expiration flags.

CREATE OR REPLACE FUNCTION public.validate_registration_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token self_registration_tokens%ROWTYPE;
BEGIN
  SELECT *
  INTO v_token
  FROM public.self_registration_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;

  IF v_token.is_used AND NOT COALESCE(v_token.is_reusable, false) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'used');
  END IF;

  IF v_token.expires_at IS NOT NULL AND v_token.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'token', jsonb_build_object(
      'id', v_token.id,
      'token', v_token.token,
      'target_type', v_token.target_type,
      'vacancy_id', v_token.vacancy_id,
      'enabled_fields', COALESCE(to_jsonb(v_token.enabled_fields), '[]'::jsonb),
      'company_id', v_token.company_id,
      'is_used', v_token.is_used,
      'is_reusable', COALESCE(v_token.is_reusable, false),
      'expires_at', v_token.expires_at
    )
  );
END;
$$;

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
  SELECT *
  INTO v_token_row
  FROM self_registration_tokens
  WHERE token = p_token;

  IF NOT FOUND
    OR (v_token_row.is_used AND NOT COALESCE(v_token_row.is_reusable, false))
    OR (v_token_row.expires_at IS NOT NULL AND v_token_row.expires_at < now())
    OR v_token_row.target_type != 'employee'
  THEN
    RETURN json_build_object('success', false, 'error', 'Token invalido o expirado');
  END IF;

  SELECT *
  INTO v_employee
  FROM employees_v2
  WHERE document_number = btrim(p_document_number)
    AND company_id = v_token_row.company_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', true, 'found', false);
  END IF;

  SELECT * INTO v_contact FROM employee_contact WHERE employee_id = v_employee.id AND is_current = true LIMIT 1;
  SELECT * INTO v_family FROM employee_family WHERE employee_id = v_employee.id AND is_current = true LIMIT 1;
  SELECT * INTO v_social FROM employee_social_security WHERE employee_id = v_employee.id AND is_current = true LIMIT 1;
  SELECT * INTO v_bank FROM employee_bank_info WHERE employee_id = v_employee.id AND is_current = true LIMIT 1;

  SELECT json_agg(row_to_json(v))
  INTO v_vaccinations
  FROM employee_vaccinations v
  WHERE employee_id = v_employee.id;

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

UPDATE public.self_registration_tokens
SET is_used = false
WHERE COALESCE(is_reusable, false) = true
  AND is_used = true;

REVOKE ALL ON FUNCTION public.validate_registration_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_by_token_and_document(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.validate_registration_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_by_token_and_document(text, text) TO anon, authenticated;
