BEGIN;

ALTER TABLE public.disciplinary_processes
  ADD COLUMN IF NOT EXISTS report_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_basis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS proof_transfer text,
  ADD COLUMN IF NOT EXISTS citation_place text,
  ADD COLUMN IF NOT EXISTS hearing_method text,
  ADD COLUMN IF NOT EXISTS hearing_location text,
  ADD COLUMN IF NOT EXISTS hearing_platform text,
  ADD COLUMN IF NOT EXISTS hearing_link text,
  ADD COLUMN IF NOT EXISTS defense_deadline_days integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS citation_sender_name text,
  ADD COLUMN IF NOT EXISTS citation_sender_role text,
  ADD COLUMN IF NOT EXISTS hearing_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.disciplinary_processes
  DROP CONSTRAINT IF EXISTS disciplinary_processes_report_facts_array,
  DROP CONSTRAINT IF EXISTS disciplinary_processes_legal_basis_array,
  DROP CONSTRAINT IF EXISTS disciplinary_processes_hearing_questions_array,
  DROP CONSTRAINT IF EXISTS disciplinary_processes_defense_deadline_days_check;

ALTER TABLE public.disciplinary_processes
  ADD CONSTRAINT disciplinary_processes_report_facts_array
    CHECK (jsonb_typeof(report_facts) = 'array'),
  ADD CONSTRAINT disciplinary_processes_legal_basis_array
    CHECK (jsonb_typeof(legal_basis) = 'array'),
  ADD CONSTRAINT disciplinary_processes_hearing_questions_array
    CHECK (jsonb_typeof(hearing_questions) = 'array'),
  ADD CONSTRAINT disciplinary_processes_defense_deadline_days_check
    CHECK (defense_deadline_days BETWEEN 1 AND 30);

UPDATE public.disciplinary_processes
SET report_facts = jsonb_build_array(
  jsonb_build_object('title', 'Hecho reportado', 'description', facts_description)
)
WHERE report_facts = '[]'::jsonb
  AND nullif(btrim(facts_description), '') IS NOT NULL;

ALTER TABLE public.disciplinary_defenses
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rights_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS witness_name text,
  ADD COLUMN IF NOT EXISTS witness_document text,
  ADD COLUMN IF NOT EXISTS employee_email text,
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS hearing_end_at timestamptz;

ALTER TABLE public.disciplinary_defenses
  DROP CONSTRAINT IF EXISTS disciplinary_defenses_answers_array;
ALTER TABLE public.disciplinary_defenses
  ADD CONSTRAINT disciplinary_defenses_answers_array
    CHECK (jsonb_typeof(answers) = 'array');

ALTER TABLE public.disciplinary_evidence
  ADD COLUMN IF NOT EXISTS storage_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'disciplinary-evidence',
  'disciplinary-evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Company members can read disciplinary evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Disciplinary managers can upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Disciplinary managers can delete evidence files" ON storage.objects;

CREATE POLICY "Company members can read disciplinary evidence files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'disciplinary-evidence'
    AND (storage.foldername(name))[1] = 'disciplinary'
    AND (
      public.is_super_admin()
      OR public.is_company_member(((storage.foldername(name))[2])::uuid)
    )
  );

CREATE POLICY "Disciplinary managers can upload evidence files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'disciplinary-evidence'
    AND (storage.foldername(name))[1] = 'disciplinary'
    AND (
      public.is_super_admin()
      OR (
        public.is_company_member(((storage.foldername(name))[2])::uuid)
        AND (
          public.is_admin_or_rrhh()
          OR public.check_user_permission(auth.uid(), 'disciplinarios', 'create')
          OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
        )
      )
    )
  );

CREATE POLICY "Disciplinary managers can delete evidence files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'disciplinary-evidence'
    AND (storage.foldername(name))[1] = 'disciplinary'
    AND (
      public.is_super_admin()
      OR (
        public.is_company_member(((storage.foldername(name))[2])::uuid)
        AND (
          public.is_admin_or_rrhh()
          OR public.check_user_permission(auth.uid(), 'disciplinarios', 'delete')
        )
      )
    )
  );

-- Tokens are secrets: never allow anonymous callers to enumerate the token table.
DROP POLICY IF EXISTS "Public can read token by token value" ON public.disciplinary_defense_tokens;
DROP POLICY IF EXISTS "Role permissions can view disciplinary defense tokens" ON public.disciplinary_defense_tokens;

