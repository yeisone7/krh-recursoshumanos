-- Public employee attestations are deliberately separate from payroll approvals.
CREATE SCHEMA daily_report_private;
REVOKE ALL ON SCHEMA daily_report_private FROM PUBLIC, anon, authenticated;

INSERT INTO public.modules(code,name,parent_id,sort_order,icon)
SELECT 'reporte_diario','Reporte Diario',parent_id,sort_order+1,'FileCheck2'
FROM public.modules WHERE code='jornadas';
INSERT INTO public.permissions(module_id,action,description)
SELECT m.id,v.action::public.permission_action,v.label FROM public.modules m CROSS JOIN (VALUES
 ('view','Consultar reportes diarios'),('create','Publicar reportes diarios'),
 ('update','Administrar enlaces, formato y supervisor'),('approve','Aprobar como supervisor'),
 ('export','Exportar reportes diarios firmados')) v(action,label) WHERE m.code='reporte_diario';

CREATE TABLE daily_report_private.settings (
 company_id uuid PRIMARY KEY REFERENCES public.companies(id), format_code text NOT NULL DEFAULT 'GH FO 121',
 format_version text NOT NULL DEFAULT '01', CHECK(length(format_code) BETWEEN 1 AND 40), CHECK(length(format_version) BETWEEN 1 AND 15)
);
CREATE TABLE daily_report_private.publications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id),
 center_id uuid NOT NULL REFERENCES public.operation_centers(id), start_date date NOT NULL, end_date date NOT NULL,
 supervisor_id uuid NOT NULL REFERENCES auth.users(id), token text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false,
 created_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(end_date >= start_date AND end_date-start_date <= 366)
);
CREATE INDEX daily_publications_scope ON daily_report_private.publications(company_id,center_id,start_date,end_date);
CREATE TABLE daily_report_private.sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL UNIQUE,
 publication_id uuid NOT NULL REFERENCES daily_report_private.publications(id), employee_id uuid NOT NULL REFERENCES public.employees_v2(id),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE daily_report_private.attempts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, company_id uuid NOT NULL, identity_hash text NOT NULL,
 ip_hash text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX daily_attempts_identity ON daily_report_private.attempts(company_id,identity_hash,occurred_at);
CREATE INDEX daily_attempts_ip ON daily_report_private.attempts(ip_hash,occurred_at);
CREATE TABLE daily_report_private.signatures (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES public.companies(id),
 employee_id uuid REFERENCES public.employees_v2(id), user_id uuid REFERENCES auth.users(id),
 path text NOT NULL UNIQUE, reusable boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((employee_id IS NULL) <> (user_id IS NULL))
);
CREATE UNIQUE INDEX daily_saved_signature ON daily_report_private.signatures(company_id,employee_id) WHERE reusable;
CREATE TABLE daily_report_private.decisions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, day_key text NOT NULL, publication_id uuid NOT NULL REFERENCES daily_report_private.publications(id),
 company_id uuid NOT NULL REFERENCES public.companies(id), center_id uuid NOT NULL REFERENCES public.operation_centers(id),
 employee_id uuid NOT NULL REFERENCES public.employees_v2(id), cycle_id uuid NOT NULL REFERENCES public.employee_employment_cycles(id), work_date date NOT NULL,
 action text NOT NULL CHECK(action IN ('signed','disagreed','approved','returned')),
 snapshot jsonb NOT NULL, services jsonb NOT NULL, reason text,
 employee_signature uuid REFERENCES daily_report_private.signatures(id), supervisor_signature uuid REFERENCES daily_report_private.signatures(id),
 employee_signed_at timestamptz, supervisor_signed_at timestamptz, supervisor_name text,
 actor_id uuid NOT NULL, actor_name text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX daily_decisions_key ON daily_report_private.decisions(day_key,id DESC);
