-- Harden public token flows while preserving anonymous registration/training links.

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

  IF v_token.is_used AND NOT coalesce(v_token.is_reusable, false) THEN
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
      'enabled_fields', coalesce(to_jsonb(v_token.enabled_fields), '[]'::jsonb),
      'company_id', v_token.company_id,
      'is_used', v_token.is_used,
      'is_reusable', v_token.is_reusable,
      'expires_at', v_token.expires_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_training_access_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token training_access_tokens%ROWTYPE;
  v_course training_courses%ROWTYPE;
BEGIN
  SELECT *
  INTO v_token
  FROM public.training_access_tokens
  WHERE token = p_token
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;

  IF v_token.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  IF v_token.usage_type = 'unico' AND v_token.uses_count >= coalesce(v_token.max_uses, 1) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'used');
  END IF;

  SELECT *
  INTO v_course
  FROM public.training_courses
  WHERE id = v_token.course_id
    AND company_id = v_token.company_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'course_unavailable');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'token', jsonb_build_object(
      'id', v_token.id,
      'company_id', v_token.company_id,
      'course_id', v_token.course_id,
      'token', v_token.token,
      'access_type', v_token.access_type,
      'usage_type', v_token.usage_type,
      'max_uses', v_token.max_uses,
      'uses_count', v_token.uses_count,
      'expires_at', v_token.expires_at,
      'is_active', v_token.is_active,
      'requires_evaluation', v_token.requires_evaluation,
      'course', to_jsonb(v_course)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_training_access(
  p_token text,
  p_employee_id uuid,
  p_operator_name text,
  p_operator_cedula text,
  p_signature_data text,
  p_quiz_score integer,
  p_user_agent text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token training_access_tokens%ROWTYPE;
  v_completion_id uuid;
BEGIN
  SELECT *
  INTO v_token
  FROM public.training_access_tokens
  WHERE token = p_token
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El enlace de acceso no es valido o fue desactivado';
  END IF;

  IF v_token.expires_at < now() THEN
    RAISE EXCEPTION 'El enlace de acceso ha expirado';
  END IF;

  IF v_token.usage_type = 'unico' AND v_token.uses_count >= coalesce(v_token.max_uses, 1) THEN
    RAISE EXCEPTION 'El enlace ya fue utilizado';
  END IF;

  IF nullif(btrim(p_operator_name), '') IS NULL THEN
    RAISE EXCEPTION 'El nombre del operador es obligatorio';
  END IF;

  IF nullif(btrim(p_signature_data), '') IS NULL THEN
    RAISE EXCEPTION 'La firma es obligatoria';
  END IF;

  IF p_employee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.employees_v2 e
    WHERE e.id = p_employee_id
      AND e.company_id = v_token.company_id
  ) THEN
    RAISE EXCEPTION 'El empleado no pertenece a la empresa del enlace';
  END IF;

  INSERT INTO public.training_completions (
    company_id,
    course_id,
    token_id,
    employee_id,
    operator_name,
    operator_cedula,
    signature_data,
    quiz_score,
    ip_address,
    user_agent
  )
  VALUES (
    v_token.company_id,
    v_token.course_id,
    v_token.id,
    p_employee_id,
    btrim(p_operator_name),
    nullif(btrim(p_operator_cedula), ''),
    p_signature_data,
    p_quiz_score,
    null,
    p_user_agent
  )
  RETURNING id INTO v_completion_id;

  UPDATE public.training_access_tokens
  SET uses_count = uses_count + 1
  WHERE id = v_token.id;

  RETURN jsonb_build_object('success', true, 'completion_id', v_completion_id);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_registration_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_training_access_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_training_access(text, uuid, text, text, text, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.validate_registration_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_training_access_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_training_access(text, uuid, text, text, text, integer, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read tokens for validation" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Anyone can read tokens for validation" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Anon can update tokens to mark used" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Public can update tokens to mark used" ON public.self_registration_tokens;
DROP POLICY IF EXISTS "Anon can insert candidates via token" ON public.candidates;

DROP POLICY IF EXISTS "Anon can validate access tokens" ON public.training_access_tokens;
DROP POLICY IF EXISTS "Anon can increment token usage" ON public.training_access_tokens;
DROP POLICY IF EXISTS "Anon can insert completions" ON public.training_completions;
DROP POLICY IF EXISTS "Anon can insert completions via token" ON public.training_completions;
DROP POLICY IF EXISTS "Public can insert completions with valid token" ON public.training_completions;
