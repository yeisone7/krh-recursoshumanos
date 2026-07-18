-- Normalize document number comparisons for public training access.
-- This avoids false negatives when the document is stored or entered with dots,
-- spaces or other formatting characters.

CREATE OR REPLACE FUNCTION public.normalize_document_number(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(regexp_replace(btrim(coalesce(p_value, '')), '\D', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.verify_employee_cedula(p_cedula text, p_company_id uuid)
RETURNS TABLE(employee_id uuid, employee_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, first_name || ' ' || COALESCE(last_name, '')
  FROM public.employees_v2
  WHERE public.normalize_document_number(document_number) = public.normalize_document_number(p_cedula)
    AND company_id = p_company_id
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_training_completion(
  p_token text,
  p_employee_id uuid DEFAULT NULL,
  p_operator_cedula text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token training_access_tokens%ROWTYPE;
  v_operator_cedula text := public.normalize_document_number(p_operator_cedula);
BEGIN
  IF nullif(btrim(p_token), '') IS NULL THEN
    RETURN false;
  END IF;

  SELECT *
  INTO v_token
  FROM public.training_access_tokens
  WHERE token = p_token
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.training_completions tc
    WHERE tc.company_id = v_token.company_id
      AND tc.course_id = v_token.course_id
      AND (
        (p_employee_id IS NOT NULL AND tc.employee_id = p_employee_id)
        OR (
          v_operator_cedula IS NOT NULL
          AND public.normalize_document_number(tc.operator_cedula) = v_operator_cedula
        )
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
  v_operator_cedula text := public.normalize_document_number(p_operator_cedula);
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
    v_operator_cedula,
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

REVOKE ALL ON FUNCTION public.normalize_document_number(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_employee_cedula(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_training_completion(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_training_access(text, uuid, text, text, text, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_document_number(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_employee_cedula(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_training_completion(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_training_access(text, uuid, text, text, text, integer, text) TO anon, authenticated;
