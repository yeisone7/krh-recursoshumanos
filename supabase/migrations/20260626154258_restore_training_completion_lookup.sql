-- Restore the public lookup used by training access links before entering content.
-- This keeps the existing completion flow intact and only answers whether a
-- person already has evidence for the course tied to the token.
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

REVOKE ALL ON FUNCTION public.has_training_completion(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_training_completion(text, uuid, text) TO anon, authenticated;
