
-- 1. New table for defense tokens
CREATE TABLE public.disciplinary_defense_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.disciplinary_processes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. New column on defenses
ALTER TABLE public.disciplinary_defenses
  ADD COLUMN submitted_via_token BOOLEAN NOT NULL DEFAULT false;

-- 3. Enable RLS
ALTER TABLE public.disciplinary_defense_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Public SELECT by token (anon + authenticated)
CREATE POLICY "Public can read token by token value"
  ON public.disciplinary_defense_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Company members can insert tokens
CREATE POLICY "Company members can insert tokens"
  ON public.disciplinary_defense_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id));

-- 6. Company members can update tokens
CREATE POLICY "Company members can update tokens"
  ON public.disciplinary_defense_tokens
  FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id));

-- 7. RPC function to submit defense via token (security definer)
CREATE OR REPLACE FUNCTION public.submit_defense_via_token(
  p_token TEXT,
  p_content TEXT,
  p_defense_type TEXT DEFAULT 'escrito'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_token_row disciplinary_defense_tokens%ROWTYPE;
  v_defense_id UUID;
BEGIN
  -- Validate token
  SELECT * INTO v_token_row
  FROM disciplinary_defense_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token no válido');
  END IF;

  IF v_token_row.is_used THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ya fue utilizado');
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
  END IF;

  -- Insert defense
  INSERT INTO disciplinary_defenses (process_id, defense_date, defense_type, content, submitted_via_token)
  VALUES (v_token_row.process_id, CURRENT_DATE::text, p_defense_type, p_content, true)
  RETURNING id INTO v_defense_id;

  -- Mark token as used
  UPDATE disciplinary_defense_tokens
  SET is_used = true, used_at = now()
  WHERE id = v_token_row.id;

  -- Add timeline entry
  INSERT INTO disciplinary_timeline (process_id, action_type, description, new_status)
  VALUES (
    v_token_row.process_id,
    'descargos_via_token',
    'Descargos presentados por el empleado a través de enlace',
    NULL
  );

  RETURN json_build_object('success', true, 'defense_id', v_defense_id);
END;
$$;
