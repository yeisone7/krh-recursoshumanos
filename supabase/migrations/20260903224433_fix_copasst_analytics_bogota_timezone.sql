CREATE OR REPLACE FUNCTION private.get_copasst_analytics_impl(election_id_value uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
DECLARE total_eligible integer;
DECLARE total_voted integer;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id, 'analitica_copasst', 'view') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso';
  END IF;
  SELECT count(*), count(*) FILTER (WHERE voted_at IS NOT NULL) INTO total_eligible, total_voted
  FROM public.copasst_electorate WHERE election_id = election_row.id;
  RETURN jsonb_build_object(
    'election', jsonb_build_object('id', election_row.id, 'title', election_row.title,
      'term_label', election_row.term_label, 'seats', election_row.seats,
      'status', private.copasst_effective_status(election_row), 'starts_at', election_row.starts_at, 'ends_at', election_row.ends_at),
    'kpis', jsonb_build_object('eligible', total_eligible, 'voted', total_voted,
      'pending', total_eligible - total_voted,
      'participation', CASE WHEN total_eligible = 0 THEN 0 ELSE round(100.0 * total_voted / total_eligible, 1) END),
    'results', private.copasst_result_payload(election_row),
    'segments', jsonb_build_object(
      'gender', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.label), '[]'::jsonb) FROM (
        SELECT coalesce(gender, 'Sin dato') label, count(*)::integer eligible,
          count(*) FILTER (WHERE voted_at IS NOT NULL)::integer voted
        FROM public.copasst_electorate WHERE election_id = election_row.id GROUP BY coalesce(gender, 'Sin dato')
      ) grouped),
      'center', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.label), '[]'::jsonb) FROM (
        SELECT coalesce(operation_center_name, 'Sin dato') label, count(*)::integer eligible,
          count(*) FILTER (WHERE voted_at IS NOT NULL)::integer voted
        FROM public.copasst_electorate WHERE election_id = election_row.id GROUP BY coalesce(operation_center_name, 'Sin dato')
      ) grouped),
      'area', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.label), '[]'::jsonb) FROM (
        SELECT coalesce(area_name, 'Sin dato') label, count(*)::integer eligible,
          count(*) FILTER (WHERE voted_at IS NOT NULL)::integer voted
        FROM public.copasst_electorate WHERE election_id = election_row.id GROUP BY coalesce(area_name, 'Sin dato')
      ) grouped),
      'position', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.label), '[]'::jsonb) FROM (
        SELECT coalesce(position_name, 'Sin dato') label, count(*)::integer eligible,
          count(*) FILTER (WHERE voted_at IS NOT NULL)::integer voted
        FROM public.copasst_electorate WHERE election_id = election_row.id GROUP BY coalesce(position_name, 'Sin dato')
      ) grouped)
    ),
    'timeline', (SELECT coalesce(jsonb_agg(to_jsonb(grouped) ORDER BY grouped.bucket), '[]'::jsonb) FROM (
      SELECT date_trunc(
        CASE WHEN election_row.ends_at - election_row.starts_at <= interval '3 days' THEN 'hour' ELSE 'day' END,
        voted_at,
        'America/Bogota'
      ) bucket,
        count(*)::integer votes FROM public.copasst_electorate
      WHERE election_id = election_row.id AND voted_at IS NOT NULL GROUP BY 1
    ) grouped),
    'quality', (SELECT jsonb_build_object(
      'missing_gender', count(*) FILTER (WHERE gender IS NULL),
      'missing_center', count(*) FILTER (WHERE operation_center_name IS NULL),
      'missing_area', count(*) FILTER (WHERE area_name IS NULL),
      'missing_position', count(*) FILTER (WHERE position_name IS NULL)
    ) FROM public.copasst_electorate WHERE election_id = election_row.id)
  );
END;
$$;
