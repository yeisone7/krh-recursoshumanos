-- Restore complete evidence visibility and enforce one completion per person/course.
-- Duplicate rows are preserved verbatim in a private backup table before deletion.

SET lock_timeout = '10s';
SET statement_timeout = '60s';

LOCK TABLE public.training_completions IN SHARE ROW EXCLUSIVE MODE;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE private.training_completions_duplicate_backup_20260721
  (
    LIKE public.training_completions
      INCLUDING DEFAULTS
      INCLUDING GENERATED
      INCLUDING IDENTITY
  );

ALTER TABLE private.training_completions_duplicate_backup_20260721
  ADD PRIMARY KEY (id);

ALTER TABLE private.training_completions_duplicate_backup_20260721
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.training_completions_duplicate_backup_20260721
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE private.training_completions_duplicate_backup_20260721 IS
  'Exact backup of duplicate training completion rows removed on 2026-07-21.';

WITH employee_ranked AS (
  SELECT
    tc.id,
    row_number() OVER (
      PARTITION BY tc.company_id, tc.course_id, tc.employee_id
      ORDER BY tc.completed_at DESC, tc.id DESC
    ) AS duplicate_rank
  FROM public.training_completions tc
  WHERE tc.employee_id IS NOT NULL
),
document_ranked AS (
  SELECT
    tc.id,
    row_number() OVER (
      PARTITION BY
        tc.company_id,
        tc.course_id,
        public.normalize_document_number(tc.operator_cedula)
      ORDER BY tc.completed_at DESC, tc.id DESC
    ) AS duplicate_rank
  FROM public.training_completions tc
  WHERE public.normalize_document_number(tc.operator_cedula) IS NOT NULL
),
duplicate_candidates AS (
  SELECT id FROM employee_ranked WHERE duplicate_rank > 1
  UNION
  SELECT id FROM document_ranked WHERE duplicate_rank > 1
)
INSERT INTO private.training_completions_duplicate_backup_20260721
SELECT tc.*
FROM public.training_completions tc
JOIN duplicate_candidates duplicate ON duplicate.id = tc.id;

DO $$
DECLARE
  backup_count bigint;
  expected_count bigint;
BEGIN
  WITH employee_ranked AS (
    SELECT
      tc.id,
      row_number() OVER (
        PARTITION BY tc.company_id, tc.course_id, tc.employee_id
        ORDER BY tc.completed_at DESC, tc.id DESC
      ) AS duplicate_rank
    FROM public.training_completions tc
    WHERE tc.employee_id IS NOT NULL
  ),
  document_ranked AS (
    SELECT
      tc.id,
      row_number() OVER (
        PARTITION BY
          tc.company_id,
          tc.course_id,
          public.normalize_document_number(tc.operator_cedula)
        ORDER BY tc.completed_at DESC, tc.id DESC
      ) AS duplicate_rank
    FROM public.training_completions tc
    WHERE public.normalize_document_number(tc.operator_cedula) IS NOT NULL
  ),
  duplicate_candidates AS (
    SELECT id FROM employee_ranked WHERE duplicate_rank > 1
    UNION
    SELECT id FROM document_ranked WHERE duplicate_rank > 1
  )
  SELECT count(*) INTO expected_count FROM duplicate_candidates;

  SELECT count(*) INTO backup_count
  FROM private.training_completions_duplicate_backup_20260721;

  IF backup_count <> expected_count THEN
    RAISE EXCEPTION
      'Training completion backup mismatch: expected %, backed up %',
      expected_count,
      backup_count;
  END IF;
END;
$$;

DELETE FROM public.training_completions tc
USING private.training_completions_duplicate_backup_20260721 backup
WHERE tc.id = backup.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.training_completions tc
    WHERE tc.employee_id IS NOT NULL
    GROUP BY tc.company_id, tc.course_id, tc.employee_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Employee/course training completion duplicates remain after cleanup';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.training_completions tc
    WHERE public.normalize_document_number(tc.operator_cedula) IS NOT NULL
    GROUP BY
      tc.company_id,
      tc.course_id,
      public.normalize_document_number(tc.operator_cedula)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Document/course training completion duplicates remain after cleanup';
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.training_completions_unique_employee_course;
DROP INDEX IF EXISTS public.training_completions_unique_document_course;

ALTER FUNCTION public.normalize_document_number(text)
  SET search_path = '';

CREATE UNIQUE INDEX training_completions_unique_employee_course
  ON public.training_completions (company_id, course_id, employee_id)
  WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX training_completions_unique_document_course
  ON public.training_completions (
    company_id,
    course_id,
    public.normalize_document_number(operator_cedula)
  )
  WHERE public.normalize_document_number(operator_cedula) IS NOT NULL;

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
SET search_path TO ''
AS $$
DECLARE
  v_token public.training_access_tokens%ROWTYPE;
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

  IF public.has_training_completion(
    p_token,
    p_employee_id,
    v_operator_cedula
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
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Esta persona ya completo esta capacitacion';
END;
$$;

REVOKE ALL ON FUNCTION public.complete_training_access(text, uuid, text, text, text, integer, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_training_access(text, uuid, text, text, text, integer, text)
  TO anon, authenticated;

ANALYZE public.training_completions;

RESET lock_timeout;
RESET statement_timeout;