CREATE INDEX daily_decisions_scope ON daily_report_private.decisions(company_id,center_id,employee_id,work_date);
CREATE TABLE daily_report_private.requests (
 actor_id uuid NOT NULL, request_id uuid NOT NULL, payload_hash text NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY(actor_id,request_id)
);
CREATE TABLE daily_report_private.audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, publication_id uuid REFERENCES daily_report_private.publications(id),
 company_id uuid NOT NULL, action text NOT NULL, actor_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(), details jsonb NOT NULL
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['settings','publications','sessions','attempts','signatures','decisions','requests','audit'] LOOP
 EXECUTE format('ALTER TABLE daily_report_private.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON daily_report_private.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('daily-report-signatures','daily-report-signatures',false,524288,ARRAY['image/png']);
-- No client storage policies: the authenticated gateway authorizes every upload/read.

CREATE FUNCTION daily_report_private.can_user(c uuid,u uuid,center uuid,a text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(EXISTS(SELECT 1 FROM auth.users WHERE id=u AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<now()))
 AND ((u=auth.uid() AND public.is_super_admin()) OR (
 EXISTS(SELECT 1 FROM public.user_company_assignments WHERE user_id=u AND company_id=c)
 AND (public.has_role(u,'admin') OR NOT public.has_company_center_assignments(u,c)
 OR EXISTS(SELECT 1 FROM public.user_center_assignments WHERE user_id=u AND operation_center_id=center))
 AND (public.has_role(u,'admin') OR EXISTS(SELECT 1 FROM public.user_custom_roles ur JOIN public.custom_roles r ON r.id=ur.role_id
 WHERE ur.user_id=u AND r.company_id=c AND r.is_active AND (r.is_system OR EXISTS(
 SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id=rp.permission_id JOIN public.modules m ON m.id=p.module_id
 WHERE rp.role_id=r.id AND m.code='reporte_diario' AND m.is_active AND p.action::text=a)))))),false)
$$;
CREATE FUNCTION daily_report_private.active_employee(c uuid,e uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.employees_v2 x WHERE x.id=e AND x.company_id=c AND x.is_active AND x.status='active'
 AND EXISTS(SELECT 1 FROM public.employee_employment_cycles ec WHERE ec.employee_id=e AND ec.company_id=c AND ec.status='active'
 AND ec.start_date<=(now() AT TIME ZONE 'America/Bogota')::date AND (ec.end_date IS NULL OR ec.end_date>=(now() AT TIME ZONE 'America/Bogota')::date)))
$$;
CREATE FUNCTION daily_report_private.publication_json(p daily_report_private.publications) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT (to_jsonb(p)-'token') || jsonb_build_object('center_name',o.name,'supervisor_name',coalesce(u.display_name,u.full_name),
 'company_name',c.name,'logo_url',coalesce(c.horizontal_logo_url,c.logo_url),'format_code',coalesce(s.format_code,'GH FO 121'),
 'format_version',coalesce(s.format_version,'01'))
 FROM public.operation_centers o JOIN public.companies c ON c.id=p.company_id LEFT JOIN public.user_profiles u ON u.id=p.supervisor_id
 LEFT JOIN daily_report_private.settings s ON s.company_id=c.id WHERE o.id=p.center_id
$$;

CREATE FUNCTION daily_report_private.hour_code(t text,special boolean) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN t IN('hedo','hedf','extra_diurna') THEN CASE WHEN special THEN 'HEDF' ELSE 'HED' END
 WHEN t IN('heno','henf','extra_nocturna') THEN CASE WHEN special THEN 'HENF' ELSE 'HEN' END
 WHEN t IN('rn','rnf','recargo_nocturno') THEN CASE WHEN special THEN 'RNF' ELSE 'RN' END ELSE t END
$$;

-- Build only the employee-visible payroll facts. Never expose diagnoses, salaries or birth dates.
CREATE FUNCTION daily_report_private.source(p daily_report_private.publications,e uuid,d date) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE cy uuid; center uuid; s jsonb; reviewed boolean; reviewed_at timestamptz; meta jsonb; rest text; special boolean; extras jsonb; novelties jsonb; absences jsonb; ready boolean;
BEGIN
 IF d NOT BETWEEN p.start_date AND p.end_date THEN RETURN NULL; END IF;
 SELECT id INTO cy FROM public.employee_employment_cycles WHERE employee_id=e AND company_id=p.company_id
 AND start_date<=d AND (end_date IS NULL OR end_date>=d) ORDER BY start_date DESC,id LIMIT 1;
 IF cy IS NULL OR (SELECT count(*) FROM public.employee_employment_cycles WHERE employee_id=e AND company_id=p.company_id
 AND start_date<=d AND (end_date IS NULL OR end_date>=d))<>1 THEN RETURN NULL; END IF;
 s:=payroll_private.day_snapshot(p.company_id,e,d);
 center:=coalesce((s->>'operation_center_id')::uuid,payroll_private.employee_center(p.company_id,e,cy,d));
 IF center IS DISTINCT FROM p.center_id THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('id',x.id,'name',concat_ws(' ',x.first_name,x.middle_name,x.last_name,x.second_last_name),
 'document',x.document_number,'document_type',x.document_type,'gender',x.gender,
 'age',CASE WHEN x.birth_date<=d THEN extract(year FROM age(d,x.birth_date)) END,
 'position',coalesce(w.position_name,pos.name,'')) INTO meta FROM public.employees_v2 x
 LEFT JOIN LATERAL(SELECT wi.* FROM public.employee_work_info wi WHERE wi.employee_id=e AND wi.company_id=p.company_id AND wi.employment_cycle_id=cy
 AND coalesce(wi.valid_from,wi.hire_date,'-infinity'::date)<=d AND coalesce(wi.valid_to,wi.termination_date,'infinity'::date)>=d
 ORDER BY wi.valid_from DESC NULLS LAST,wi.id LIMIT 1) w ON true LEFT JOIN public.positions pos ON pos.id=w.position_id WHERE x.id=e AND x.company_id=p.company_id;
 SELECT coalesce(r.status='approved' AND r.snapshot=s,false),r.reviewed_at INTO reviewed,reviewed_at FROM public.schedule_day_reviews r
 WHERE r.company_id=p.company_id AND r.employee_id=e AND r.work_date=d;
 SELECT lower(es.rest_day) INTO rest FROM public.employee_schedule es WHERE es.employee_id=e AND es.company_id=p.company_id
 AND es.employment_cycle_id=cy AND coalesce(es.valid_from,'-infinity'::date)<=d AND coalesce(es.valid_to,'infinity'::date)>=d ORDER BY es.valid_from DESC,es.id LIMIT 1;
 special:=EXISTS(SELECT 1 FROM public.company_holidays h WHERE h.company_id=p.company_id AND h.is_active AND h.holiday_date=d)
 OR extract(dow FROM d)::int=CASE translate(coalesce(nullif(btrim(rest),''),'domingo'),'áéíóú','aeiou') WHEN 'sin asignar' THEN 0 WHEN 'domingo' THEN 0 WHEN 'lunes' THEN 1 WHEN 'martes' THEN 2 WHEN 'miercoles' THEN 3 WHEN 'jueves' THEN 4 WHEN 'viernes' THEN 5 WHEN 'sabado' THEN 6 ELSE -1 END;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'code',daily_report_private.hour_code(o.overtime_type::text,special),
 'hours',o.total_hours,'label',o.overtime_type,'source_version',o.updated_at,'valid',o.total_hours>0 AND o.overtime_type::text IN('extra_diurna','extra_nocturna','recargo_nocturno')) ORDER BY o.id),'[]') INTO extras
 FROM public.overtime_records o WHERE o.company_id=p.company_id AND o.employee_id=e AND o.work_date=d AND o.status::text IN('aprobado','pagado');
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',n.id,'code',daily_report_private.hour_code(coalesce(pc.system_type,n.novelty_type),special),
 'hours',n.hours,'quantity',coalesce(n.quantity,n.hours),'unit',coalesce(n.quantity_unit,'hours'),'label',coalesce(pc.name,n.novelty_type),
 'source_version',n.updated_at,'valid',n.hours>=0 AND coalesce(n.quantity,n.hours)>0) ORDER BY n.id),'[]') INTO novelties
 FROM public.payroll_novelties n LEFT JOIN public.payroll_concepts pc ON pc.id=n.concept_id
 WHERE n.company_id=p.company_id AND n.employee_id=e AND n.novelty_date=d AND n.status='aprobada' AND (n.operation_center_id IS NULL OR n.operation_center_id=p.center_id);
 SELECT coalesce(jsonb_agg(a.item ORDER BY a.item->>'id'),'[]') INTO absences FROM (
 SELECT jsonb_build_object('id',i.id,'label','Incapacidad','start_date',i.start_date,'end_date',i.end_date,'source_version',i.updated_at) item
 FROM public.employee_incapacities i WHERE i.company_id=p.company_id AND i.employee_id=e AND d BETWEEN i.start_date AND i.end_date
 UNION ALL SELECT jsonb_build_object('id',v.id,'label','Vacaciones','start_date',v.start_date,'end_date',v.end_date,'source_version',v.updated_at)
 FROM public.vacation_requests v WHERE v.company_id=p.company_id AND v.employee_id=e AND v.status::text IN('aprobada','aprobado','en_curso','completado','interrumpido')
 AND v.request_type::text NOT IN('compensacion','acumulacion') AND (d BETWEEN v.start_date AND least(v.end_date,coalesce(v.interruption_date-1,v.end_date)) OR d BETWEEN v.resume_start_date AND v.resume_end_date)
 UNION ALL SELECT jsonb_build_object('id',l.id,'label','Permiso: '||l.leave_type,'duration',l.duration_type,'hours',l.total_hours,'start_time',l.start_time,'end_time',l.end_time,'source_version',l.updated_at)
 FROM public.leave_requests l WHERE l.company_id=p.company_id AND l.employee_id=e AND l.status::text IN('aprobado','aprobada') AND d BETWEEN l.start_date AND l.end_date) a;
 ready:=coalesce(reviewed,false) AND s IS NOT NULL AND d<=(now() AT TIME ZONE 'America/Bogota')::date
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(extras||novelties) x WHERE x->>'valid'='false');
 RETURN jsonb_build_object('employee',meta,'cycle_id',cy,'center_id',center,'date',d,'schedule',s,'extras',extras,'novelties',novelties,'absences',absences,
 'ready',ready,'internally_approved',coalesce(reviewed,false),'reviewed_at',reviewed_at,'special_day',special);
