CREATE OR REPLACE FUNCTION public.get_psychology_users(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible_users AS (
    SELECT ucr.user_id
    FROM public.user_custom_roles ucr
    JOIN public.custom_roles cr ON cr.id = ucr.role_id
    WHERE cr.company_id = p_company_id
      AND cr.is_active = true
      AND lower(btrim(cr.name)) IN ('psicologia', 'psicología', 'sicologia', 'sicología')

    UNION

    SELECT ur.user_id
    FROM public.user_roles ur
    JOIN public.user_company_assignments uca
      ON uca.user_id = ur.user_id
     AND uca.company_id = p_company_id
    WHERE ur.role = 'psicologo'
  )
  SELECT
    up.id,
    COALESCE(NULLIF(up.full_name, ''), NULLIF(up.display_name, ''), 'Sin Nombre') AS full_name,
    COALESCE(up.display_name, '') AS display_name
  FROM eligible_users eu
  JOIN public.user_company_assignments uca
    ON uca.user_id = eu.user_id
   AND uca.company_id = p_company_id
  JOIN public.user_profiles up ON up.id = eu.user_id
  LEFT JOIN public.user_status us ON us.user_id = eu.user_id
  WHERE auth.uid() IS NOT NULL
    AND public.is_company_member(p_company_id)
    AND COALESCE(us.is_active, true) = true
  ORDER BY full_name;
$$;

REVOKE ALL ON FUNCTION public.get_psychology_users(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_psychology_users(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_psychology_users(uuid) TO authenticated;
