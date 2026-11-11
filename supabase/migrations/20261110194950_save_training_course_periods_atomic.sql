-- Keep replacement atomic and enforce the caller's existing RLS policies.
CREATE OR REPLACE FUNCTION public.save_training_course_periods(
  p_company_id uuid, p_course_id uuid, p_periods jsonb
) RETURNS SETOF public.training_course_periods
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  expected_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_periods IS NULL OR jsonb_typeof(p_periods) <> 'array' THEN
    RAISE EXCEPTION 'Periods must be an array' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_periods) item
    WHERE jsonb_typeof(item) <> 'object'
      OR COALESCE(item->>'year', '') !~ '^[0-9]{1,4}$'
      OR COALESCE(item->>'month', '') !~ '^[0-9]{1,2}$'
  ) THEN
    RAISE EXCEPTION 'Invalid period' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_periods) AS p(year integer, month integer)
    WHERE year NOT BETWEEN 1 AND 9999 OR month NOT BETWEEN 1 AND 12
  ) THEN
    RAISE EXCEPTION 'Invalid period' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.training_courses c
    WHERE c.id = p_course_id AND c.company_id = p_company_id
  ) OR NOT (
    public.is_super_admin() OR (
      public.is_company_member(p_company_id) AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'capacitaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'create')
        OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'update')
        OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'create')
        OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'update')
        OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'create')
        OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
      )
    )
  ) THEN
    RAISE EXCEPTION 'Course not accessible for editing' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_course_id::text, 0));

  DELETE FROM public.training_course_periods existing
  WHERE existing.company_id = p_company_id AND existing.course_id = p_course_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(p_periods) AS p(year integer, month integer)
      WHERE p.year = existing.year AND p.month = existing.month
    );

  INSERT INTO public.training_course_periods(company_id, course_id, year, month, created_by)
  SELECT DISTINCT p_company_id, p_course_id, p.year, p.month, auth.uid()
  FROM jsonb_to_recordset(p_periods) AS p(year integer, month integer)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.training_course_periods existing
    WHERE existing.company_id = p_company_id AND existing.course_id = p_course_id
      AND existing.year = p.year AND existing.month = p.month
  );

  SELECT count(*) INTO expected_count FROM (
    SELECT DISTINCT year, month FROM jsonb_to_recordset(p_periods) AS p(year integer, month integer)
  ) requested;
  IF (SELECT count(*) FROM public.training_course_periods
      WHERE company_id = p_company_id AND course_id = p_course_id) <> expected_count THEN
    RAISE EXCEPTION 'Unable to replace all periods' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.training_course_periods
  WHERE company_id = p_company_id AND course_id = p_course_id ORDER BY year, month;
END;
$$;
REVOKE ALL ON FUNCTION public.save_training_course_periods(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_training_course_periods(uuid, uuid, jsonb) TO authenticated;