END $$;

CREATE FUNCTION daily_report_private.row_data(p daily_report_private.publications,e uuid,d date) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE s jsonb; k text; v daily_report_private.decisions; st text; evidence jsonb;
BEGIN
 s:=daily_report_private.source(p,e,d);
 IF s IS NULL THEN
 SELECT * INTO v FROM daily_report_private.decisions WHERE company_id=p.company_id AND center_id=p.center_id AND employee_id=e AND work_date=d AND d BETWEEN p.start_date AND p.end_date ORDER BY id DESC LIMIT 1;
 IF v.id IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('key',v.day_key,'employee_id',e,'date',d,'snapshot',v.snapshot,'version',md5('unavailable:'||v.id::text),
 'status','stale','decision_id',v.id,'services',v.services,'reason','La jornada cambió de centro o vinculación. Consulte la versión anterior en el historial.','evidence',NULL,'can_sign',false);
 END IF;
 k:=p.company_id::text||':'||e::text||':'||(s->>'cycle_id')||':'||p.center_id::text||':'||d::text;
 SELECT * INTO v FROM daily_report_private.decisions WHERE day_key=k ORDER BY id DESC LIMIT 1;
 st:=CASE WHEN v.id IS NOT NULL AND v.snapshot IS DISTINCT FROM s THEN 'stale'
 WHEN NOT (s->>'ready')::boolean THEN 'internal_pending'
 ELSE coalesce(v.action,'pending') END;
 IF v.id IS NOT NULL AND v.snapshot=s THEN
 evidence:=jsonb_build_object('employee_signature_path',(SELECT path FROM daily_report_private.signatures WHERE id=v.employee_signature),
 'supervisor_signature_path',(SELECT path FROM daily_report_private.signatures WHERE id=v.supervisor_signature),
 'employee_signed_at',v.employee_signed_at,'supervisor_signed_at',v.supervisor_signed_at,'supervisor_name',v.supervisor_name);
 END IF;
 RETURN jsonb_build_object('key',k,'employee_id',e,'date',d,'snapshot',s,'version',md5(s::text||coalesce(v.id::text,'')),
 'status',st,'decision_id',v.id,'services',coalesce(v.services,'{"breakfast":false,"lunch":false,"meal":false,"dinner":false,"transport":false}'::jsonb),
 'reason',v.reason,'evidence',evidence,'can_sign',(s->>'ready')::boolean AND st IN('pending','stale','disagreed','returned'));
