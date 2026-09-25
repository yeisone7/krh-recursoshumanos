-- Expose the existing payroll actions clearly in role management.
UPDATE public.modules SET name = 'Reporte de Turnos' WHERE code = 'jornadas';
UPDATE public.permissions p SET description = CASE p.action::text
  WHEN 'view' THEN 'Ver reporte y revisión de turnos'
  WHEN 'approve' THEN 'Aprobar o rechazar jornadas'
  ELSE p.description END
FROM public.modules m WHERE p.module_id = m.id AND m.code = 'jornadas';
UPDATE public.permissions p SET description = CASE p.action::text
  WHEN 'view' THEN 'Ver solicitudes de corrección'
  WHEN 'create' THEN 'Solicitar permiso de corrección'
  WHEN 'approve' THEN 'Autorizar o rechazar solicitudes'
  WHEN 'update' THEN 'Revocar permisos de corrección'
  WHEN 'export' THEN 'Consultar auditoría de correcciones'
  ELSE p.description END
FROM public.modules m WHERE p.module_id = m.id AND m.code = 'correction_tickets';

INSERT INTO public.modules (code, name, parent_id, sort_order)
SELECT 'correction_tickets_analytics', 'Analítica de correcciones', id, 4
FROM public.modules WHERE code = 'cortes_control'
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, 'view', 'Ver analítica de correcciones'
FROM public.modules m WHERE m.code = 'correction_tickets_analytics'
  AND NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.module_id = m.id AND p.action = 'view');

-- An approval-only role needs read access to load the review it decides on.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, view_permission.id
FROM public.modules m
JOIN public.permissions approve_permission ON approve_permission.module_id = m.id AND approve_permission.action = 'approve'
JOIN public.permissions view_permission ON view_permission.module_id = m.id AND view_permission.action = 'view'
JOIN public.role_permissions rp ON rp.permission_id = approve_permission.id
WHERE m.code = 'jornadas'
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS correction_ticket_analytics_created
  ON public.payroll_correction_tickets (company_id, created_at, operation_center_id);

