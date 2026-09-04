CREATE OR REPLACE FUNCTION private.log_copasst_export_impl(election_id_value uuid, export_type_value text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE election_row public.copasst_elections;
BEGIN
  SELECT * INTO election_row FROM public.copasst_elections WHERE id = election_id_value;
  IF NOT FOUND OR NOT private.can_manage_copasst(election_row.company_id,
    CASE WHEN export_type_value = 'electorate_xlsx' THEN 'copasst_cumplimiento' ELSE 'analitica_copasst' END, 'export') THEN
    RAISE EXCEPTION 'Elección no encontrada o sin permiso para exportar';
  END IF;
  IF export_type_value NOT IN ('minutes_pdf', 'electorate_xlsx', 'center_participation_xlsx') THEN
    RAISE EXCEPTION 'Tipo de exportación inválido';
  END IF;
  PERFORM private.log_copasst_action(election_row, 'export', jsonb_build_object('type', export_type_value));
  RETURN true;
END;
$$;
