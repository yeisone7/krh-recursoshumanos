BEGIN;

ALTER TABLE public.shifts
  ADD COLUMN is_not_worked_day boolean NOT NULL DEFAULT false,
  ADD COLUMN is_suspension_day boolean NOT NULL DEFAULT false;

UPDATE public.shifts
SET is_rest_day = coalesce(is_rest_day, false),
    is_not_worked_day = false,
    is_suspension_day = false;

ALTER TABLE public.shifts
  ALTER COLUMN is_rest_day SET DEFAULT false,
  ALTER COLUMN is_rest_day SET NOT NULL;

UPDATE public.shifts
SET start_time = '00:00'::time,
    end_time = '00:00'::time,
    break_minutes = 0,
    crosses_midnight = false
WHERE is_rest_day;

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_single_non_working_classification_check
  CHECK (
    is_rest_day::integer
    + is_not_worked_day::integer
    + is_suspension_day::integer <= 1
  );

CREATE OR REPLACE FUNCTION payroll_private.normalize_shift_classification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_rest_day OR NEW.is_not_worked_day OR NEW.is_suspension_day THEN
    NEW.start_time := '00:00'::time;
    NEW.end_time := '00:00'::time;
    NEW.break_minutes := 0;
    NEW.crosses_midnight := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER normalize_shift_classification
BEFORE INSERT OR UPDATE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION payroll_private.normalize_shift_classification();

