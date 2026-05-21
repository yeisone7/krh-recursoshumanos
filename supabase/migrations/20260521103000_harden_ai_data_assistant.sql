ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS ai_data_assistant_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_preferences.ai_data_assistant_enabled
IS 'Permite al usuario acceder al asistente IA de análisis de datos.';

CREATE OR REPLACE FUNCTION public.execute_read_only_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_query text;
  result jsonb;
BEGIN
  normalized_query := btrim(coalesce(query_text, ''));

  IF normalized_query = '' THEN
    RAISE EXCEPTION 'La consulta no puede estar vacía';
  END IF;

  IF normalized_query !~* '^(select|with)\s' THEN
    RAISE EXCEPTION 'Solo se permiten consultas SELECT';
  END IF;

  IF normalized_query LIKE '%;%' THEN
    RAISE EXCEPTION 'No se permiten múltiples sentencias';
  END IF;

  IF normalized_query ~* '\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|execute|vacuum|refresh|set|reset)\b' THEN
    RAISE EXCEPTION 'La consulta contiene operaciones no permitidas';
  END IF;

  IF normalized_query ~* '\b(pg_sleep|dblink|http_|net\.|storage\.|auth\.|vault\.|extensions\.|information_schema|pg_catalog|pg_stat|pg_user|pg_shadow)\b' THEN
    RAISE EXCEPTION 'La consulta intenta acceder a funciones o esquemas no permitidos';
  END IF;

  PERFORM set_config('statement_timeout', '8s', true);

  EXECUTE format(
    'SELECT coalesce(jsonb_agg(row_to_json(q)), ''[]''::jsonb) FROM (%s) q',
    normalized_query
  )
  INTO result;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.execute_read_only_query(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_read_only_query(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.execute_read_only_query(text) TO service_role;
