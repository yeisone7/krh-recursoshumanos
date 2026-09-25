-- Reviewed calendar versions and narrowly scoped exceptions to payroll cuts.
INSERT INTO public.modules(code,name,parent_id,sort_order)
SELECT 'correction_tickets','Permisos de corrección',id,3 FROM public.modules WHERE code='cortes_control';
INSERT INTO public.permissions(module_id,action,description)
SELECT id,v.action::public.permission_action,v.label FROM public.modules CROSS JOIN (VALUES
 ('view','Consultar permisos de corrección'),('create','Solicitar corrección'),
 ('approve','Autorizar o rechazar solicitudes'),('update','Revocar permisos'),
 ('export','Consultar y exportar auditoría de correcciones')) v(action,label) WHERE code='correction_tickets';
INSERT INTO public.permissions(module_id,action,description)
SELECT id,'approve','Aprobar programación de jornadas' FROM public.modules m WHERE code='jornadas'
AND NOT EXISTS(SELECT 1 FROM public.permissions p WHERE p.module_id=m.id AND p.action='approve');

CREATE TABLE public.payroll_correction_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 company_id uuid NOT NULL REFERENCES public.companies(id), employee_id uuid NOT NULL REFERENCES public.employees_v2(id),
 operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id),
 requested_by uuid NOT NULL, requested_by_name text NOT NULL, employee_name text NOT NULL, center_name text NOT NULL,
 start_date date NOT NULL, end_date date NOT NULL, expires_at timestamptz NOT NULL,
 actions text[] NOT NULL, reason text NOT NULL,
 status text NOT NULL DEFAULT 'requested' CHECK(status IN('requested','active','rejected','revoked','finished')),
 authorized_by uuid, authorized_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(start_date<=end_date), CHECK(cardinality(actions)>0)
);
CREATE INDEX correction_ticket_scope ON public.payroll_correction_tickets(company_id,employee_id,operation_center_id,start_date,end_date) WHERE status='active';
CREATE TABLE public.schedule_day_reviews (
 company_id uuid NOT NULL REFERENCES public.companies(id), employee_id uuid NOT NULL REFERENCES public.employees_v2(id),
 work_date date NOT NULL, operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id),
 status text NOT NULL CHECK(status IN('pending','approved','rejected')), snapshot jsonb,
 reviewed_by uuid, reviewed_by_name text, reviewed_at timestamptz, reason text,
 ticket_id uuid REFERENCES public.payroll_correction_tickets(id),
 PRIMARY KEY(company_id,employee_id,work_date)
);
CREATE TABLE public.payroll_correction_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id),
 operation_center_id uuid NOT NULL, employee_id uuid NOT NULL, employee_name text NOT NULL,
 ticket_id uuid REFERENCES public.payroll_correction_tickets(id), module text NOT NULL, action text NOT NULL,
 record_id uuid, work_date date, actor_id uuid, actor_name text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(), old_values jsonb, new_values jsonb,
 cuts jsonb NOT NULL DEFAULT '[]', reason text
);
CREATE INDEX schedule_review_shift ON public.schedule_day_reviews((snapshot->>'shift_id'));
CREATE INDEX schedule_review_schedule ON public.schedule_day_reviews((snapshot->>'schedule_id'));
CREATE INDEX correction_event_scope ON public.payroll_correction_events(company_id,occurred_at DESC,id);
CREATE INDEX correction_event_ticket ON public.payroll_correction_events(ticket_id,occurred_at,id);
-- Custom-role reviewers must be able to see the version they are reviewing,
-- including records created by the ticket operator, scoped to historical center.
CREATE POLICY correction_novelties_read ON public.payroll_novelties FOR SELECT TO authenticated USING (
 payroll_private.can(company_id,'novedades','view') AND public.check_center_access(company_id,operation_center_id));
CREATE TABLE payroll_private.review_activation (activated_at timestamptz NOT NULL);
INSERT INTO payroll_private.review_activation VALUES(clock_timestamp());
CREATE TABLE payroll_private.correction_context (
 tx bigint NOT NULL, record_id uuid NOT NULL, table_name text NOT NULL, action text NOT NULL,
 ticket_id uuid REFERENCES public.payroll_correction_tickets(id), PRIMARY KEY(tx,record_id,table_name)
);
REVOKE ALL ON payroll_private.review_activation,payroll_private.correction_context FROM PUBLIC,anon,authenticated;

