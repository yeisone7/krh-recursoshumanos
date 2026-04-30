
CREATE OR REPLACE FUNCTION public.submit_defense_via_token(p_token text, p_content text, p_defense_type text DEFAULT 'escrito'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token_row disciplinary_defense_tokens%ROWTYPE;
  v_defense_id UUID;
BEGIN
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

  INSERT INTO disciplinary_defenses (process_id, defense_date, defense_type, content, submitted_via_token)
  VALUES (v_token_row.process_id, CURRENT_DATE, p_defense_type, p_content, true)
  RETURNING id INTO v_defense_id;

  UPDATE disciplinary_defense_tokens
  SET is_used = true, used_at = now()
  WHERE id = v_token_row.id;

  INSERT INTO disciplinary_timeline (process_id, action_type, description, new_status)
  VALUES (
    v_token_row.process_id,
    'descargos_via_token',
    'Descargos presentados por el empleado a través de enlace',
    NULL
  );

  RETURN json_build_object('success', true, 'defense_id', v_defense_id);
END;
$function$;