END $$;

CREATE FUNCTION daily_report_private.read_rows(p daily_report_private.publications,e uuid DEFAULT NULL,offset_n int DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE emp record; d date; r jsonb; rows jsonb:='[]'; count_n int:=0;
BEGIN
 FOR emp IN SELECT x.id FROM public.employees_v2 x WHERE x.company_id=p.company_id AND (e IS NULL OR x.id=e)
 AND (EXISTS(SELECT 1 FROM public.employee_work_info w WHERE w.employee_id=x.id AND w.company_id=p.company_id AND w.operation_center_id=p.center_id
 AND coalesce(w.valid_from,w.hire_date,'-infinity'::date)<=p.end_date AND coalesce(w.valid_to,w.termination_date,'infinity'::date)>=p.start_date)
 OR EXISTS(SELECT 1 FROM public.employee_shift_assignments a WHERE a.employee_id=x.id AND a.company_id=p.company_id AND a.operation_center_id=p.center_id AND a.assignment_date BETWEEN p.start_date AND p.end_date)
 OR EXISTS(SELECT 1 FROM daily_report_private.decisions v WHERE v.employee_id=x.id AND v.company_id=p.company_id AND v.center_id=p.center_id AND v.work_date BETWEEN p.start_date AND p.end_date))
 ORDER BY x.last_name,x.first_name,x.id LIMIT 25 OFFSET greatest(0,offset_n) LOOP
 count_n:=count_n+1;
 FOR d IN SELECT generate_series(p.start_date,p.end_date,'1 day')::date LOOP
 r:=daily_report_private.row_data(p,emp.id,d); IF r IS NOT NULL THEN rows:=rows||jsonb_build_array(r); END IF;
 END LOOP; END LOOP;
 RETURN jsonb_build_object('publication',daily_report_private.publication_json(p),'rows',rows,'has_more',e IS NULL AND count_n=25);
END $$;

CREATE FUNCTION daily_report_private.decide(p daily_report_private.publications,e uuid,actor uuid,a text,b jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; r jsonb; prev daily_report_private.decisions; sig uuid; services jsonb; ids jsonb:='[]'; n bigint; req uuid; old daily_report_private.requests; who text; t timestamptz; k text;
BEGIN
 PERFORM payroll_private.review_lock();
 req:=(b->>'request_id')::uuid; IF req IS NULL THEN RAISE EXCEPTION 'Falta identificador de solicitud'; END IF;
 SELECT * INTO old FROM daily_report_private.requests WHERE actor_id=actor AND request_id=req;
 IF FOUND THEN IF old.payload_hash<>md5(b::text||a||p.id::text) THEN RAISE EXCEPTION 'Solicitud duplicada con contenido distinto'; END IF; RETURN old.result; END IF;
 IF a NOT IN('signed','disagreed','approved','returned') OR jsonb_typeof(b->'days') IS DISTINCT FROM 'array' OR jsonb_array_length(b->'days') NOT BETWEEN 1 AND 367 THEN RAISE EXCEPTION 'Seleccione entre 1 y 367 días'; END IF;
 IF a IN('signed','approved') THEN
 sig:=(b->>'signature_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM daily_report_private.signatures WHERE id=sig AND company_id=p.company_id AND
 ((e IS NOT NULL AND employee_id=e) OR (e IS NULL AND user_id=actor))) THEN RAISE EXCEPTION 'Firma no autorizada' USING ERRCODE='42501'; END IF;
 IF b->>'consent' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Confirme expresamente la conformidad'; END IF;
 END IF;
 IF a IN('disagreed','returned') AND length(btrim(coalesce(b->>'reason',''))) NOT BETWEEN 5 AND 2000 THEN RAISE EXCEPTION 'Escriba un motivo de entre 5 y 2000 caracteres'; END IF;
 IF (SELECT count(DISTINCT (x->>'employee_id',x->>'date')) FROM jsonb_array_elements(b->'days') x)<>jsonb_array_length(b->'days') THEN RAISE EXCEPTION 'No repita días en la selección'; END IF;
 IF e IS NOT NULL THEN SELECT concat_ws(' ',first_name,middle_name,last_name,second_last_name) INTO who FROM public.employees_v2 WHERE id=e;
 ELSE SELECT coalesce(display_name,full_name,'Supervisor') INTO who FROM public.user_profiles WHERE id=actor; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(b->'days') ORDER BY value->>'employee_id',value->>'date' LOOP
 IF e IS NOT NULL AND (item->>'employee_id')::uuid IS DISTINCT FROM e THEN RAISE EXCEPTION 'Empleado no autorizado' USING ERRCODE='42501'; END IF;
 r:=daily_report_private.row_data(p,(item->>'employee_id')::uuid,(item->>'date')::date);
 IF r IS NULL OR item->>'version' IS DISTINCT FROM r->>'version' THEN RAISE EXCEPTION 'El reporte cambió. Actualice y revise nuevamente.' USING ERRCODE='40001'; END IF;
 k:=r->>'key'; SELECT * INTO prev FROM daily_report_private.decisions WHERE day_key=k ORDER BY id DESC LIMIT 1;
 IF a IN('signed','disagreed') AND NOT (r->>'can_sign')::boolean THEN RAISE EXCEPTION 'El día no está disponible para validación'; END IF;
 IF a IN('approved','returned') AND r->>'status'<>'signed' THEN RAISE EXCEPTION 'El día requiere una firma vigente del empleado'; END IF;
 t:=clock_timestamp(); services:=coalesce(prev.services,'{}');
 IF a='signed' THEN
 services:=item->'services';
 IF jsonb_typeof(services) IS DISTINCT FROM 'object' OR NOT services ?& ARRAY['breakfast','lunch','meal','dinner','transport']
 OR EXISTS(SELECT 1 FROM jsonb_each(services) f WHERE f.key NOT IN('breakfast','lunch','meal','dinner','transport') OR jsonb_typeof(f.value)<>'boolean') THEN RAISE EXCEPTION 'Confirme los cinco servicios de cada día'; END IF;
 END IF;
 INSERT INTO daily_report_private.decisions(day_key,publication_id,company_id,center_id,employee_id,cycle_id,work_date,action,snapshot,services,reason,
 employee_signature,supervisor_signature,employee_signed_at,supervisor_signed_at,supervisor_name,actor_id,actor_name)
 VALUES(k,p.id,p.company_id,p.center_id,(r->>'employee_id')::uuid,(r->'snapshot'->>'cycle_id')::uuid,(r->>'date')::date,a,r->'snapshot',services,
 CASE WHEN a IN('returned','disagreed') THEN btrim(b->>'reason') END,
 CASE WHEN a='signed' THEN sig WHEN a IN('approved','returned') THEN prev.employee_signature END,
 CASE WHEN a='approved' THEN sig END,
 CASE WHEN a='signed' THEN t WHEN a IN('approved','returned') THEN prev.employee_signed_at END,
 CASE WHEN a='approved' THEN t END,CASE WHEN a='approved' THEN who END,actor,who) RETURNING id INTO n;
 ids:=ids||jsonb_build_array(n);
 END LOOP;
 INSERT INTO daily_report_private.requests VALUES(actor,req,md5(b::text||a||p.id::text),jsonb_build_object('decision_ids',ids));
 RETURN jsonb_build_object('decision_ids',ids);
END $$;

CREATE FUNCTION daily_report_private.history(p daily_report_private.publications,e uuid,d date) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg((to_jsonb(v)-'employee_signature'-'supervisor_signature')||jsonb_build_object('evidence',jsonb_build_object(
 'employee_signature_path',es.path,'supervisor_signature_path',ss.path,'employee_signed_at',v.employee_signed_at,
 'supervisor_signed_at',v.supervisor_signed_at,'supervisor_name',v.supervisor_name)) ORDER BY v.id DESC),'[]')
 FROM daily_report_private.decisions v LEFT JOIN daily_report_private.signatures es ON es.id=v.employee_signature LEFT JOIN daily_report_private.signatures ss ON ss.id=v.supervisor_signature
 WHERE v.company_id=p.company_id AND v.center_id=p.center_id AND v.employee_id=e AND v.work_date=d AND d BETWEEN p.start_date AND p.end_date
$$;

-- Authenticated API: every branch enforces the permission for the operation.
CREATE FUNCTION daily_report_private.admin(p_action text,p_body jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p daily_report_private.publications; c uuid:=(p_body->>'company_id')::uuid; center uuid; sup uuid; a text; token text; result jsonb; old jsonb; sig uuid; affected_ids uuid[];
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501'; END IF;
 IF p_action IN('create','reassign','rotate','revoke','settings','approved','returned') THEN PERFORM payroll_private.review_lock(); END IF;
 IF p_body ? 'publication_id' THEN
 SELECT * INTO p FROM daily_report_private.publications WHERE id=(p_body->>'publication_id')::uuid;
 IF NOT FOUND THEN RAISE EXCEPTION 'Publicación no disponible' USING ERRCODE='42501'; END IF;
 c:=p.company_id; center:=p.center_id;
 ELSE center:=(p_body->>'center_id')::uuid; END IF;
 a:=CASE WHEN p_action='create' THEN 'create' WHEN p_action IN('reassign','rotate','revoke','settings') THEN 'update'
 WHEN p_action IN('approved','returned','register_signature') THEN 'approve' WHEN p_action IN('export','export_history') THEN 'export' ELSE 'view' END;
 IF p_action IN('options','list') THEN
 IF NOT EXISTS(SELECT 1 FROM public.operation_centers o WHERE o.company_id=c AND daily_report_private.can_user(c,auth.uid(),o.id,'view')) THEN RAISE EXCEPTION 'Sin permiso de consulta' USING ERRCODE='42501'; END IF;
 ELSIF NOT daily_report_private.can_user(c,auth.uid(),center,a) THEN RAISE EXCEPTION 'Sin permiso para esta operación' USING ERRCODE='42501'; END IF;
 IF p_action='options' THEN
 RETURN jsonb_build_object('centers',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name) ORDER BY o.name),'[]') FROM public.operation_centers o WHERE o.company_id=c AND o.is_active AND daily_report_private.can_user(c,auth.uid(),o.id,'view')),
 'supervisors',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',coalesce(u.display_name,u.full_name),'center_id',o.id)),'[]')
 FROM public.user_profiles u CROSS JOIN public.operation_centers o WHERE o.company_id=c AND o.is_active AND daily_report_private.can_user(c,auth.uid(),o.id,'view') AND daily_report_private.can_user(c,u.id,o.id,'approve')),
 'settings',coalesce((SELECT to_jsonb(s) FROM daily_report_private.settings s WHERE s.company_id=c),'{"format_code":"GH FO 121","format_version":"01"}'::jsonb));
 ELSIF p_action='list' THEN
 RETURN (SELECT coalesce(jsonb_agg(daily_report_private.publication_json(x) ORDER BY x.created_at DESC),'[]') FROM daily_report_private.publications x WHERE x.company_id=c AND daily_report_private.can_user(c,auth.uid(),x.center_id,'view'));
 ELSIF p_action='settings' THEN
 INSERT INTO daily_report_private.settings VALUES(c,btrim(p_body->>'format_code'),btrim(p_body->>'format_version')) ON CONFLICT(company_id) DO UPDATE SET format_code=excluded.format_code,format_version=excluded.format_version;
 INSERT INTO daily_report_private.audit(company_id,action,actor_id,details) VALUES(c,'settings',auth.uid(),p_body-'company_id'); RETURN '{"success":true}';
 ELSIF p_action='create' THEN
 IF NOT EXISTS(SELECT 1 FROM public.operation_centers WHERE id=center AND company_id=c AND is_active) THEN RAISE EXCEPTION 'Centro inválido'; END IF;
 sup:=(p_body->>'supervisor_id')::uuid;
 IF NOT daily_report_private.can_user(c,sup,center,'approve') THEN RAISE EXCEPTION 'Seleccione un supervisor habilitado con permiso para el centro'; END IF;
 IF (p_body->>'expires_at')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'El vencimiento debe ser futuro'; END IF;
 IF EXISTS(SELECT 1 FROM daily_report_private.publications x WHERE x.company_id=c AND x.center_id=center AND NOT x.revoked
 AND x.end_date>=(p_body->>'start_date')::date AND x.start_date<=(p_body->>'end_date')::date AND x.supervisor_id<>sup) THEN RAISE EXCEPTION 'Los períodos solapados deben tener el mismo supervisor. Reasigne primero las publicaciones existentes.'; END IF;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO daily_report_private.publications(company_id,center_id,start_date,end_date,supervisor_id,token,expires_at,created_by)
 VALUES(c,center,(p_body->>'start_date')::date,(p_body->>'end_date')::date,sup,token,(p_body->>'expires_at')::timestamptz,auth.uid()) RETURNING * INTO p;
 INSERT INTO daily_report_private.audit(publication_id,company_id,action,actor_id,details) VALUES(p.id,c,'create',auth.uid(),daily_report_private.publication_json(p));
 RETURN daily_report_private.publication_json(p)||jsonb_build_object('token',token);
 ELSIF p.id IS NULL THEN RAISE EXCEPTION 'Seleccione una publicación';
 ELSIF p_action IN('rows','export') THEN RETURN daily_report_private.read_rows(p,(p_body->>'employee_id')::uuid,coalesce((p_body->>'offset')::int,0));
 ELSIF p_action IN('history','export_history') THEN RETURN daily_report_private.history(p,(p_body->>'employee_id')::uuid,(p_body->>'date')::date);
 ELSIF p_action='audit' THEN RETURN (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id DESC),'[]') FROM daily_report_private.audit x WHERE x.publication_id=p.id);
 ELSIF p_action='link' THEN
 IF NOT (daily_report_private.can_user(c,auth.uid(),center,'create') OR daily_report_private.can_user(c,auth.uid(),center,'update')) THEN RAISE EXCEPTION 'Sin permiso para compartir' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('token',p.token);
 ELSIF p_action IN('rotate','revoke','reassign') THEN
 old:=daily_report_private.publication_json(p);
 IF p_action='reassign' THEN
 sup:=(p_body->>'supervisor_id')::uuid;
 IF NOT daily_report_private.can_user(c,sup,center,'approve') THEN RAISE EXCEPTION 'Supervisor no habilitado'; END IF;
 -- Reassign all overlapping publications atomically, retaining original decision authors.
 WITH RECURSIVE affected AS (
 SELECT p.id AS id UNION
 SELECT x.id FROM daily_report_private.publications x JOIN daily_report_private.publications previous ON previous.company_id=x.company_id AND previous.center_id=x.center_id
 JOIN affected a ON a.id=previous.id WHERE x.company_id=c AND x.center_id=center AND x.end_date>=previous.start_date AND x.start_date<=previous.end_date)
 SELECT array_agg(id) INTO affected_ids FROM affected;
 INSERT INTO daily_report_private.audit(publication_id,company_id,action,actor_id,details)
 SELECT x.id,c,'reassign',auth.uid(),jsonb_build_object('before',x.supervisor_id,'after',sup) FROM daily_report_private.publications x WHERE x.id=ANY(affected_ids);
 UPDATE daily_report_private.publications SET supervisor_id=sup WHERE id=ANY(affected_ids);
 ELSE
 UPDATE daily_report_private.publications SET revoked=p_action='revoke',token=CASE WHEN p_action='rotate' THEN encode(extensions.gen_random_bytes(32),'hex') ELSE p.token END,
 expires_at=CASE WHEN p_action='rotate' THEN coalesce((p_body->>'expires_at')::timestamptz,clock_timestamp()+interval '30 days') ELSE expires_at END WHERE id=p.id;
 DELETE FROM daily_report_private.sessions WHERE publication_id=p.id;
 INSERT INTO daily_report_private.audit(publication_id,company_id,action,actor_id,details) VALUES(p.id,c,p_action,auth.uid(),old);
 END IF;
 RETURN '{"success":true}';
 ELSIF p_action IN('approved','returned','register_signature') THEN
 IF p.supervisor_id<>auth.uid() THEN RAISE EXCEPTION 'Solo el supervisor asignado puede aprobar' USING ERRCODE='42501'; END IF;
 IF p_action='register_signature' THEN
 sig:=(p_body->>'signature_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='daily-report-signatures' AND name=c::text||'/'||sig::text||'.png') THEN RAISE EXCEPTION 'Primero cargue una firma válida'; END IF;
 INSERT INTO daily_report_private.signatures(id,company_id,user_id,path) VALUES(sig,c,auth.uid(),c::text||'/'||sig::text||'.png'); RETURN jsonb_build_object('signature_id',sig);
 END IF;
 RETURN daily_report_private.decide(p,NULL,auth.uid(),p_action,p_body);
 END IF;
 RAISE EXCEPTION 'Operación no válida';
END $$;

-- Gateway-only API. The public browser has NO direct execute grant.
CREATE FUNCTION public.daily_report_public(p_action text,p_body jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p daily_report_private.publications; s daily_report_private.sessions; e uuid; raw_token text; v_identity_hash text; result jsonb; sig uuid;
BEGIN
 IF p_action IN('signed','disagreed','register_signature','forget_signature') THEN PERFORM payroll_private.review_lock(); END IF;
 IF p_action IN('context','identify') THEN
 SELECT * INTO p FROM daily_report_private.publications WHERE token=p_body->>'token' AND NOT revoked AND expires_at>clock_timestamp();
 IF NOT FOUND THEN RETURN '{"error":"El enlace no está disponible.","code":"invalid_link"}'; END IF;
 IF p_action='context' THEN RETURN jsonb_build_object('publication',daily_report_private.publication_json(p)-'supervisor_id'-'created_by'); END IF;
 v_identity_hash:=encode(extensions.digest(p.company_id::text||':'||regexp_replace(coalesce(p_body->>'document_number',''),'[^0-9A-Za-z]','','g'),'sha256'),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended('daily-identity:'||v_identity_hash,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('daily-ip:'||coalesce(p_body->>'ip_hash','unknown'),0));
 IF (SELECT count(*) FROM daily_report_private.attempts WHERE company_id=p.company_id AND attempts.identity_hash=v_identity_hash AND occurred_at>clock_timestamp()-interval '15 minutes')>=10
 OR (SELECT count(*) FROM daily_report_private.attempts WHERE ip_hash=p_body->>'ip_hash' AND occurred_at>clock_timestamp()-interval '15 minutes')>=50 THEN RETURN '{"error":"Demasiados intentos. Intente nuevamente en 15 minutos.","code":"rate_limited"}'; END IF;
 INSERT INTO daily_report_private.attempts(company_id,identity_hash,ip_hash) VALUES(p.company_id,v_identity_hash,coalesce(p_body->>'ip_hash','unknown'));
 DELETE FROM daily_report_private.attempts WHERE occurred_at<clock_timestamp()-interval '7 days';
 DELETE FROM daily_report_private.sessions WHERE expires_at<clock_timestamp()-interval '1 day';
 SELECT x.id INTO e FROM public.employees_v2 x WHERE x.company_id=p.company_id AND x.document_type::text=p_body->>'document_type'
 AND regexp_replace(x.document_number,'[^0-9A-Za-z]','','g')=regexp_replace(coalesce(p_body->>'document_number',''),'[^0-9A-Za-z]','','g')
 AND to_char(x.birth_date,'YYYY-MM-DD')=p_body->>'birth_date' AND daily_report_private.active_employee(p.company_id,x.id);
 IF e IS NULL OR NOT EXISTS(SELECT 1 FROM generate_series(p.start_date,p.end_date,'1 day') d WHERE daily_report_private.source(p,e,d::date) IS NOT NULL) THEN RETURN '{"error":"No fue posible validar los datos ingresados.","code":"identity"}'; END IF;
 raw_token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO daily_report_private.sessions(token_hash,publication_id,employee_id,expires_at) VALUES(encode(extensions.digest(raw_token,'sha256'),'hex'),p.id,e,least(clock_timestamp()+interval '30 minutes',p.expires_at));
 RETURN jsonb_build_object('session',raw_token,'expires_in_seconds',1800);
 END IF;
 SELECT * INTO s FROM daily_report_private.sessions WHERE token_hash=encode(extensions.digest(coalesce(p_body->>'session',''),'sha256'),'hex') AND expires_at>clock_timestamp();
 SELECT * INTO p FROM daily_report_private.publications WHERE id=s.publication_id AND NOT revoked AND expires_at>clock_timestamp();
 IF s.id IS NULL OR p.id IS NULL OR NOT daily_report_private.active_employee(p.company_id,s.employee_id) THEN RAISE EXCEPTION 'La sesión expiró. Vuelva a identificarse.' USING ERRCODE='42501'; END IF;
 e:=s.employee_id;
 IF p_action IN('rows','export') THEN
 result:=daily_report_private.read_rows(p,e);
 RETURN result||jsonb_build_object('saved_signature',(SELECT jsonb_build_object('id',id,'signature_path',path) FROM daily_report_private.signatures WHERE company_id=p.company_id AND employee_id=e AND reusable));
 ELSIF p_action='upload_context' THEN RETURN jsonb_build_object('company_id',p.company_id);
 ELSIF p_action='register_signature' THEN
 sig:=(p_body->>'signature_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='daily-report-signatures' AND name=p.company_id::text||'/'||sig::text||'.png') THEN RAISE EXCEPTION 'Primero cargue una firma válida'; END IF;
 IF p_body->>'save'='true' THEN UPDATE daily_report_private.signatures SET reusable=false WHERE company_id=p.company_id AND employee_id=e AND reusable; END IF;
 INSERT INTO daily_report_private.signatures(id,company_id,employee_id,path,reusable) VALUES(sig,p.company_id,e,p.company_id::text||'/'||sig::text||'.png',coalesce((p_body->>'save')::boolean,false));
 RETURN jsonb_build_object('signature_id',sig);
 ELSIF p_action='forget_signature' THEN UPDATE daily_report_private.signatures SET reusable=false WHERE company_id=p.company_id AND employee_id=e; RETURN '{"success":true}';
 ELSIF p_action IN('signed','disagreed') THEN RETURN daily_report_private.decide(p,e,e,p_action,p_body);
 ELSIF p_action='history' THEN RETURN daily_report_private.history(p,e,(p_body->>'date')::date);
 ELSIF p_action='logout' THEN DELETE FROM daily_report_private.sessions WHERE id=s.id; RETURN '{"success":true}'; END IF;
 RAISE EXCEPTION 'Operación no válida';
END $$;

-- Serialize relevant source writes BEFORE any row locks, using the payroll lock order.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['overtime_records','employee_incapacities','vacation_requests','leave_requests','employee_schedule','employee_work_info','employee_employment_cycles','company_holidays','employees_v2','positions'] LOOP
 EXECUTE format('CREATE TRIGGER daily_report_source_lock BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION payroll_private.review_statement_lock()',t);
 END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA daily_report_private FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.daily_report_admin(p_action text,p_body jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT daily_report_private.admin(p_action,p_body) $$;
GRANT USAGE ON SCHEMA daily_report_private TO authenticated;
GRANT EXECUTE ON FUNCTION daily_report_private.admin(text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.daily_report_admin(text,jsonb),public.daily_report_public(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.daily_report_admin(text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_report_public(text,jsonb) TO service_role;