CREATE FUNCTION payroll_private.correction_read(c uuid,center uuid,requester uuid DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.check_center_access(c,center) AND (
 payroll_private.can(c,'correction_tickets','view') OR payroll_private.can(c,'correction_tickets','approve')
 OR payroll_private.can(c,'correction_tickets','update')
 OR payroll_private.can(c,'correction_tickets','export') OR
 (requester=auth.uid() AND payroll_private.can(c,'correction_tickets','create'))
 OR payroll_private.can(c,'jornadas','approve') OR payroll_private.can(c,'novedades','approve'))
$$;
GRANT EXECUTE ON FUNCTION payroll_private.correction_read(uuid,uuid,uuid) TO authenticated;
ALTER TABLE public.payroll_correction_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_day_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_correction_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payroll_correction_tickets,public.schedule_day_reviews,public.payroll_correction_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.payroll_correction_tickets,public.schedule_day_reviews,public.payroll_correction_events TO authenticated;
CREATE POLICY correction_tickets_read ON public.payroll_correction_tickets FOR SELECT TO authenticated
USING(payroll_private.correction_read(company_id,operation_center_id,requested_by));
CREATE POLICY schedule_reviews_read ON public.schedule_day_reviews FOR SELECT TO authenticated
USING(payroll_private.can(company_id,'jornadas','view') AND public.check_center_access(company_id,operation_center_id));
CREATE POLICY correction_events_read ON public.payroll_correction_events FOR SELECT TO authenticated USING(
 public.check_center_access(company_id,operation_center_id) AND
 (payroll_private.can(company_id,'correction_tickets','export') OR
 (ticket_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.payroll_correction_tickets t WHERE t.id=ticket_id)) OR
 (module='jornadas' AND payroll_private.can(company_id,'jornadas','view'))));

-- Acquired before row locks, including direct writes/catalog edits. Reviews and
-- content changes must never read different versions inside the same decision.
CREATE FUNCTION payroll_private.review_lock() RETURNS void LANGUAGE sql VOLATILE SET search_path='' AS $$
 SELECT pg_advisory_xact_lock(hashtextextended('payroll-calendar-review',0))
$$;
CREATE FUNCTION payroll_private.review_statement_lock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM payroll_private.review_lock(); RETURN NULL; END $$;
-- Existing RPCs that acquire center locks must take the review lock first too,
-- before their row locks/statements, preventing an inverted lock order.
DO $$ DECLARE f record; definition text; BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='public' AND l.lanname='plpgsql' AND p.prosrc LIKE '%payroll_private.lock_center(%' LOOP
 definition:=pg_get_functiondef(f.oid);
 EXECUTE regexp_replace(definition,'\mBEGIN\M',E'BEGIN\n PERFORM payroll_private.review_lock();','i');
 END LOOP;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['employee_shift_assignments','employee_time_config','work_schedules','shifts','payroll_novelties'] LOOP
 EXECUTE format('CREATE TRIGGER correction_statement_lock BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION payroll_private.review_statement_lock()',t);
 END LOOP;
END $$;