CREATE POLICY "Role permissions can view disciplinary defense tokens"
  ON public.disciplinary_defense_tokens
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE INDEX IF NOT EXISTS idx_disciplinary_defense_tokens_active_lookup
  ON public.disciplinary_defense_tokens (token, expires_at)
  WHERE is_used = false;

DROP FUNCTION IF EXISTS public.get_disciplinary_defense_form(text);
CREATE FUNCTION public.get_disciplinary_defense_form(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  IF nullif(btrim(p_token), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enlace no válido');
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'expires_at', token_row.expires_at,
    'case_number', process_row.case_number,
    'fault_date', process_row.fault_date,
    'fault_type', process_row.fault_type,
    'facts_description', process_row.facts_description,
    'report_facts', process_row.report_facts,
    'hearing_questions', process_row.hearing_questions,
    'hearing_date', process_row.hearing_date,
    'employee_name', concat_ws(' ', employee_row.first_name, employee_row.last_name),
    'employee_document', employee_row.document_number,
    'company_name', company_row.name
  )
  INTO v_payload
  FROM public.disciplinary_defense_tokens AS token_row
  JOIN public.disciplinary_processes AS process_row ON process_row.id = token_row.process_id
  JOIN public.employees_v2 AS employee_row ON employee_row.id = token_row.employee_id
  JOIN public.companies AS company_row ON company_row.id = token_row.company_id
  WHERE token_row.token = p_token
    AND token_row.is_used = false
    AND token_row.expires_at >= now();

  RETURN coalesce(v_payload, jsonb_build_object(
    'success', false,
    'error', 'El enlace no existe, ya fue utilizado o expiró'
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_disciplinary_defense_form(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_disciplinary_defense_form(text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.submit_defense_via_token(text, text, text);
DROP FUNCTION IF EXISTS public.submit_defense_via_token(text, text, text, jsonb, text, boolean, text, text, text);
CREATE FUNCTION public.submit_defense_via_token(
  p_token text,
  p_content text,
  p_defense_type text DEFAULT 'escrito',
  p_answers jsonb DEFAULT '[]'::jsonb,
  p_signature_data text DEFAULT NULL,
  p_rights_acknowledged boolean DEFAULT false,
  p_employee_email text DEFAULT NULL,
  p_witness_name text DEFAULT NULL,
  p_witness_document text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token_row public.disciplinary_defense_tokens%ROWTYPE;
  v_defense_id uuid;
BEGIN
  IF length(btrim(coalesce(p_content, ''))) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Los descargos deben contener al menos 10 caracteres');
  END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Las respuestas no tienen un formato válido');
  END IF;
  IF NOT p_rights_acknowledged THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debe confirmar que comprende sus derechos');
  END IF;
  IF nullif(p_signature_data, '') IS NULL OR length(p_signature_data) > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La firma es obligatoria o supera el tamaño permitido');
  END IF;

  SELECT * INTO v_token_row
  FROM public.disciplinary_defense_tokens
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND OR v_token_row.is_used OR v_token_row.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'El enlace no existe, ya fue utilizado o expiró');
  END IF;

  INSERT INTO public.disciplinary_defenses (
    company_id, process_id, defense_date, defense_type, content,
    submitted_via_token, answers, rights_acknowledged, signature_data,
    employee_email, witness_name, witness_document, hearing_end_at
  ) VALUES (
    v_token_row.company_id, v_token_row.process_id, CURRENT_DATE,
    CASE WHEN p_defense_type IN ('escrito', 'oral') THEN p_defense_type ELSE 'escrito' END,
    btrim(p_content), true, p_answers, true, p_signature_data,
    nullif(btrim(p_employee_email), ''), nullif(btrim(p_witness_name), ''),
    nullif(btrim(p_witness_document), ''), now()
  )
  RETURNING id INTO v_defense_id;

  UPDATE public.disciplinary_defense_tokens
  SET is_used = true, used_at = now()
  WHERE id = v_token_row.id;

  UPDATE public.disciplinary_processes
  SET status = 'descargos', updated_at = now()
  WHERE id = v_token_row.process_id;

  INSERT INTO public.disciplinary_timeline (
    company_id, process_id, action_type, description, previous_status, new_status
  ) VALUES (
    v_token_row.company_id, v_token_row.process_id, 'descargos_via_enlace',
    'Descargos presentados y firmados por el empleado mediante enlace seguro',
    'citacion_descargos', 'descargos'
  );

  RETURN jsonb_build_object('success', true, 'defense_id', v_defense_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_defense_via_token(text, text, text, jsonb, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_defense_via_token(text, text, text, jsonb, text, boolean, text, text, text) TO anon, authenticated;

COMMIT;
