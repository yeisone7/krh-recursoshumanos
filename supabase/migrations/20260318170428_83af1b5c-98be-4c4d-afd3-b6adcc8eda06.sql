
-- Table for self-registration tokens
CREATE TABLE public.self_registration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  target_type text NOT NULL DEFAULT 'candidate',
  vacancy_id uuid REFERENCES public.vacancies(id) ON DELETE SET NULL,
  enabled_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT self_registration_tokens_token_key UNIQUE (token),
  CONSTRAINT self_registration_tokens_target_type_check CHECK (target_type IN ('candidate', 'employee'))
);

-- Enable RLS
ALTER TABLE public.self_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated) for token validation
CREATE POLICY "Anyone can read tokens for validation"
  ON public.self_registration_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

-- Company members can insert
CREATE POLICY "Company members can insert tokens"
  ON public.self_registration_tokens FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

-- Company members can update (mark as used)
CREATE POLICY "Company members can update tokens"
  ON public.self_registration_tokens FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id));

-- Anon can update tokens (mark as used from public form)
CREATE POLICY "Anon can update tokens to mark used"
  ON public.self_registration_tokens FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Anon can insert candidates
CREATE POLICY "Anon can insert candidates via token"
  ON public.candidates FOR INSERT
  TO anon
  WITH CHECK (true);

-- RPC to submit candidate registration via token
CREATE OR REPLACE FUNCTION public.submit_candidate_registration(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_document_type text DEFAULT 'CC',
  p_document_number text DEFAULT '',
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_mobile text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_birth_date text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_gender_identity text DEFAULT NULL,
  p_gender_identity_other text DEFAULT NULL,
  p_education_level text DEFAULT NULL,
  p_profession text DEFAULT NULL,
  p_experience_years integer DEFAULT 0,
  p_current_company text DEFAULT NULL,
  p_current_position text DEFAULT NULL,
  p_salary_expectation numeric DEFAULT NULL,
  p_general_notes text DEFAULT NULL
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

  IF v_token_row.is_used THEN
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
    email, phone, mobile, address, city, department,
    birth_date, gender, gender_identity, gender_identity_other,
    education_level, profession, experience_years,
    current_company, current_position, salary_expectation,
    general_notes, source, status
  ) VALUES (
    v_token_row.vacancy_id, p_first_name, p_last_name, p_document_type::document_type, p_document_number,
    p_email, p_phone, p_mobile, p_address, p_city, p_department,
    CASE WHEN p_birth_date IS NOT NULL THEN p_birth_date::date ELSE NULL END,
    p_gender, p_gender_identity, p_gender_identity_other,
    p_education_level, p_profession, p_experience_years,
    p_current_company, p_current_position, p_salary_expectation,
    p_general_notes, 'auto_registro', 'applied'
  ) RETURNING id INTO v_candidate_id;

  UPDATE self_registration_tokens SET is_used = true, used_at = now() WHERE id = v_token_row.id;

  RETURN json_build_object('success', true, 'candidate_id', v_candidate_id);
END;
$$;