CREATE FUNCTION payroll_private.correction_analytics(
  p_company_id uuid, p_from date, p_to date, p_center_id uuid, p_status text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT payroll_private.can(p_company_id, 'correction_tickets_analytics', 'view') THEN
    RAISE EXCEPTION 'Sin permiso para la analítica de correcciones' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from > p_to THEN
    RAISE EXCEPTION 'Rango de fechas inválido' USING ERRCODE = '22023';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('requested','active','rejected','revoked','finished','expired') THEN
    RAISE EXCEPTION 'Estado inválido' USING ERRCODE = '22023';
  END IF;
  IF p_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.operation_centers c
    WHERE c.id = p_center_id AND c.company_id = p_company_id
      AND public.check_center_access(p_company_id, c.id)
  ) THEN
    RAISE EXCEPTION 'Centro no autorizado' USING ERRCODE = '42501';
  END IF;

  WITH scoped AS MATERIALIZED (
    SELECT t.*,
      CASE WHEN t.status IN ('requested','active') AND t.expires_at <= now()
        THEN 'expired' ELSE t.status END AS effective_status
    FROM public.payroll_correction_tickets t
    WHERE t.company_id = p_company_id
      AND (p_center_id IS NULL OR t.operation_center_id = p_center_id)
      AND public.check_center_access(t.company_id, t.operation_center_id)
  ), selected AS MATERIALIZED (
    SELECT * FROM scoped t WHERE (p_status IS NULL OR t.effective_status = p_status)
      AND (p_from IS NULL OR (t.created_at AT TIME ZONE 'America/Bogota')::date >= p_from)
      AND (p_to IS NULL OR (t.created_at AT TIME ZONE 'America/Bogota')::date <= p_to)
  ), events AS MATERIALIZED (
    SELECT e.* FROM public.payroll_correction_events e
    JOIN scoped t ON t.id = e.ticket_id
    WHERE e.company_id = p_company_id
      AND e.operation_center_id = t.operation_center_id
      AND (p_status IS NULL OR t.effective_status = p_status)
      AND (p_from IS NULL OR (e.occurred_at AT TIME ZONE 'America/Bogota')::date >= p_from)
      AND (p_to IS NULL OR (e.occurred_at AT TIME ZONE 'America/Bogota')::date <= p_to)
  ), changes AS MATERIALIZED (
    SELECT * FROM events WHERE module IN ('jornadas','novedades')
      AND action IN ('create','insert','update','delete','upsert')
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'requests', (SELECT count(*) FROM selected),
      'changes', (SELECT count(*) FROM changes),
      'pending', (SELECT count(*) FROM selected WHERE effective_status = 'requested'),
      'active', (SELECT count(*) FROM selected WHERE effective_status = 'active'),
      'expired', (SELECT count(*) FROM selected WHERE effective_status = 'expired')
    ),
    'statuses', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', effective_status, 'count', total) ORDER BY effective_status)
      FROM (SELECT effective_status, count(*) total FROM selected GROUP BY effective_status) s), '[]'::jsonb),
    'requesters', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', requested_by, 'name', requested_by_name, 'count', total)
      ORDER BY total DESC, requested_by_name, requested_by)
      FROM (SELECT requested_by, max(requested_by_name) requested_by_name, count(*) total FROM selected
        GROUP BY requested_by ORDER BY total DESC, requested_by LIMIT 10) s), '[]'::jsonb),
    'employees', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', employee_id, 'name', employee_name, 'count', total)
      ORDER BY total DESC, employee_name, employee_id)
      FROM (SELECT employee_id, max(employee_name) employee_name, count(*) total FROM selected
        GROUP BY employee_id ORDER BY total DESC, employee_id LIMIT 10) s), '[]'::jsonb),
    'centers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', operation_center_id, 'name', center_name, 'count', total)
      ORDER BY total DESC, center_name, operation_center_id)
      FROM (SELECT operation_center_id, max(center_name) center_name, count(*) total FROM selected
        GROUP BY operation_center_id ORDER BY total DESC, operation_center_id LIMIT 10) s), '[]'::jsonb),
    'centerOptions', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', operation_center_id, 'name', center_name) ORDER BY center_name, operation_center_id)
      FROM (SELECT operation_center_id, max(center_name) center_name FROM scoped GROUP BY operation_center_id) s), '[]'::jsonb),
    'modules', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', module, 'count', total) ORDER BY module)
      FROM (SELECT module, count(*) total FROM changes GROUP BY module) s), '[]'::jsonb),
    'actions', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', action, 'count', total) ORDER BY action)
      FROM (SELECT action, count(*) total FROM changes GROUP BY action) s), '[]'::jsonb),
    'decisions', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', action, 'count', total) ORDER BY action)
      FROM (SELECT action, count(*) total FROM events WHERE module = 'tickets' AND action IN ('authorize','reject') GROUP BY action) s), '[]'::jsonb),
    'trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', period_month, 'requests', requests, 'changes', changes) ORDER BY period_month)
      FROM (
        SELECT period_month, sum(requests) requests, sum(changes) changes FROM (
          SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'America/Bogota'), 'YYYY-MM') AS period_month,
            count(*) requests, 0::bigint changes FROM selected GROUP BY 1
          UNION ALL
          SELECT to_char(date_trunc('month', occurred_at AT TIME ZONE 'America/Bogota'), 'YYYY-MM') AS period_month,
            0::bigint requests, count(*) changes FROM changes GROUP BY 1
        ) m GROUP BY period_month
      ) s), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION payroll_private.correction_analytics(uuid,date,date,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION payroll_private.correction_analytics(uuid,date,date,uuid,text) TO authenticated;

CREATE FUNCTION public.payroll_correction_analytics(
  p_company_id uuid, p_from date DEFAULT NULL, p_to date DEFAULT NULL,
  p_center_id uuid DEFAULT NULL, p_status text DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT payroll_private.correction_analytics(p_company_id,p_from,p_to,p_center_id,p_status)
$$;
REVOKE ALL ON FUNCTION public.payroll_correction_analytics(uuid,date,date,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payroll_correction_analytics(uuid,date,date,uuid,text) TO authenticated;