CREATE FUNCTION payroll_private.correction_event(c uuid,center uuid,e uuid,t uuid,m text,a text,r uuid,d date,oldv jsonb,newv jsonb,why text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.payroll_correction_events(company_id,operation_center_id,employee_id,employee_name,ticket_id,module,action,record_id,work_date,actor_id,actor_name,old_values,new_values,cuts,reason)
 SELECT c,center,e,concat_ws(' ',emp.first_name,emp.last_name),t,m,a,r,d,auth.uid(),
 coalesce((SELECT coalesce(display_name,full_name) FROM public.user_profiles WHERE id=auth.uid()),'Sistema'),oldv,newv,
 coalesce((SELECT jsonb_agg(to_jsonb(cut)) FROM public.payroll_control_cuts cut WHERE cut.company_id=c AND cut.operation_center_id=center AND cut.active),'[]'),why
 FROM public.employees_v2 emp WHERE emp.id=e AND emp.company_id=c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empleado inválido' USING ERRCODE='42501'; END IF;
END $$;

CREATE FUNCTION payroll_private.ticket_allows(t public.payroll_correction_tickets,c uuid,center uuid,e uuid,d date,m text,a text) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(t.company_id=c AND t.operation_center_id=center AND t.employee_id=e AND t.status='active'
 AND t.authorized_at<=clock_timestamp() AND clock_timestamp()<t.expires_at AND d BETWEEN t.start_date AND t.end_date
 AND (m||':'||a)=ANY(t.actions) AND (a='approve' OR t.requested_by=auth.uid())
 AND payroll_private.can(c,m,a) AND public.check_center_access(c,center),false)
$$;

CREATE FUNCTION public.payroll_ticket_request(p_company_id uuid,p_employee_id uuid,p_center_id uuid,p_start date,p_end date,p_expires timestamptz,p_actions text[],p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.payroll_correction_tickets; d date; BEGIN
 PERFORM payroll_private.review_lock();
 IF NOT payroll_private.can(p_company_id,'correction_tickets','create') OR NOT public.check_center_access(p_company_id,p_center_id)
 OR NOT EXISTS(SELECT 1 FROM public.employees_v2 WHERE id=p_employee_id AND company_id=p_company_id)
 THEN RAISE EXCEPTION 'Sin permiso para solicitar corrección' USING ERRCODE='42501'; END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_start>p_end OR p_end-p_start>366 OR p_expires IS NULL OR p_expires<=clock_timestamp()
 OR length(btrim(coalesce(p_reason,'')))<5 OR coalesce(cardinality(p_actions),0)=0
 OR EXISTS(SELECT 1 FROM unnest(p_actions) a WHERE a IS NULL OR a NOT IN('jornadas:create','jornadas:update','jornadas:delete','jornadas:approve','novedades:create','novedades:update','novedades:delete','novedades:approve'))
 THEN RAISE EXCEPTION 'Revise fechas (máximo 367 días), acciones, vencimiento y motivo' USING ERRCODE='22023'; END IF;
 FOR d IN SELECT generate_series(p_start,p_end,'1 day')::date LOOP
 IF p_center_id IS DISTINCT FROM coalesce(
 (SELECT operation_center_id FROM public.employee_shift_assignments WHERE company_id=p_company_id AND employee_id=p_employee_id AND assignment_date=d),
 payroll_private.employee_center(p_company_id,p_employee_id,NULL,d))
 THEN RAISE EXCEPTION 'El rango debe pertenecer a un solo centro histórico. Divida la solicitud.' USING ERRCODE='22023'; END IF;
 END LOOP;
 INSERT INTO public.payroll_correction_tickets(company_id,employee_id,operation_center_id,requested_by,requested_by_name,employee_name,center_name,start_date,end_date,expires_at,actions,reason)
 SELECT p_company_id,p_employee_id,p_center_id,auth.uid(),coalesce((SELECT coalesce(display_name,full_name) FROM public.user_profiles WHERE id=auth.uid()),'Usuario'),
 concat_ws(' ',e.first_name,e.last_name),o.name,p_start,p_end,p_expires,p_actions,btrim(p_reason)
 FROM public.employees_v2 e JOIN public.operation_centers o ON o.id=p_center_id AND o.company_id=p_company_id WHERE e.id=p_employee_id RETURNING * INTO t;
 PERFORM payroll_private.correction_event(t.company_id,t.operation_center_id,t.employee_id,t.id,'tickets','request',t.id,NULL,NULL,to_jsonb(t),t.reason);
 RETURN t.id;
END $$;

CREATE FUNCTION public.payroll_ticket_transition(p_id uuid,p_action text,p_reason text,p_start date DEFAULT NULL,p_end date DEFAULT NULL,p_expires timestamptz DEFAULT NULL,p_actions text[] DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.payroll_correction_tickets; oldv jsonb; BEGIN
 PERFORM payroll_private.review_lock();
 SELECT * INTO t FROM public.payroll_correction_tickets WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT payroll_private.correction_read(t.company_id,t.operation_center_id,t.requested_by) THEN RAISE EXCEPTION 'Solicitud no autorizada' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Escriba un motivo de al menos cinco caracteres' USING ERRCODE='22023'; END IF;
 oldv:=to_jsonb(t);
 IF p_action IN('authorize','reject') THEN
 IF NOT payroll_private.can(t.company_id,'correction_tickets','approve') OR t.requested_by=auth.uid() THEN RAISE EXCEPTION 'Otra persona debe autorizar la solicitud' USING ERRCODE='42501'; END IF;
 IF t.status<>'requested' OR t.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'La solicitud ya cambió o venció' USING ERRCODE='40001'; END IF;
 IF p_action='authorize' THEN
 t.start_date:=coalesce(p_start,t.start_date); t.end_date:=coalesce(p_end,t.end_date); t.expires_at:=coalesce(p_expires,t.expires_at); t.actions:=coalesce(p_actions,t.actions);
 IF t.start_date<(oldv->>'start_date')::date OR t.end_date>(oldv->>'end_date')::date OR t.start_date>t.end_date
 OR t.expires_at>(oldv->>'expires_at')::timestamptz OR t.expires_at<=clock_timestamp() OR cardinality(t.actions)=0
 OR NOT t.actions <@ ARRAY(SELECT jsonb_array_elements_text(oldv->'actions')) OR array_position(t.actions,NULL) IS NOT NULL
 THEN RAISE EXCEPTION 'Solo puede reducir el alcance o el plazo' USING ERRCODE='22023'; END IF;
 t.status:='active'; t.authorized_by:=auth.uid(); t.authorized_at:=clock_timestamp();
 ELSE t.status:='rejected'; END IF;
 ELSIF p_action IN('cancel','finish','revoke') THEN
 IF p_action='revoke' THEN
 IF NOT payroll_private.can(t.company_id,'correction_tickets','update') THEN RAISE EXCEPTION 'Sin permiso para revocar' USING ERRCODE='42501'; END IF;
 ELSE
 IF t.requested_by<>auth.uid() OR NOT payroll_private.can(t.company_id,'correction_tickets','create') THEN RAISE EXCEPTION 'Solo el solicitante puede finalizar o cancelar' USING ERRCODE='42501'; END IF;
 END IF;
 IF (p_action='cancel' AND t.status<>'requested') OR (p_action<>'cancel' AND (t.status<>'active' OR t.expires_at<=clock_timestamp())) THEN RAISE EXCEPTION 'El ticket ya cambió o venció' USING ERRCODE='40001'; END IF;
 t.status:=CASE WHEN p_action='revoke' THEN 'revoked' ELSE 'finished' END;
 ELSE RAISE EXCEPTION 'Acción inválida' USING ERRCODE='22023'; END IF;
 UPDATE public.payroll_correction_tickets SET status=t.status,start_date=t.start_date,end_date=t.end_date,expires_at=t.expires_at,actions=t.actions,authorized_by=t.authorized_by,authorized_at=t.authorized_at WHERE id=t.id;
 PERFORM payroll_private.correction_event(t.company_id,t.operation_center_id,t.employee_id,t.id,'tickets',p_action,t.id,NULL,oldv,to_jsonb(t),p_reason);
END $$;

-- Snapshot has only payroll-relevant content. Cosmetic catalog changes do not
-- invalidate a review; previous snapshots remain immutable in the event log.
CREATE FUNCTION payroll_private.day_snapshot(c uuid,e uuid,d date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a record; w record; BEGIN
 SELECT x.id,x.operation_center_id,x.notes,s.id shift_id,s.name,s.start_time,s.end_time,s.break_minutes,s.is_rest_day,s.crosses_midnight
 INTO a FROM public.employee_shift_assignments x JOIN public.shifts s ON s.id=x.shift_id WHERE x.company_id=c AND x.employee_id=e AND x.assignment_date=d;
 IF FOUND THEN RETURN to_jsonb(a)||jsonb_build_object('kind','shift'); END IF;
 SELECT x.id,coalesce(payroll_private.employee_center(c,e,NULL,d),x.operation_center_id) operation_center_id,s.id schedule_id,s.name,s.start_time,s.end_time,s.break_minutes,
 NOT (extract(dow FROM d)::int=ANY(s.days_of_week)) is_rest_day INTO w
 FROM public.employee_time_config x JOIN public.work_schedules s ON s.id=x.work_schedule_id
 WHERE x.company_id=c AND x.employee_id=e AND x.mode='administrative' AND (x.is_active OR x.end_date IS NOT NULL)
 AND x.start_date<=d AND (x.end_date IS NULL OR x.end_date>=d) ORDER BY x.start_date DESC,x.id LIMIT 1;
 IF FOUND THEN RETURN to_jsonb(w)||jsonb_build_object('kind','administrative'); END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION public.payroll_schedule_days(p_company_id uuid,p_employees uuid[],p_start date,p_end date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e uuid; d date; s jsonb; r public.schedule_day_reviews; result jsonb:='[]'; st text; source_time timestamptz; BEGIN
 IF NOT (payroll_private.can(p_company_id,'jornadas','view') OR payroll_private.can(p_company_id,'cortes_control','view')) THEN RAISE EXCEPTION 'Sin permiso para consultar jornadas' USING ERRCODE='42501'; END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_start>p_end OR p_end-p_start>366 OR coalesce(cardinality(p_employees),0)>500 THEN RAISE EXCEPTION 'Rango inválido' USING ERRCODE='22023'; END IF;
 FOREACH e IN ARRAY p_employees LOOP
 FOR d IN SELECT generate_series(p_start,p_end,'1 day')::date LOOP
 s:=payroll_private.day_snapshot(p_company_id,e,d);
 IF s IS NULL OR NOT public.check_center_access(p_company_id,(s->>'operation_center_id')::uuid) THEN CONTINUE; END IF;
 SELECT * INTO r FROM public.schedule_day_reviews WHERE company_id=p_company_id AND employee_id=e AND work_date=d;
 IF FOUND THEN st:=CASE WHEN r.snapshot=s THEN r.status ELSE 'pending' END;
 ELSE
 SELECT greatest(created_at,updated_at) INTO source_time FROM public.employee_shift_assignments WHERE id=(s->>'id')::uuid;
 IF NOT FOUND THEN SELECT greatest(x.created_at,x.updated_at,w.updated_at) INTO source_time FROM public.employee_time_config x JOIN public.work_schedules w ON w.id=x.work_schedule_id WHERE x.id=(s->>'id')::uuid; END IF;
 st:=CASE WHEN source_time<(SELECT activated_at FROM payroll_private.review_activation) THEN 'historical' ELSE 'pending' END;
 END IF;
 result:=result||jsonb_build_array(jsonb_build_object('employee_id',e,'work_date',d,'snapshot',s,'status',st,'review',to_jsonb(r)));
 END LOOP; END LOOP; RETURN result;
END $$;

CREATE FUNCTION public.payroll_schedule_cut_summary(p_company_id uuid,p_center_id uuid,p_end date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item record; snap jsonb; r public.schedule_day_reviews; counts jsonb:='{"pending":0,"rejected":0,"historical":0,"approved":0}'; st text; source_time timestamptz;
BEGIN
 IF p_end IS NULL OR NOT payroll_private.can(p_company_id,'cortes_control','view') OR NOT public.check_center_access(p_company_id,p_center_id) THEN RAISE EXCEPTION 'Centro o fecha no autorizados' USING ERRCODE='42501'; END IF;
 FOR item IN
 SELECT employee_id,assignment_date d FROM public.employee_shift_assignments WHERE company_id=p_company_id AND operation_center_id=p_center_id AND assignment_date<=p_end
 UNION
 SELECT x.employee_id,g::date FROM public.employee_time_config x CROSS JOIN LATERAL generate_series(x.start_date,least(coalesce(x.end_date,p_end),p_end),'1 day') g
 WHERE x.company_id=p_company_id AND x.operation_center_id=p_center_id AND x.mode='administrative' AND (x.is_active OR x.end_date IS NOT NULL)
 LOOP
 snap:=payroll_private.day_snapshot(p_company_id,item.employee_id,item.d);
 IF snap IS NULL OR (snap->>'operation_center_id')::uuid IS DISTINCT FROM p_center_id THEN CONTINUE; END IF;
 SELECT * INTO r FROM public.schedule_day_reviews WHERE company_id=p_company_id AND employee_id=item.employee_id AND work_date=item.d;
 IF FOUND THEN st:=CASE WHEN r.snapshot=snap THEN r.status ELSE 'pending' END;
 ELSE
 SELECT greatest(created_at,updated_at) INTO source_time FROM public.employee_shift_assignments WHERE id=(snap->>'id')::uuid;
 IF NOT FOUND THEN SELECT greatest(x.created_at,x.updated_at,w.updated_at) INTO source_time FROM public.employee_time_config x JOIN public.work_schedules w ON w.id=x.work_schedule_id WHERE x.id=(snap->>'id')::uuid; END IF;
 st:=CASE WHEN source_time<(SELECT activated_at FROM payroll_private.review_activation) THEN 'historical' ELSE 'pending' END;
 END IF;
 counts:=jsonb_set(counts,ARRAY[st],to_jsonb((counts->>st)::int+1));
 END LOOP; RETURN counts;
END $$;

-- The existing guard still validates historical scope/catalog protection. Only
-- its final date check gains an exception, from a server-owned transaction row.
CREATE FUNCTION payroll_private.require_correction_open(c uuid,center uuid,d date,tbl text,doc jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ctx payroll_private.correction_context; t public.payroll_correction_tickets; BEGIN
 IF tbl IN('employee_shift_assignments','payroll_novelties') THEN
 SELECT * INTO ctx FROM payroll_private.correction_context WHERE tx=txid_current() AND record_id=(doc->>'id')::uuid AND table_name=tbl;
 IF FOUND AND ctx.ticket_id IS NOT NULL THEN
 SELECT * INTO t FROM public.payroll_correction_tickets WHERE id=ctx.ticket_id;
 IF payroll_private.ticket_allows(t,c,center,(doc->>'employee_id')::uuid,d,CASE tbl WHEN 'employee_shift_assignments' THEN 'jornadas' ELSE 'novedades' END,ctx.action) THEN RETURN; END IF;
 RAISE EXCEPTION 'Ticket vencido, revocado o fuera del alcance autorizado' USING ERRCODE='42501';
 END IF; END IF;
 PERFORM payroll_private.require_open(c,center,d,tbl||':'||(doc->>'id'));
END $$;
DO $$ DECLARE body text; BEGIN
 SELECT pg_get_functiondef('payroll_private.row_guard()'::regprocedure) INTO body;
 IF position('PERFORM payroll_private.require_open(company,center,date_value,TG_TABLE_NAME||' IN body)=0 THEN RAISE EXCEPTION 'Versión inesperada del guard de cortes'; END IF;
 body:=replace(body,'PERFORM payroll_private.require_open(company,center,date_value,TG_TABLE_NAME||'':''||(doc->>''id''));','PERFORM payroll_private.require_correction_open(company,center,date_value,TG_TABLE_NAME,doc);');
 EXECUTE body;
END $$;

CREATE FUNCTION payroll_private.novelty_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE decision boolean; BEGIN
 SELECT EXISTS(SELECT 1 FROM payroll_private.correction_context WHERE tx=txid_current() AND record_id=NEW.id AND table_name='payroll_novelties' AND action='approve') INTO decision;
 IF TG_OP='INSERT' OR (to_jsonb(NEW)-ARRAY['status','approved_by','approved_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','approved_by','approved_at','updated_at']) THEN
 NEW.status:='pendiente'; NEW.approved_by:=NULL; NEW.approved_at:=NULL;
 ELSIF (NEW.status,NEW.approved_by,NEW.approved_at) IS DISTINCT FROM (OLD.status,OLD.approved_by,OLD.approved_at) AND NOT decision THEN
 RAISE EXCEPTION 'Apruebe desde la versión actualizada de Novedades' USING ERRCODE='42501';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER zz_novelty_review_guard BEFORE INSERT OR UPDATE ON public.payroll_novelties FOR EACH ROW EXECUTE FUNCTION payroll_private.novelty_review_guard();

CREATE FUNCTION public.payroll_correction_write(p_company_id uuid,p_operations jsonb,p_ticket_id uuid DEFAULT NULL,p_preview boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op jsonb; vals jsonb; oldv jsonb; newv jsonb; doc jsonb; prepared jsonb:='[]'; scopes jsonb:='[]'; output jsonb:='[]';
 m text; a text; tbl text; rid uuid; e uuid; d date; center uuid; needs boolean:=false; candidates jsonb; t public.payroll_correction_tickets;
 assignment public.employee_shift_assignments; novelty public.payroll_novelties; review public.schedule_day_reviews; snap jsonb; k text;
BEGIN
 IF auth.uid() IS NULL OR p_company_id IS NULL OR p_operations IS NULL OR jsonb_typeof(p_operations)<>'array' OR jsonb_array_length(p_operations) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Lote inválido (1 a 2000 registros)' USING ERRCODE='22023'; END IF;
 PERFORM payroll_private.review_lock();
 PERFORM payroll_private.lock_center(p_company_id,NULL);
 -- Same lock order as cut application, before any record is changed.
 FOR center IN SELECT id FROM public.operation_centers WHERE company_id=p_company_id ORDER BY id LOOP PERFORM payroll_private.lock_center(p_company_id,center); END LOOP;
 FOR op IN SELECT value FROM jsonb_array_elements(p_operations) LOOP
 m:=op->>'module'; a:=op->>'action'; vals:=coalesce(op->'values','{}'); oldv:=NULL; newv:=NULL; rid:=(op->>'id')::uuid;
 IF m NOT IN('jornadas','novedades') OR m IS NULL OR a IS NULL OR a NOT IN('create','update','delete','upsert','approve') THEN RAISE EXCEPTION 'Operación inválida' USING ERRCODE='22023'; END IF;
 IF m='jornadas' AND a='approve' THEN
 e:=(vals->>'employee_id')::uuid; d:=(vals->>'work_date')::date;
 snap:=payroll_private.day_snapshot(p_company_id,e,d);
 IF snap IS NULL THEN RAISE EXCEPTION 'No hay programación para aprobar en %',d USING ERRCODE='22023'; END IF;
 IF NOT (vals ? 'snapshot') OR vals->'snapshot' IS DISTINCT FROM snap THEN RAISE EXCEPTION 'La programación cambió. Actualice y revise nuevamente.' USING ERRCODE='40001'; END IF;
 center:=(snap->>'operation_center_id')::uuid;
 SELECT * INTO review FROM public.schedule_day_reviews WHERE company_id=p_company_id AND employee_id=e AND work_date=d;
 IF FOUND THEN oldv:=to_jsonb(review); END IF;
 IF vals->>'status' NOT IN('approved','rejected') OR vals->>'status' IS NULL OR (vals->>'status'='rejected' AND length(btrim(coalesce(vals->>'reason','')))<5) THEN RAISE EXCEPTION 'Indique decisión y motivo de rechazo' USING ERRCODE='22023'; END IF;
 newv:=jsonb_build_object('employee_id',e,'operation_center_id',center,'work_date',d,'company_id',p_company_id);
 ELSE
 tbl:=CASE m WHEN 'jornadas' THEN 'employee_shift_assignments' ELSE 'payroll_novelties' END;
 IF a='upsert' THEN
 IF m<>'jornadas' THEN RAISE EXCEPTION 'Upsert no permitido' USING ERRCODE='22023'; END IF;
 SELECT to_jsonb(x) INTO oldv FROM public.employee_shift_assignments x WHERE x.company_id=p_company_id AND x.employee_id=(vals->>'employee_id')::uuid AND x.assignment_date=(vals->>'assignment_date')::date;
 a:=CASE WHEN oldv IS NULL THEN 'create' ELSE 'update' END; rid:=(oldv->>'id')::uuid;
 ELSIF a<>'create' THEN
 EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE x.id=$1 AND x.company_id=$2',tbl) INTO oldv USING rid,p_company_id;
 IF oldv IS NULL THEN RAISE EXCEPTION 'Registro inexistente o de otra empresa' USING ERRCODE='42501'; END IF;
 END IF;
 IF a='create' THEN
 rid:=coalesce(rid,gen_random_uuid());
 EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE x.id=$1',tbl) INTO doc USING rid;
 IF doc IS NOT NULL THEN RAISE EXCEPTION 'El registro ya existe' USING ERRCODE='40001'; END IF;
 END IF;
 IF a='approve' THEN
 IF vals->>'status' NOT IN('aprobada','rechazada') OR vals->>'status' IS NULL THEN RAISE EXCEPTION 'Decisión inválida' USING ERRCODE='22023'; END IF;
 vals:=jsonb_build_object('status',vals->>'status');
 ELSE
 FOR k IN SELECT jsonb_object_keys(vals) LOOP
 IF k<>ALL(CASE WHEN m='jornadas' THEN ARRAY['employee_id','shift_id','assignment_date','source','notes'] ELSE ARRAY['employee_id','novelty_date','novelty_type','hours','notes','source','start_time','end_time','reason_id'] END) THEN RAISE EXCEPTION 'Campo no editable: %',k USING ERRCODE='22023'; END IF;
 END LOOP;
 END IF;
 newv:=coalesce(oldv,'{}')||vals||jsonb_build_object('id',rid,'company_id',p_company_id);
 IF a='create' THEN newv:=newv||jsonb_build_object('created_by',auth.uid()); END IF;
 e:=(newv->>'employee_id')::uuid;
 d:=(newv->>CASE m WHEN 'jornadas' THEN 'assignment_date' ELSE 'novelty_date' END)::date;
 center:=CASE WHEN oldv IS NULL OR oldv->>'employee_id' IS DISTINCT FROM newv->>'employee_id' THEN payroll_private.employee_center(p_company_id,e,NULL,d) ELSE (oldv->>'operation_center_id')::uuid END;
 IF oldv IS NOT NULL AND (oldv->>CASE m WHEN 'jornadas' THEN 'assignment_date' ELSE 'novelty_date' END)::date IS DISTINCT FROM d
 AND center IS DISTINCT FROM payroll_private.employee_center(p_company_id,e,NULL,d)
 THEN RAISE EXCEPTION 'La nueva fecha corresponde a otro centro histórico' USING ERRCODE='42501'; END IF;
 newv:=newv||jsonb_build_object('operation_center_id',center);
 END IF;
 IF op ? 'expected' AND op->'expected' IS DISTINCT FROM coalesce(oldv,'null'::jsonb) THEN RAISE EXCEPTION 'El registro cambió. Actualice antes de guardar.' USING ERRCODE='40001'; END IF;
 IF NOT payroll_private.can(p_company_id,m,a) THEN RAISE EXCEPTION 'Sin permiso para % en %',a,m USING ERRCODE='42501'; END IF;
 FOR doc IN SELECT value FROM jsonb_array_elements(jsonb_build_array(oldv,newv)) WHERE value<>'null'::jsonb LOOP
 e:=(doc->>'employee_id')::uuid; center:=(doc->>'operation_center_id')::uuid;
 d:=(doc->>CASE WHEN m='jornadas' AND a='approve' THEN 'work_date' WHEN m='jornadas' THEN 'assignment_date' ELSE 'novelty_date' END)::date;
 IF center IS NULL OR d IS NULL OR NOT public.check_center_access(p_company_id,center)
 OR NOT EXISTS(SELECT 1 FROM public.employees_v2 WHERE id=e AND company_id=p_company_id)
 THEN RAISE EXCEPTION 'Empleado, fecha o centro histórico no autorizado' USING ERRCODE='42501'; END IF;
 scopes:=scopes||jsonb_build_array(jsonb_build_object('employee',e,'center',center,'date',d,'module',m,'action',a));
 IF d<=payroll_private.effective(p_company_id,center) THEN needs:=true; END IF;
 END LOOP;
 prepared:=prepared||jsonb_build_array(op||jsonb_build_object('action',a,'id',rid,'values',vals,'expected',oldv,'document',newv));
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(ticket) ORDER BY ticket.expires_at,ticket.id),'[]') INTO candidates FROM public.payroll_correction_tickets ticket
 WHERE ticket.company_id=p_company_id AND ticket.status='active' AND NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(scopes) scope WHERE NOT payroll_private.ticket_allows(ticket,p_company_id,(scope->>'center')::uuid,(scope->>'employee')::uuid,(scope->>'date')::date,scope->>'module',scope->>'action'));
 IF p_preview THEN RETURN jsonb_build_object('requires_ticket',needs,'tickets',candidates,'operations',prepared); END IF;
 IF p_ticket_id IS NOT NULL THEN
 SELECT * INTO t FROM public.payroll_correction_tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(candidates) candidate WHERE candidate->>'id'=p_ticket_id::text) THEN RAISE EXCEPTION 'Ticket vencido, revocado o fuera del alcance autorizado' USING ERRCODE='42501'; END IF;
 ELSIF needs THEN RAISE EXCEPTION 'Seleccione un ticket vigente para corregir las fechas cerradas' USING ERRCODE='PCC01'; END IF;
 FOR op IN SELECT value FROM jsonb_array_elements(prepared) LOOP
 m:=op->>'module'; a:=op->>'action'; rid:=(op->>'id')::uuid; newv:=op->'document'; vals:=op->'values';
 e:=(newv->>'employee_id')::uuid; center:=(newv->>'operation_center_id')::uuid;
 IF p_ticket_id IS NOT NULL AND clock_timestamp()>=t.expires_at THEN RAISE EXCEPTION 'El ticket venció antes de guardar' USING ERRCODE='42501'; END IF;
 IF m='jornadas' AND a='approve' THEN
 d:=(vals->>'work_date')::date;
 INSERT INTO public.schedule_day_reviews(company_id,employee_id,work_date,operation_center_id,status,snapshot,reviewed_by,reviewed_by_name,reviewed_at,reason,ticket_id)
 VALUES(p_company_id,e,d,center,vals->>'status',vals->'snapshot',auth.uid(),coalesce((SELECT coalesce(display_name,full_name) FROM public.user_profiles WHERE id=auth.uid()),'Usuario'),clock_timestamp(),vals->>'reason',p_ticket_id)
 ON CONFLICT(company_id,employee_id,work_date) DO UPDATE SET operation_center_id=excluded.operation_center_id,status=excluded.status,snapshot=excluded.snapshot,reviewed_by=excluded.reviewed_by,reviewed_by_name=excluded.reviewed_by_name,reviewed_at=excluded.reviewed_at,reason=excluded.reason,ticket_id=excluded.ticket_id;
 PERFORM payroll_private.correction_event(p_company_id,center,e,p_ticket_id,m,vals->>'status',NULL,d,op->'expected',vals,vals->>'reason');
 output:=output||jsonb_build_array(vals);
 ELSE
 tbl:=CASE m WHEN 'jornadas' THEN 'employee_shift_assignments' ELSE 'payroll_novelties' END;
 INSERT INTO payroll_private.correction_context VALUES(txid_current(),rid,tbl,a,p_ticket_id);
 IF a='delete' THEN
 EXECUTE format('DELETE FROM public.%I WHERE id=$1 AND company_id=$2',tbl) USING rid,p_company_id;
 ELSIF m='jornadas' THEN
 assignment:=jsonb_populate_record(NULL::public.employee_shift_assignments,newv);
 IF NOT EXISTS(SELECT 1 FROM public.shifts WHERE id=assignment.shift_id AND company_id=p_company_id) THEN RAISE EXCEPTION 'Turno de otra empresa' USING ERRCODE='42501'; END IF;
 IF a='create' THEN
 INSERT INTO public.employee_shift_assignments(id,company_id,employee_id,shift_id,assignment_date,source,notes,created_by)
 VALUES(rid,p_company_id,e,assignment.shift_id,assignment.assignment_date,coalesce(assignment.source,'manual'),assignment.notes,auth.uid());
 ELSE
 UPDATE public.employee_shift_assignments SET employee_id=e,shift_id=assignment.shift_id,assignment_date=assignment.assignment_date,source=assignment.source,notes=assignment.notes WHERE id=rid AND company_id=p_company_id;
 END IF;
 ELSE
 novelty:=jsonb_populate_record(NULL::public.payroll_novelties,newv);
 IF novelty.reason_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.novelty_reasons WHERE id=novelty.reason_id AND company_id=p_company_id) THEN RAISE EXCEPTION 'Motivo de otra empresa' USING ERRCODE='42501'; END IF;
 IF a='approve' THEN
 UPDATE public.payroll_novelties SET status=novelty.status,approved_by=auth.uid(),approved_at=clock_timestamp() WHERE id=rid AND company_id=p_company_id;
 ELSIF a='create' THEN
 INSERT INTO public.payroll_novelties(id,company_id,employee_id,novelty_date,novelty_type,hours,notes,source,start_time,end_time,reason_id,created_by)
 VALUES(rid,p_company_id,e,novelty.novelty_date,novelty.novelty_type,coalesce(novelty.hours,0),novelty.notes,coalesce(novelty.source,'manual'),novelty.start_time,novelty.end_time,novelty.reason_id,auth.uid());
 ELSE
 UPDATE public.payroll_novelties SET employee_id=e,novelty_date=novelty.novelty_date,novelty_type=novelty.novelty_type,hours=novelty.hours,notes=novelty.notes,source=novelty.source,start_time=novelty.start_time,end_time=novelty.end_time,reason_id=novelty.reason_id WHERE id=rid AND company_id=p_company_id;
 END IF;
 END IF;
 IF a<>'delete' THEN EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE id=$1',tbl) INTO doc USING rid; ELSE doc:=op->'expected'; END IF;
 output:=output||jsonb_build_array(doc);
 DELETE FROM payroll_private.correction_context WHERE tx=txid_current() AND record_id=rid AND table_name=tbl;
 END IF;
 END LOOP;
 IF p_ticket_id IS NOT NULL AND clock_timestamp()>=t.expires_at THEN RAISE EXCEPTION 'El ticket venció antes de terminar el lote' USING ERRCODE='42501'; END IF;
 RETURN output;
END $$;

CREATE FUNCTION payroll_private.content_review_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 IF oldv IS NOT NULL THEN oldv:=oldv||jsonb_build_object('programacion',(SELECT jsonb_build_object('nombre',name,'entrada',start_time,'salida',end_time,'descanso_minutos',break_minutes,'dia_descanso',is_rest_day) FROM public.shifts WHERE id=(oldv->>'shift_id')::uuid)); END IF;
 IF newv IS NOT NULL THEN newv:=newv||jsonb_build_object('programacion',(SELECT jsonb_build_object('nombre',name,'entrada',start_time,'salida',end_time,'descanso_minutos',break_minutes,'dia_descanso',is_rest_day) FROM public.shifts WHERE id=(newv->>'shift_id')::uuid)); END IF;
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
 -- Updating a legacy, never-reviewed assignment must become pending too.
 INSERT INTO public.schedule_day_reviews(company_id,employee_id,work_date,operation_center_id,status,snapshot,ticket_id)
 VALUES(c,e,d,center,'pending',payroll_private.day_snapshot(c,e,d),ctx.ticket_id)
 ON CONFLICT(company_id,employee_id,work_date) DO NOTHING;
 END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;

-- New endpoints are authenticated APIs; helper functions are never callable by
-- clients (the RLS predicate is the only exception).
DO $$ DECLARE fn record; BEGIN
 FOR fn IN SELECT p.oid::regprocedure signature,n.nspname schema_name,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='payroll_private' AND p.proname IN('correction_read','review_lock','review_statement_lock','correction_event','ticket_allows','day_snapshot','require_correction_open','novelty_review_guard','content_review_audit'))
 OR (n.nspname='public' AND p.proname IN('payroll_ticket_request','payroll_ticket_transition','payroll_schedule_days','payroll_schedule_cut_summary','payroll_correction_write')) LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',fn.signature);
 IF fn.schema_name='public' OR fn.proname='correction_read' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',fn.signature); END IF;
 END LOOP;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['employee_shift_assignments','employee_time_config','work_schedules','shifts','payroll_novelties'] LOOP
 EXECUTE format('CREATE TRIGGER zz_content_review_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION payroll_private.content_review_audit()',t);
 END LOOP;
END $$;
