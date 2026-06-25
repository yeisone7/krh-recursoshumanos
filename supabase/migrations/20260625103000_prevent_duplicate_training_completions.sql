-- Prevent the same person from completing the same training course more than once.

WITH ranked_employee_duplicates AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY company_id, course_id, employee_id
      ORDER BY completed_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.training_completions
  WHERE employee_id IS NOT NULL
)
DELETE FROM public.training_completions tc
USING ranked_employee_duplicates dup
WHERE tc.id = dup.id
  AND dup.duplicate_rank > 1;

WITH ranked_document_duplicates AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY company_id, course_id, lower(btrim(operator_cedula))
      ORDER BY completed_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.training_completions
  WHERE nullif(btrim(operator_cedula), '') IS NOT NULL
)
DELETE FROM public.training_completions tc
USING ranked_document_duplicates dup
WHERE tc.id = dup.id
  AND dup.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS training_completions_unique_employee_course
ON public.training_completions (company_id, course_id, employee_id)
WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS training_completions_unique_document_course
ON public.training_completions (company_id, course_id, lower(btrim(operator_cedula)))
WHERE nullif(btrim(operator_cedula), '') IS NOT NULL;

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
  v_operator_cedula text := lower(nullif(btrim(p_operator_cedula), ''));
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
          AND lower(btrim(tc.operator_cedula)) = v_operator_cedula
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

  IF public.has_training_completion(
    p_token,
    p_employee_id,
    p_operator_cedula
  ) THEN
    RAISE EXCEPTION 'Esta persona ya completo esta capacitacion';
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
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Esta persona ya completo esta capacitacion';
END;
$$;

REVOKE ALL ON FUNCTION public.has_training_completion(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_training_access(text, uuid, text, text, text, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_training_completion(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_training_access(text, uuid, text, text, text, integer, text) TO anon, authenticated;
