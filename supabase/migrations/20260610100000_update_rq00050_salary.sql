-- Update RQ-00050 salary fields requested by HR.

DO $$
DECLARE
  _rows_updated integer;
BEGIN
  UPDATE public.personnel_requisitions
  SET
    salario_propuesto = 4036800,
    rrhh_asignacion_salarial = 4036800,
    updated_at = now()
  WHERE requisition_code = 'RQ-00050';

  GET DIAGNOSTICS _rows_updated = ROW_COUNT;

  IF _rows_updated <> 1 THEN
    RAISE EXCEPTION 'Expected to update exactly one requisition RQ-00050, updated % rows', _rows_updated;
  END IF;
END;
$$;