REVOKE ALL ON FUNCTION payroll_private.normalize_shift_classification() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION payroll_private.day_snapshot(c uuid,e uuid,d date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a record; w record; BEGIN
 SELECT x.id,x.operation_center_id,x.notes,s.id shift_id,s.name,s.start_time,s.end_time,s.break_minutes,
 s.is_rest_day,s.is_not_worked_day,s.is_suspension_day,s.crosses_midnight
 INTO a FROM public.employee_shift_assignments x JOIN public.shifts s ON s.id=x.shift_id WHERE x.company_id=c AND x.employee_id=e AND x.assignment_date=d;
 IF FOUND THEN RETURN to_jsonb(a)||jsonb_build_object('kind','shift'); END IF;
 SELECT x.id,coalesce(payroll_private.employee_center(c,e,NULL,d),x.operation_center_id) operation_center_id,s.id schedule_id,s.name,s.start_time,s.end_time,s.break_minutes,
 NOT (extract(dow FROM d)::int=ANY(s.days_of_week)) is_rest_day,
 false is_not_worked_day,false is_suspension_day
 INTO w FROM public.employee_time_config x JOIN public.work_schedules s ON s.id=x.work_schedule_id
 WHERE x.company_id=c AND x.employee_id=e AND x.mode='administrative' AND (x.is_active OR x.end_date IS NOT NULL)
 AND x.start_date<=d AND (x.end_date IS NULL OR x.end_date>=d) ORDER BY x.start_date DESC,x.id LIMIT 1;
 IF FOUND THEN RETURN to_jsonb(w)||jsonb_build_object('kind','administrative'); END IF;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION time_clock_private.refresh_date(_center uuid,_date date) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE employee_row record; schedule_row record; expected_start_value timestamptz; expected_end_value timestamptz; incident text; company uuid;
BEGIN
 SELECT company_id INTO company FROM public.time_clock_center_settings WHERE operation_center_id=_center AND enabled AND tracking_start_date<=_date;
 IF company IS NULL THEN RETURN; END IF;
 FOR employee_row IN SELECT DISTINCT e.id AS employee_id,c.id AS cycle_id FROM public.employees_v2 e
 JOIN public.employee_employment_cycles c ON c.employee_id=e.id AND c.status='active' AND c.start_date<=_date
 JOIN public.employee_work_info w ON w.employee_id=e.id AND w.employment_cycle_id=c.id AND w.is_current
 WHERE e.company_id=company AND e.is_active AND w.operation_center_id=_center
 LOOP
   schedule_row:=NULL;
   SELECT shift.name,shift.start_time,shift.end_time,shift.break_minutes,shift.crosses_midnight,
     (shift.is_rest_day OR shift.is_not_worked_day OR shift.is_suspension_day) AS is_non_working
   INTO schedule_row
   FROM public.employee_shift_assignments a JOIN public.shifts shift ON shift.id=a.shift_id WHERE a.employee_id=employee_row.employee_id AND a.assignment_date=_date LIMIT 1;
   IF NOT FOUND THEN
     SELECT s.name,s.start_time,s.end_time,s.break_minutes,s.end_time<=s.start_time AS crosses_midnight,false AS is_non_working INTO schedule_row
     FROM public.employee_time_config c JOIN public.work_schedules s ON s.id=c.work_schedule_id WHERE c.employee_id=employee_row.employee_id AND c.employment_cycle_id=employee_row.cycle_id AND c.is_active AND c.mode='administrative' AND c.start_date<=_date AND (c.end_date IS NULL OR c.end_date>=_date) AND extract(dow FROM _date)::integer=ANY(s.days_of_week) ORDER BY c.start_date DESC LIMIT 1;
   END IF;
   IF schedule_row.name IS NULL OR schedule_row.is_non_working THEN CONTINUE; END IF;
   expected_start_value:=(_date+schedule_row.start_time) AT TIME ZONE 'America/Bogota';
   expected_end_value:=(_date+schedule_row.end_time+CASE WHEN schedule_row.crosses_midnight THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'America/Bogota';
   incident:=CASE WHEN EXISTS(SELECT 1 FROM public.vacation_requests v WHERE v.employee_id=employee_row.employee_id AND _date BETWEEN v.start_date AND v.end_date AND v.status::text='aprobado') OR EXISTS(SELECT 1 FROM public.leave_requests l WHERE l.employee_id=employee_row.employee_id AND _date BETWEEN l.start_date AND l.end_date AND l.status::text='aprobado') OR EXISTS(SELECT 1 FROM public.employee_incapacities i WHERE i.employee_id=employee_row.employee_id AND _date BETWEEN i.start_date AND i.end_date) THEN 'justified_absence' WHEN expected_end_value<now() THEN 'absence' ELSE NULL END;
   INSERT INTO public.time_clock_days(company_id,employee_id,employment_cycle_id,operation_center_id,work_date,schedule_name,expected_start,expected_end,scheduled_break_minutes,status,incident_codes)
   VALUES(company,employee_row.employee_id,employee_row.cycle_id,_center,_date,schedule_row.name,expected_start_value,expected_end_value,coalesce(schedule_row.break_minutes,0),CASE WHEN incident='absence' THEN 'needs_review' WHEN incident='justified_absence' THEN 'complete' ELSE 'scheduled' END,CASE WHEN incident IS NULL THEN '{}'::text[] ELSE ARRAY[incident] END)
   ON CONFLICT(employee_id,employment_cycle_id,work_date) DO UPDATE SET status=excluded.status,incident_codes=excluded.incident_codes,updated_at=now()
   WHERE time_clock_days.first_clock_in IS NULL AND NOT EXISTS(SELECT 1 FROM public.time_clock_events WHERE day_id=time_clock_days.id);
 END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION payroll_private.content_review_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE oldv jsonb; newv jsonb; doc jsonb; ctx payroll_private.correction_context; m text; d date; c uuid; e uuid; center uuid; r record; s jsonb; BEGIN
 IF TG_OP<>'INSERT' THEN oldv:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN newv:=to_jsonb(NEW); END IF;
 doc:=coalesce(newv,oldv); c:=(doc->>'company_id')::uuid; e:=(doc->>'employee_id')::uuid;
 IF TG_TABLE_NAME IN('employee_shift_assignments','payroll_novelties') THEN
 SELECT * INTO ctx FROM payroll_private.correction_context WHERE tx=txid_current() AND record_id=(doc->>'id')::uuid AND table_name=TG_TABLE_NAME;
 m:=CASE TG_TABLE_NAME WHEN 'employee_shift_assignments' THEN 'jornadas' ELSE 'novedades' END;
 d:=(doc->>CASE WHEN m='jornadas' THEN 'assignment_date' ELSE 'novelty_date' END)::date;
 center:=(doc->>'operation_center_id')::uuid;
 IF m='jornadas' THEN
 IF oldv IS NOT NULL THEN oldv:=oldv||jsonb_build_object('programacion',(SELECT jsonb_build_object('nombre',name,'entrada',start_time,'salida',end_time,'descanso_minutos',break_minutes,'dia_descanso',is_rest_day,'no_trabajado',is_not_worked_day,'suspension',is_suspension_day) FROM public.shifts WHERE id=(oldv->>'shift_id')::uuid)); END IF;
 IF newv IS NOT NULL THEN newv:=newv||jsonb_build_object('programacion',(SELECT jsonb_build_object('nombre',name,'entrada',start_time,'salida',end_time,'descanso_minutos',break_minutes,'dia_descanso',is_rest_day,'no_trabajado',is_not_worked_day,'suspension',is_suspension_day) FROM public.shifts WHERE id=(newv->>'shift_id')::uuid)); END IF;
 END IF;
 IF center IS NOT NULL THEN PERFORM payroll_private.correction_event(c,center,e,ctx.ticket_id,m,coalesce(ctx.action,lower(TG_OP)),(doc->>'id')::uuid,d,oldv,newv); END IF;
 END IF;
 IF TG_TABLE_NAME<>'payroll_novelties' THEN
 FOR r IN SELECT * FROM public.schedule_day_reviews v WHERE
 (TG_TABLE_NAME IN('shifts','work_schedules') AND ((v.snapshot->>'shift_id')=(doc->>'id') OR (v.snapshot->>'schedule_id')=(doc->>'id')))
 OR (TG_TABLE_NAME='employee_time_config' AND v.company_id=c AND v.employee_id=e)
 OR (TG_TABLE_NAME='employee_shift_assignments' AND v.company_id=c AND v.employee_id IN(e,(oldv->>'employee_id')::uuid) AND v.work_date IN(d,(oldv->>'assignment_date')::date))
 LOOP
 s:=payroll_private.day_snapshot(r.company_id,r.employee_id,r.work_date);
 IF r.snapshot IS DISTINCT FROM s THEN
 PERFORM payroll_private.correction_event(r.company_id,r.operation_center_id,r.employee_id,ctx.ticket_id,'jornadas','invalidate',NULL,r.work_date,to_jsonb(r),s);
 UPDATE public.schedule_day_reviews SET status='pending',snapshot=s,reviewed_by=NULL,reviewed_by_name=NULL,reviewed_at=NULL,reason=NULL,ticket_id=ctx.ticket_id WHERE company_id=r.company_id AND employee_id=r.employee_id AND work_date=r.work_date;
 END IF; END LOOP;
 IF TG_TABLE_NAME='employee_shift_assignments' AND TG_OP<>'DELETE' AND center IS NOT NULL THEN
 INSERT INTO public.schedule_day_reviews(company_id,employee_id,work_date,operation_center_id,status,snapshot,ticket_id)
 VALUES(c,e,d,center,'pending',payroll_private.day_snapshot(c,e,d),ctx.ticket_id)
 ON CONFLICT(company_id,employee_id,work_date) DO NOTHING;
 END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;

COMMIT;
