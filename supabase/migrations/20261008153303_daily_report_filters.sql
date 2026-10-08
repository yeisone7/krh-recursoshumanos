-- Apply employee search before pagination; keep public employee reads unchanged.
CREATE FUNCTION daily_report_private.read_rows(p daily_report_private.publications,e uuid,offset_n int,filters jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE emp record; d date; r jsonb; rows jsonb:='[]'; count_n int:=0; from_d date:=greatest(p.start_date,nullif(filters->>'from','')::date); to_d date:=least(p.end_date,nullif(filters->>'to','')::date);
BEGIN
 FOR emp IN SELECT x.id FROM public.employees_v2 x WHERE x.company_id=p.company_id AND (e IS NULL OR x.id=e)
 AND (coalesce(btrim(filters->>'search'),'')='' OR position(lower(btrim(filters->>'search')) in lower(concat_ws(' ',x.first_name,x.middle_name,x.last_name,x.second_last_name,x.document_number)))>0)
 AND (EXISTS(SELECT 1 FROM public.employee_work_info w WHERE w.employee_id=x.id AND w.company_id=p.company_id AND w.operation_center_id=p.center_id
 AND coalesce(w.valid_from,w.hire_date,'-infinity'::date)<=p.end_date AND coalesce(w.valid_to,w.termination_date,'infinity'::date)>=p.start_date)
 OR EXISTS(SELECT 1 FROM public.employee_shift_assignments a WHERE a.employee_id=x.id AND a.company_id=p.company_id AND a.operation_center_id=p.center_id AND a.assignment_date BETWEEN p.start_date AND p.end_date)
 OR EXISTS(SELECT 1 FROM daily_report_private.decisions v WHERE v.employee_id=x.id AND v.company_id=p.company_id AND v.center_id=p.center_id AND v.work_date BETWEEN p.start_date AND p.end_date))
 ORDER BY x.last_name,x.first_name,x.id LIMIT 25 OFFSET greatest(0,offset_n) LOOP
 count_n:=count_n+1;
 FOR d IN SELECT generate_series(from_d,to_d,'1 day')::date LOOP
 r:=daily_report_private.row_data(p,emp.id,d); IF r IS NOT NULL AND (coalesce(filters->>'state','all')='all' OR r->>'status'=filters->>'state') THEN rows:=rows||jsonb_build_array(r); END IF;
 END LOOP; END LOOP;
 RETURN jsonb_build_object('publication',daily_report_private.publication_json(p),'rows',rows,'has_more',e IS NULL AND count_n=25);
END $$;

CREATE OR REPLACE FUNCTION daily_report_private.admin(p_action text,p_body jsonb DEFAULT '{}') RETURNS jsonb
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
 FROM public.user_profiles u CROSS JOIN public.operation_centers o WHERE o.company_id=c AND o.is_active AND daily_report_private.can_user(c,auth.uid(),o.id,'view') AND daily_report_private.can_user(c,u.id,o.id,'approve') AND daily_report_private.can_user(c,u.id,o.id,'view')),
 'settings',coalesce((SELECT to_jsonb(s) FROM daily_report_private.settings s WHERE s.company_id=c),'{"format_code":"GH FO 121","format_version":"01"}'::jsonb));
 ELSIF p_action='list' THEN
 RETURN (SELECT coalesce(jsonb_agg(daily_report_private.publication_json(x) ORDER BY x.created_at DESC),'[]') FROM daily_report_private.publications x WHERE x.company_id=c AND daily_report_private.can_user(c,auth.uid(),x.center_id,'view'));
 ELSIF p_action='settings' THEN
 INSERT INTO daily_report_private.settings VALUES(c,btrim(p_body->>'format_code'),btrim(p_body->>'format_version')) ON CONFLICT(company_id) DO UPDATE SET format_code=excluded.format_code,format_version=excluded.format_version;
 INSERT INTO daily_report_private.audit(company_id,action,actor_id,details) VALUES(c,'settings',auth.uid(),p_body-'company_id'); RETURN '{"success":true}';
 ELSIF p_action='create' THEN
 IF NOT EXISTS(SELECT 1 FROM public.operation_centers WHERE id=center AND company_id=c AND is_active) THEN RAISE EXCEPTION 'Centro inválido'; END IF;
 sup:=(p_body->>'supervisor_id')::uuid;
 IF NOT (daily_report_private.can_user(c,sup,center,'approve') AND daily_report_private.can_user(c,sup,center,'view')) THEN RAISE EXCEPTION 'Seleccione un supervisor habilitado con permiso para el centro'; END IF;
 IF (p_body->>'expires_at')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'El vencimiento debe ser futuro'; END IF;
 IF EXISTS(SELECT 1 FROM daily_report_private.publications x WHERE x.company_id=c AND x.center_id=center AND NOT x.revoked
 AND x.end_date>=(p_body->>'start_date')::date AND x.start_date<=(p_body->>'end_date')::date AND x.supervisor_id<>sup) THEN RAISE EXCEPTION 'Los períodos solapados deben tener el mismo supervisor. Reasigne primero las publicaciones existentes.'; END IF;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO daily_report_private.publications(company_id,center_id,start_date,end_date,supervisor_id,token,expires_at,created_by)
 VALUES(c,center,(p_body->>'start_date')::date,(p_body->>'end_date')::date,sup,token,(p_body->>'expires_at')::timestamptz,auth.uid()) RETURNING * INTO p;
 INSERT INTO daily_report_private.audit(publication_id,company_id,action,actor_id,details) VALUES(p.id,c,'create',auth.uid(),daily_report_private.publication_json(p));
 RETURN daily_report_private.publication_json(p)||jsonb_build_object('token',token);
 ELSIF p.id IS NULL THEN RAISE EXCEPTION 'Seleccione una publicación';
 ELSIF p_action IN('rows','export') THEN RETURN daily_report_private.read_rows(p,(p_body->>'employee_id')::uuid,coalesce((p_body->>'offset')::int,0),p_body);
 ELSIF p_action IN('history','export_history') THEN RETURN daily_report_private.history(p,(p_body->>'employee_id')::uuid,(p_body->>'date')::date);
 ELSIF p_action='audit' THEN RETURN (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id DESC),'[]') FROM daily_report_private.audit x WHERE x.publication_id=p.id);
 ELSIF p_action='link' THEN
 IF NOT (daily_report_private.can_user(c,auth.uid(),center,'create') OR daily_report_private.can_user(c,auth.uid(),center,'update')) THEN RAISE EXCEPTION 'Sin permiso para compartir' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('token',p.token);
 ELSIF p_action IN('rotate','revoke','reassign') THEN
 old:=daily_report_private.publication_json(p);
 IF p_action='reassign' THEN
 sup:=(p_body->>'supervisor_id')::uuid;
 IF NOT (daily_report_private.can_user(c,sup,center,'approve') AND daily_report_private.can_user(c,sup,center,'view')) THEN RAISE EXCEPTION 'Supervisor no habilitado'; END IF;
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


REVOKE ALL ON FUNCTION daily_report_private.read_rows(daily_report_private.publications,uuid,int,jsonb) FROM PUBLIC,anon,authenticated;
