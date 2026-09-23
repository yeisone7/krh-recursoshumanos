-- Automatic reconciliation skips closed dates; an explicit user refresh reports why.
CREATE OR REPLACE FUNCTION public.time_clock_refresh_absences(_company_id uuid,_work_date date) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c record;
BEGIN
 IF auth.uid() IS NULL OR NOT public.time_clock_can(_company_id,'view') THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
 IF _work_date<(now() AT TIME ZONE 'America/Bogota')::date-366 OR _work_date>(now() AT TIME ZONE 'America/Bogota')::date THEN RAISE EXCEPTION 'INVALID_DATE'; END IF;
 FOR c IN SELECT operation_center_id FROM public.time_clock_center_settings WHERE company_id=_company_id AND enabled AND public.check_center_access(company_id,operation_center_id) ORDER BY operation_center_id LOOP
   PERFORM payroll_private.require_open(_company_id,c.operation_center_id,_work_date,'Actualización de ausencias');
   PERFORM time_clock_private.refresh_date(c.operation_center_id,_work_date);
 END LOOP;
 RETURN 0;
END $$;
