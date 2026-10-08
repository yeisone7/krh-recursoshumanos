-- One confirmation covers the entire selected batch. Preserve an identical signing
-- timestamp for all its days so PDF exports group the supervisor approval correctly.
CREATE OR REPLACE FUNCTION daily_report_private.decide(p daily_report_private.publications,e uuid,actor uuid,a text,b jsonb) RETURNS jsonb
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
 t:=clock_timestamp();
 FOR item IN SELECT value FROM jsonb_array_elements(b->'days') ORDER BY value->>'employee_id',value->>'date' LOOP
 IF e IS NOT NULL AND (item->>'employee_id')::uuid IS DISTINCT FROM e THEN RAISE EXCEPTION 'Empleado no autorizado' USING ERRCODE='42501'; END IF;
 r:=daily_report_private.row_data(p,(item->>'employee_id')::uuid,(item->>'date')::date);
 IF r IS NULL OR item->>'version' IS DISTINCT FROM r->>'version' THEN RAISE EXCEPTION 'El reporte cambió. Actualice y revise nuevamente.' USING ERRCODE='40001'; END IF;
 k:=r->>'key'; SELECT * INTO prev FROM daily_report_private.decisions WHERE day_key=k ORDER BY id DESC LIMIT 1;
 IF a IN('signed','disagreed') AND NOT (r->>'can_sign')::boolean THEN RAISE EXCEPTION 'El día no está disponible para validación'; END IF;
 IF a IN('approved','returned') AND r->>'status'<>'signed' THEN RAISE EXCEPTION 'El día requiere una firma vigente del empleado'; END IF;
 services:=coalesce(prev.services,'{}');
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
