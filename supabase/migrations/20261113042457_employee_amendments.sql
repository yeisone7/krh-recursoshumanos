-- Contract amendments are append-only business events. Only the authenticated
-- gateway can write them; employee identity and employment cycles never change.
CREATE SCHEMA amendment_private;
REVOKE ALL ON SCHEMA amendment_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA amendment_private TO authenticated;

INSERT INTO public.modules(code,name,parent_id,icon,sort_order)
SELECT v.code,v.name,m.id,'FilePenLine',v.ord FROM public.modules m CROSS JOIN
 (VALUES ('otrosi','Otrosí e historial laboral',212),('correcciones_laborales','Correcciones laborales',213)) v(code,name,ord)
WHERE m.code='empleados';
INSERT INTO public.permissions(module_id,action,description)
SELECT m.id,v.action::public.permission_action,m.name||' - '||v.label FROM public.modules m CROSS JOIN
 (VALUES ('view','Consultar'),('create','Registrar'),('update','Gestionar')) v(action,label)
WHERE m.code IN ('otrosi','correcciones_laborales');
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM public.custom_roles r CROSS JOIN public.permissions p JOIN public.modules m ON m.id=p.module_id
WHERE m.code IN ('otrosi','correcciones_laborales') AND
 (r.is_system OR (m.code='otrosi' AND lower(r.name) IN ('rrhh','recursos humanos','administrador','admin')))
ON CONFLICT DO NOTHING;

ALTER TABLE public.contracts ADD COLUMN amendment_effective_on date;

CREATE TABLE amendment_private.baselines (
 cycle_id uuid PRIMARY KEY REFERENCES public.employee_employment_cycles(id),
 employee_id uuid NOT NULL REFERENCES public.employees_v2(id), company_id uuid NOT NULL REFERENCES public.companies(id),
 contract_id uuid NOT NULL REFERENCES public.contracts(id), observed_on date NOT NULL,
 snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE amendment_private.templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id),
 path text NOT NULL UNIQUE, file_name text NOT NULL, created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE amendment_private.records (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES public.companies(id),
 employee_id uuid NOT NULL REFERENCES public.employees_v2(id), cycle_id uuid NOT NULL REFERENCES public.employee_employment_cycles(id),
 contract_id uuid NOT NULL REFERENCES public.contracts(id), number bigint GENERATED ALWAYS AS IDENTITY,
 kind text NOT NULL CHECK(kind IN ('amendment','correction')), related_id uuid REFERENCES amendment_private.records(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_signature','scheduled','applied','cancelled','needs_review')),
 effective_on date NOT NULL, reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 2000),
 changes jsonb NOT NULL, before_values jsonb NOT NULL, base_snapshot jsonb NOT NULL,
 declared_before boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 1,
 generated_path text, signed_path text, template_id uuid REFERENCES amendment_private.templates(id),
 created_by uuid NOT NULL REFERENCES auth.users(id), actor_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 confirmed_at timestamptz, confirmed_by uuid REFERENCES auth.users(id), applied_at timestamptz,
 cancellation_reason text, review_reason text, affected_cuts jsonb NOT NULL DEFAULT '[]',
 document_id uuid UNIQUE REFERENCES public.employee_documents(id)
);
CREATE INDEX amendments_cycle_date ON amendment_private.records(cycle_id,effective_on,number);
CREATE INDEX amendments_due ON amendment_private.records(effective_on) WHERE status='scheduled';
CREATE INDEX amendments_company_employee ON amendment_private.records(company_id,employee_id);
CREATE TABLE amendment_private.events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, amendment_id uuid NOT NULL REFERENCES amendment_private.records(id),
 action text NOT NULL, actor_id uuid, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(), details jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE amendment_private.write_context (tx bigint NOT NULL, cycle_id uuid NOT NULL, PRIMARY KEY(tx,cycle_id));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['baselines','templates','records','events','write_context'] LOOP
 EXECUTE format('ALTER TABLE amendment_private.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON amendment_private.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $$;

CREATE FUNCTION amendment_private.access_employee(employee uuid, action text DEFAULT 'view', correction boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid; BEGIN
 SELECT company_id INTO c FROM public.employees_v2 WHERE id=employee;
 IF c IS NULL OR NOT amendment_private.can(c,CASE WHEN correction THEN 'correcciones_laborales' ELSE 'otrosi' END,action)
 OR NOT public.has_employee_v2_access(employee) THEN RAISE EXCEPTION 'Empleado o permiso no autorizado' USING ERRCODE='42501'; END IF;
 RETURN c;
END $$;

CREATE FUNCTION amendment_private.can(c uuid, module text, action text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.is_user_active(auth.uid()) AND
 (public.is_company_member(c) OR public.is_super_admin()) AND
 (public.is_super_admin() OR public.is_admin() OR
  (module='otrosi' AND public.has_role(auth.uid(),'rrhh')) OR EXISTS(
 SELECT 1 FROM public.user_custom_roles ur JOIN public.custom_roles r ON r.id=ur.role_id
 JOIN public.role_permissions rp ON rp.role_id=r.id JOIN public.permissions p ON p.id=rp.permission_id
 JOIN public.modules m ON m.id=p.module_id WHERE ur.user_id=auth.uid() AND r.company_id=c AND r.is_active
 AND m.is_active AND m.code=can.module AND p.action::text=can.action))
$$;
CREATE FUNCTION amendment_private.snapshot(cycle uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
 'position',jsonb_build_object('id',w.position_id,'label',w.position_name),
 'center',jsonb_build_object('id',w.operation_center_id,'label',oc.name),
 'salary',jsonb_build_object('amount',c.salary),
 'contract_type',jsonb_build_object('code',c.contract_type,'label',coalesce(ct.display_name,c.contract_type),'end_date',c.end_date,'work_labor_description',c.work_labor_description),
 'rest_day',jsonb_build_object('value',s.rest_day),
 'schedule',jsonb_build_object('mode',t.mode,'work_schedule_id',t.work_schedule_id,'shift_cycle_id',t.shift_cycle_id,
 'cycle_start_date',t.cycle_start_date,'shift_type_id',s.shift_type_id,'label',coalesce(ws.name,sc.name)))
 FROM public.employee_employment_cycles ec
 JOIN public.contracts c ON c.employment_cycle_id=ec.id AND NOT coalesce(c.is_terminated,false)
 JOIN LATERAL (SELECT * FROM public.employee_work_info WHERE employment_cycle_id=ec.id AND is_current ORDER BY created_at DESC LIMIT 1) w ON true
 LEFT JOIN public.operation_centers oc ON oc.id=w.operation_center_id
 LEFT JOIN public.contract_type_config ct ON ct.company_id=ec.company_id AND ct.contract_type=c.contract_type
 LEFT JOIN LATERAL (SELECT * FROM public.employee_schedule WHERE employment_cycle_id=ec.id AND is_current ORDER BY created_at DESC LIMIT 1) s ON true
 LEFT JOIN LATERAL (SELECT * FROM public.employee_time_config WHERE employment_cycle_id=ec.id AND is_active ORDER BY start_date DESC LIMIT 1) t ON true
 LEFT JOIN public.work_schedules ws ON ws.id=t.work_schedule_id LEFT JOIN public.shift_cycles sc ON sc.id=t.shift_cycle_id
 WHERE ec.id=cycle LIMIT 1
$$;
-- A date lookup overlays only fields supported by evidence. Before the observed
-- baseline, unknown fields remain absent; a declared previous value is explicit.
CREATE FUNCTION amendment_private.conditions(cycle uuid, on_date date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE b amendment_private.baselines; result jsonb:='{}'; r record; k text; v jsonb;
BEGIN
 SELECT * INTO b FROM amendment_private.baselines WHERE cycle_id=cycle;
 IF on_date>=b.observed_on THEN result:=b.snapshot; END IF;
 FOR r IN SELECT * FROM amendment_private.records WHERE cycle_id=cycle AND confirmed_at IS NOT NULL
 AND status IN ('scheduled','applied') ORDER BY effective_on,number LOOP
   IF r.effective_on<=on_date THEN result:=result||r.changes;
   ELSE
     FOR k,v IN SELECT * FROM jsonb_each(r.before_values) LOOP
       IF NOT result ? k AND (r.declared_before OR on_date>=b.observed_on) THEN result:=result||jsonb_build_object(k,v); END IF;
     END LOOP;
   END IF;
 END LOOP;
 RETURN result;
END $$;
CREATE FUNCTION amendment_private.normalize(c uuid, changes jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb:='{}'; k text; v jsonb; label text; needs_end boolean;
BEGIN
 IF jsonb_typeof(changes)<>'object' OR changes='{}'::jsonb THEN RAISE EXCEPTION 'Seleccione al menos un cambio'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(changes) LOOP
 IF jsonb_typeof(v)<>'object' THEN RAISE EXCEPTION 'Valor inválido para %',k; END IF;
 CASE k
 WHEN 'position' THEN
   SELECT name INTO label FROM public.positions WHERE id=(v->>'id')::uuid AND company_id=c AND is_active;
   IF label IS NULL THEN RAISE EXCEPTION 'Cargo no válido para esta empresa'; END IF;
   v:=jsonb_build_object('id',v->>'id','label',label);
 WHEN 'center' THEN
   SELECT name INTO label FROM public.operation_centers WHERE id=(v->>'id')::uuid AND company_id=c AND is_active;
   IF label IS NULL OR NOT public.check_center_access(c,(v->>'id')::uuid) THEN RAISE EXCEPTION 'Centro no autorizado'; END IF;
   v:=jsonb_build_object('id',v->>'id','label',label);
 WHEN 'salary' THEN
   IF NOT amendment_private.can(c,'salarios','update') OR NOT amendment_private.can(c,'salarios','view') THEN RAISE EXCEPTION 'Sin permiso para modificar salarios' USING ERRCODE='42501'; END IF;
   IF (v->>'amount')::numeric IS NULL OR (v->>'amount')::numeric<=0 OR (v->>'amount')::numeric>999999999999 THEN RAISE EXCEPTION 'Salario inválido'; END IF;
   v:=jsonb_build_object('amount',(v->>'amount')::numeric);
 WHEN 'contract_type' THEN
   SELECT display_name,requires_end_date INTO label,needs_end FROM public.contract_type_config WHERE company_id=c AND contract_type=v->>'code' AND is_active;
   IF label IS NULL OR NOT (v->>'code'=ANY(enum_range(NULL::public.link_type)::text[])) THEN RAISE EXCEPTION 'Tipo de contrato no compatible'; END IF;
   IF needs_end AND nullif(v->>'end_date','') IS NULL THEN RAISE EXCEPTION 'El tipo de contrato requiere fecha final'; END IF;
   IF v->>'code'='obra_labor' AND length(btrim(coalesce(v->>'work_labor_description','')))<5 THEN RAISE EXCEPTION 'Describa la obra o labor'; END IF;
   v:=jsonb_build_object('code',v->>'code','label',label,'end_date',CASE WHEN needs_end THEN nullif(v->>'end_date','')::date END,'work_labor_description',nullif(v->>'work_labor_description',''));
 WHEN 'rest_day' THEN
   IF coalesce(v->>'value','') NOT IN ('lunes','martes','miercoles','jueves','viernes','sabado','domingo') THEN RAISE EXCEPTION 'Día de descanso inválido'; END IF;
   v:=jsonb_build_object('value',v->>'value');
 WHEN 'schedule' THEN
   IF v->>'mode'='administrative' THEN
     SELECT name INTO label FROM public.work_schedules WHERE id=(v->>'work_schedule_id')::uuid AND company_id=c AND is_active;
     v:=jsonb_build_object('mode','administrative','work_schedule_id',v->>'work_schedule_id','shift_cycle_id',NULL,'cycle_start_date',NULL,'shift_type_id',NULL);
   ELSIF v->>'mode'='shift' THEN
     SELECT name INTO label FROM public.shift_cycles WHERE id=(v->>'shift_cycle_id')::uuid AND company_id=c AND is_active;
     IF nullif(v->>'cycle_start_date','') IS NULL THEN RAISE EXCEPTION 'Indique el inicio del ciclo de turnos'; END IF;
     v:=jsonb_build_object('mode','shift','work_schedule_id',NULL,'shift_cycle_id',v->>'shift_cycle_id','cycle_start_date',(v->>'cycle_start_date')::date,'shift_type_id',NULL);
   ELSE RAISE EXCEPTION 'Modalidad de horario inválida'; END IF;
   IF label IS NULL THEN RAISE EXCEPTION 'Horario o ciclo no válido para esta empresa'; END IF;
   v:=v||jsonb_build_object('label',label);
 ELSE RAISE EXCEPTION 'Campo no permitido: %',k;
 END CASE;
 result:=result||jsonb_build_object(k,v); label:=NULL;
 END LOOP;
 RETURN result;
END $$;

-- Retain each physical version and split only its affected effective interval.
-- Payroll time configuration begins after a closed cut; the event ledger retains
-- the true contractual effective date and the cut is listed for manual review.
CREATE FUNCTION amendment_private.version_rows(tbl text, cycle uuid, from_date date, until_date date, patch jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE start_col text; end_col text; active_col text; rowdoc jsonb; clone jsonb; row_start date; row_end date; cut date; d date:=from_date; today date:=(now() AT TIME ZONE 'America/Bogota')::date; fields text; assignment text; found_row boolean:=false; ec public.employee_employment_cycles;
BEGIN
 IF tbl NOT IN ('employee_work_info','employee_schedule','employee_time_config') OR patch='{}' THEN RETURN; END IF;
 start_col:=CASE WHEN tbl='employee_time_config' THEN 'start_date' ELSE 'valid_from' END;
 end_col:=CASE WHEN tbl='employee_time_config' THEN 'end_date' ELSE 'valid_to' END;
 active_col:=CASE WHEN tbl='employee_time_config' THEN 'is_active' ELSE 'is_current' END;
 IF tbl='employee_time_config' THEN
   SELECT max(pc.cutoff_date) INTO cut FROM public.payroll_control_cuts pc JOIN public.employee_employment_cycles scope_cycle ON scope_cycle.company_id=pc.company_id
   WHERE scope_cycle.id=cycle AND pc.active AND pc.operation_center_id IN
    (SELECT operation_center_id FROM public.employee_work_info WHERE employment_cycle_id=cycle UNION SELECT (patch->>'operation_center_id')::uuid);
   d:=greatest(d,coalesce(cut+1,d));
 END IF;
 IF until_date IS NOT NULL AND d>=until_date THEN RETURN; END IF;
 FOR rowdoc IN EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE employment_cycle_id=$1 AND %I < coalesce($3,''infinity''::date) AND coalesce(%I,''infinity''::date)>=$2 ORDER BY %I FOR UPDATE',tbl,start_col,end_col,start_col) USING cycle,d,until_date LOOP
   found_row:=true;
   row_start:=(rowdoc->>start_col)::date; row_end:=(rowdoc->>end_col)::date;
   IF tbl='employee_time_config' THEN INSERT INTO payroll_private.write_context VALUES(txid_current(),(rowdoc->>'id')::uuid,'version') ON CONFLICT DO NOTHING; END IF;
   IF row_start<d THEN
     EXECUTE format('UPDATE public.%I SET %I=$2,%I=$3 WHERE id=$1',tbl,end_col,active_col) USING (rowdoc->>'id')::uuid,d-1,row_start<=today AND d>today;
     clone:=rowdoc||jsonb_build_object('id',gen_random_uuid(),start_col,d,'created_at',clock_timestamp(),'updated_at',clock_timestamp());
   ELSE clone:=rowdoc; END IF;
   IF until_date IS NOT NULL AND (row_end IS NULL OR row_end>=until_date) THEN
     -- Preserve the untouched tail, including unrelated changes already in it.
     EXECUTE format('INSERT INTO public.%I SELECT (jsonb_populate_record(NULL::public.%I,$1)).*',tbl,tbl)
       USING rowdoc||jsonb_build_object('id',gen_random_uuid(),start_col,until_date,active_col,until_date<=today AND (row_end IS NULL OR row_end>=today));
     clone:=clone||jsonb_build_object(end_col,until_date-1);
   END IF;
   clone:=clone||patch||jsonb_build_object(active_col,(clone->>start_col)::date<=today AND ((clone->>end_col) IS NULL OR (clone->>end_col)::date>=today),'updated_at',clock_timestamp());
   IF row_start<d THEN
     EXECUTE format('INSERT INTO public.%I SELECT (jsonb_populate_record(NULL::public.%I,$1)).*',tbl,tbl) USING clone;
   ELSE
     SELECT string_agg(format('%I = (jsonb_populate_record(NULL::public.%I,$2)).%I',a.attname,tbl,a.attname),',') INTO assignment
     FROM pg_attribute a WHERE a.attrelid=format('public.%I',tbl)::regclass AND a.attnum>0 AND NOT a.attisdropped AND a.attname<>'id';
     EXECUTE format('UPDATE public.%I SET %s WHERE id=$1',tbl,assignment) USING (rowdoc->>'id')::uuid,clone;
   END IF;
   IF tbl='employee_time_config' THEN DELETE FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=(rowdoc->>'id')::uuid AND kind='version'; END IF;
 END LOOP;
 IF NOT found_row THEN
   SELECT * INTO ec FROM public.employee_employment_cycles WHERE id=cycle;
   IF tbl='employee_schedule' THEN
     INSERT INTO public.employee_schedule(employee_id,company_id,employment_cycle_id,valid_from,valid_to,is_current,rest_day,is_office_schedule,shift_type_id)
     VALUES(ec.employee_id,ec.company_id,cycle,d,until_date-1,d<=today AND (until_date IS NULL OR until_date>today),patch->>'rest_day',coalesce((patch->>'is_office_schedule')::boolean,true),(patch->>'shift_type_id')::uuid);
   ELSIF tbl='employee_time_config' AND patch ? 'mode' THEN
     INSERT INTO public.employee_time_config(employee_id,company_id,employment_cycle_id,start_date,end_date,is_active,mode,work_schedule_id,shift_cycle_id,cycle_start_date,operation_center_id,created_by)
     SELECT ec.employee_id,ec.company_id,cycle,d,until_date-1,d<=today AND (until_date IS NULL OR until_date>today),(patch->>'mode')::public.employee_time_mode,
     (patch->>'work_schedule_id')::uuid,(patch->>'shift_cycle_id')::uuid,(patch->>'cycle_start_date')::date,
     (SELECT operation_center_id FROM public.employee_work_info WHERE employment_cycle_id=cycle AND is_current LIMIT 1),auth.uid();
   END IF;
 END IF;
END $$;

CREATE FUNCTION amendment_private.apply_record(record_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r amendment_private.records; k text; v jsonb; next_date date; p jsonb; latest jsonb; current_center uuid; old_center uuid; today date:=(now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
 SELECT * INTO r FROM amendment_private.records WHERE id=record_id;
 IF r.id IS NULL THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('amendment:'||r.cycle_id::text,0));
 SELECT * INTO r FROM amendment_private.records WHERE id=record_id FOR UPDATE;
 IF r.status<>'scheduled' OR r.effective_on>today THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.employee_employment_cycles WHERE id=r.cycle_id AND status='active') OR
 NOT EXISTS(SELECT 1 FROM public.contracts WHERE id=r.contract_id AND NOT coalesce(is_terminated,false)) THEN
 UPDATE amendment_private.records SET status='needs_review',review_reason='La vinculación o el contrato ya no están activos' WHERE id=r.id;
 INSERT INTO amendment_private.events(amendment_id,action,details) VALUES(r.id,'needs_review','{"reason":"inactive_cycle"}'); RETURN;
 END IF;
 INSERT INTO amendment_private.write_context VALUES(txid_current(),r.cycle_id) ON CONFLICT DO NOTHING;
 SELECT operation_center_id INTO old_center FROM public.employee_work_info WHERE employment_cycle_id=r.cycle_id AND is_current LIMIT 1;
 FOR k,v IN SELECT * FROM jsonb_each(r.changes) LOOP
   SELECT min(effective_on) INTO next_date FROM amendment_private.records WHERE cycle_id=r.cycle_id AND id<>r.id
   AND status IN ('scheduled','applied') AND effective_on>r.effective_on AND changes ? k;
   CASE k
   WHEN 'position' THEN PERFORM amendment_private.version_rows('employee_work_info',r.cycle_id,r.effective_on,next_date,jsonb_build_object('position_id',v->>'id','position_name',v->>'label'));
   WHEN 'center' THEN
     PERFORM amendment_private.version_rows('employee_work_info',r.cycle_id,r.effective_on,next_date,jsonb_build_object('operation_center_id',v->>'id'));
     PERFORM amendment_private.version_rows('employee_time_config',r.cycle_id,r.effective_on,next_date,jsonb_build_object('operation_center_id',v->>'id'));
   WHEN 'contract_type' THEN PERFORM amendment_private.version_rows('employee_work_info',r.cycle_id,r.effective_on,next_date,jsonb_build_object('link_type',v->>'code'));
   WHEN 'rest_day' THEN PERFORM amendment_private.version_rows('employee_schedule',r.cycle_id,r.effective_on,next_date,jsonb_build_object('rest_day',v->>'value'));
   WHEN 'schedule' THEN
     PERFORM amendment_private.version_rows('employee_schedule',r.cycle_id,r.effective_on,next_date,jsonb_build_object('is_office_schedule',v->>'mode'='administrative','shift_type_id',v->'shift_type_id'));
     PERFORM amendment_private.version_rows('employee_time_config',r.cycle_id,r.effective_on,next_date,v-'label'-'shift_type_id');
   ELSE NULL;
   END CASE;
 END LOOP;
 latest:=amendment_private.conditions(r.cycle_id,today);
 UPDATE public.contracts SET salary=(latest#>>'{salary,amount}')::numeric,contract_type=latest#>>'{contract_type,code}',
 end_date=(latest#>>'{contract_type,end_date}')::date,work_labor_description=latest#>>'{contract_type,work_labor_description}',
 amendment_effective_on=(SELECT max(effective_on) FROM amendment_private.records WHERE cycle_id=r.cycle_id AND status IN ('scheduled','applied') AND effective_on<=today AND changes ? 'contract_type') WHERE id=r.contract_id;
 current_center:=(latest#>>'{center,id}')::uuid;
 IF old_center IS DISTINCT FROM current_center THEN
   DELETE FROM public.employee_operation_center_assignments WHERE employment_cycle_id=r.cycle_id AND operation_center_id=old_center;
   INSERT INTO public.employee_operation_center_assignments(employee_id,company_id,employment_cycle_id,operation_center_id,created_by)
   VALUES(r.employee_id,r.company_id,r.cycle_id,current_center,r.created_by) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE amendment_private.records SET status='applied',applied_at=clock_timestamp(),review_reason=NULL WHERE id=r.id;
 INSERT INTO amendment_private.events(amendment_id,action,actor_id) VALUES(r.id,'applied',auth.uid());
 DELETE FROM amendment_private.write_context WHERE tx=txid_current() AND cycle_id=r.cycle_id;
END $$;

CREATE FUNCTION amendment_private.command(action text, payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<amendment_command>>
DECLARE r amendment_private.records; employee uuid; company uuid; cycle public.employee_employment_cycles;
 contract public.contracts; snap jsonb; prior jsonb; changes jsonb; b amendment_private.baselines;
 k text; v jsonb; id_value uuid:=(payload->>'id')::uuid; d date; path text; module text; nextrow amendment_private.records;
 today date:=(now() AT TIME ZONE 'America/Bogota')::date; actor text; cutoff jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicie sesión' USING ERRCODE='42501'; END IF;
 IF action='template' THEN
   company:=(payload->>'company_id')::uuid;
   IF NOT amendment_private.can(company,'otrosi','update') THEN RAISE EXCEPTION 'Sin permiso para configurar plantilla' USING ERRCODE='42501'; END IF;
   path:=payload->>'path';
   IF path NOT LIKE company::text||'/templates/%.docx' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='amendments' AND name=path) THEN RAISE EXCEPTION 'Cargue la plantilla Word'; END IF;
   INSERT INTO amendment_private.templates(company_id,path,file_name,created_by) VALUES(company,path,payload->>'file_name',auth.uid()) RETURNING id INTO id_value;
   RETURN id_value;
 END IF;
 SELECT * INTO r FROM amendment_private.records WHERE id=id_value;
 employee:=coalesce(r.employee_id,(payload->>'employee_id')::uuid);
 company:=amendment_private.access_employee(employee,CASE WHEN action='save' AND r.id IS NULL THEN 'create' ELSE 'update' END,
   coalesce(r.kind,payload->>'kind')='correction');
 IF r.changes ? 'salary' AND (NOT amendment_private.can(company,'salarios','view') OR NOT amendment_private.can(company,'salarios','update')) THEN
   RAISE EXCEPTION 'Sin permiso para gestionar un registro salarial' USING ERRCODE='42501';
 END IF;
 IF action='cancel' THEN
   IF r.id IS NULL THEN RAISE EXCEPTION 'Registro no encontrado'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended('amendment:'||r.cycle_id::text,0));
   SELECT * INTO r FROM amendment_private.records WHERE id=id_value FOR UPDATE;
   IF r.status='cancelled' THEN RETURN r.id; END IF;
   IF r.status NOT IN ('draft','awaiting_signature','scheduled','needs_review') THEN RAISE EXCEPTION 'Un registro aplicado se subsana con otro registro'; END IF;
   IF length(btrim(coalesce(payload->>'reason','')))<5 THEN RAISE EXCEPTION 'Indique el motivo de cancelación'; END IF;
   IF EXISTS(SELECT 1 FROM amendment_private.records x WHERE x.cycle_id=r.cycle_id AND x.id<>r.id AND x.status IN ('scheduled','applied') AND x.effective_on>r.effective_on AND x.changes ?| ARRAY(SELECT jsonb_object_keys(r.changes))) THEN RAISE EXCEPTION 'Hay documentos posteriores dependientes. Revise su secuencia antes de cancelar'; END IF;
   UPDATE amendment_private.records SET status='cancelled',cancellation_reason=payload->>'reason',updated_at=clock_timestamp() WHERE id=r.id;
   INSERT INTO amendment_private.events(amendment_id,action,actor_id,details) VALUES(r.id,'cancel',auth.uid(),jsonb_build_object('reason',payload->>'reason'));
   RETURN r.id;
 END IF;
 SELECT * INTO cycle FROM public.employee_employment_cycles WHERE employee_id=employee AND status='active';
 IF cycle.id IS NULL THEN RAISE EXCEPTION 'Regularice la vinculación activa antes de registrar un Otrosí'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('amendment:'||cycle.id::text,0));
 SELECT * INTO r FROM amendment_private.records WHERE id=id_value FOR UPDATE;
 IF r.id IS NOT NULL AND r.cycle_id<>cycle.id THEN RAISE EXCEPTION 'El registro pertenece a otra vinculación'; END IF;
 SELECT * INTO contract FROM public.contracts WHERE employment_cycle_id=cycle.id AND NOT coalesce(is_terminated,false) ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF contract.id IS NULL THEN RAISE EXCEPTION 'Regularice el contrato activo antes de registrar un Otrosí'; END IF;
 snap:=amendment_private.snapshot(cycle.id);
 IF snap IS NULL THEN RAISE EXCEPTION 'Complete la información laboral del empleado'; END IF;
 SELECT coalesce(display_name,full_name,auth.uid()::text) INTO actor FROM public.user_profiles WHERE id=auth.uid();
 actor:=coalesce(actor,auth.uid()::text);
 IF action='save' THEN
   IF r.id IS NOT NULL AND r.status NOT IN ('draft','awaiting_signature') THEN RAISE EXCEPTION 'El registro confirmado es inmutable'; END IF;
   IF r.id IS NOT NULL AND r.revision<>(payload->>'revision')::integer THEN RAISE EXCEPTION 'Otro usuario modificó el borrador. Recargue antes de guardar' USING ERRCODE='40001'; END IF;
   d:=(payload->>'effective_on')::date;
   IF d IS NULL OR d<cycle.start_date OR d<contract.start_date THEN RAISE EXCEPTION 'La vigencia debe pertenecer al contrato y vinculación actuales'; END IF;
   IF payload->>'kind' NOT IN ('amendment','correction') THEN RAISE EXCEPTION 'Tipo de registro inválido'; END IF;
   IF payload->>'kind'='correction' AND d>today THEN RAISE EXCEPTION 'Una corrección no puede ser futura'; END IF;
   changes:=amendment_private.normalize(company,payload->'changes');
   IF changes ? 'contract_type' AND (changes#>>'{contract_type,end_date}')::date<d THEN RAISE EXCEPTION 'El vencimiento debe ser posterior o igual a la vigencia'; END IF;
   INSERT INTO amendment_private.baselines(cycle_id,employee_id,company_id,contract_id,observed_on,snapshot)
   VALUES(cycle.id,employee,company,contract.id,today,snap) ON CONFLICT DO NOTHING;
   SELECT * INTO b FROM amendment_private.baselines WHERE cycle_id=cycle.id;
   prior:=amendment_private.conditions(cycle.id,d);
   IF d<b.observed_on THEN
     FOR k IN SELECT jsonb_object_keys(changes) LOOP
       IF NOT prior ? k THEN
         IF NOT coalesce(payload->'declared_before','{}') ? k OR jsonb_typeof(payload->'declared_before'->k)<>'object' OR payload->'declared_before'->k='{}'::jsonb THEN RAISE EXCEPTION 'No hay evidencia del valor anterior de %. Regístrelo según el soporte',k; END IF;
         prior:=prior||jsonb_build_object(k,payload->'declared_before'->k);
       END IF;
     END LOOP;
   END IF;
   prior:=(SELECT jsonb_object_agg(key,value) FROM jsonb_each(prior) WHERE changes ? key);
   -- Only semantic differences count; labels are frozen for display, not identity.
   FOR k,v IN SELECT * FROM jsonb_each(changes) LOOP
     IF (v-'label') IS NOT DISTINCT FROM ((prior->k)-'label') THEN changes:=changes-k; prior:=prior-k; END IF;
   END LOOP;
   IF changes='{}' OR changes IS NULL THEN RAISE EXCEPTION 'No hay cambios respecto a las condiciones de esa fecha'; END IF;
   IF payload->>'related_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM amendment_private.records WHERE id=(payload->>'related_id')::uuid AND cycle_id=cycle.id AND status='applied') THEN RAISE EXCEPTION 'Registro relacionado inválido'; END IF;
   IF r.id IS NULL THEN
     INSERT INTO amendment_private.records(id,company_id,employee_id,cycle_id,contract_id,kind,related_id,effective_on,reason,changes,before_values,base_snapshot,declared_before,created_by,actor_name)
     VALUES(id_value,company,employee,cycle.id,contract.id,payload->>'kind',(payload->>'related_id')::uuid,d,payload->>'reason',changes,prior,snap,d<b.observed_on,auth.uid(),actor);
   ELSE
     IF r.kind<>payload->>'kind' THEN RAISE EXCEPTION 'No puede cambiar el tipo del registro'; END IF;
     UPDATE amendment_private.records SET effective_on=d,reason=payload->>'reason',changes=amendment_command.changes,before_values=prior,base_snapshot=snap,
     declared_before=d<b.observed_on,revision=revision+1,status='draft',generated_path=NULL,signed_path=NULL,template_id=NULL,updated_at=clock_timestamp() WHERE id=r.id;
   END IF;
 ELSIF action='retry' THEN
   IF r.status<>'needs_review' THEN RAISE EXCEPTION 'Solo se reintentan registros pendientes de revisión'; END IF;
   PERFORM amendment_private.normalize(company,r.changes);
   IF EXISTS(SELECT 1 FROM amendment_private.records x WHERE x.cycle_id=r.cycle_id AND x.id<>r.id AND x.status IN ('scheduled','applied') AND x.effective_on>=r.effective_on AND x.changes ?| ARRAY(SELECT jsonb_object_keys(r.changes))) THEN RAISE EXCEPTION 'Hay cambios posteriores. Subsane la secuencia antes de reintentar'; END IF;
   UPDATE amendment_private.records SET status='scheduled',review_reason=NULL WHERE id=r.id;
   PERFORM amendment_private.apply_record(r.id);
 ELSIF action IN ('generated','confirm') THEN
   IF r.id IS NULL THEN RAISE EXCEPTION 'Guarde el borrador primero'; END IF;
   IF action='confirm' AND r.status IN ('scheduled','applied') THEN RETURN r.id; END IF;
   IF r.status NOT IN ('draft','awaiting_signature') OR r.revision IS DISTINCT FROM (payload->>'revision')::integer THEN RAISE EXCEPTION 'Borrador desactualizado' USING ERRCODE='40001'; END IF;
   FOR k,v IN SELECT * FROM jsonb_each(r.changes) LOOP
     IF ((snap->k)-'label') IS DISTINCT FROM ((r.base_snapshot->k)-'label') THEN RAISE EXCEPTION 'Las condiciones cambiaron. Revise el borrador y renueve el soporte' USING ERRCODE='40001'; END IF;
   END LOOP;
   IF r.changes ? 'salary' AND (NOT amendment_private.can(company,'salarios','view') OR NOT amendment_private.can(company,'salarios','update')) THEN RAISE EXCEPTION 'Sin permiso salarial' USING ERRCODE='42501'; END IF;
   IF action='generated' THEN
     path:=payload->>'path';
     IF path NOT LIKE company::text||'/'||r.id::text||'/'||r.revision||'/%.docx' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='amendments' AND name=path) THEN RAISE EXCEPTION 'Documento generado no encontrado'; END IF;
     IF NOT EXISTS(SELECT 1 FROM amendment_private.templates WHERE id=(payload->>'template_id')::uuid AND company_id=company) THEN RAISE EXCEPTION 'Plantilla inválida'; END IF;
     UPDATE amendment_private.records SET generated_path=path,template_id=(payload->>'template_id')::uuid,status='awaiting_signature',updated_at=clock_timestamp() WHERE id=r.id;
   ELSE
     -- Revalidate catalogs and permissions; a disabled or moved catalog is not applied.
     PERFORM amendment_private.normalize(company,r.changes);
     FOR k,v IN SELECT * FROM jsonb_each(r.changes) LOOP
       IF EXISTS(SELECT 1 FROM amendment_private.records x WHERE x.cycle_id=r.cycle_id AND x.id<>r.id AND x.status IN ('scheduled','applied') AND x.effective_on=r.effective_on AND x.changes ? k AND x.id IS DISTINCT FROM r.related_id) THEN RAISE EXCEPTION 'Ya hay un cambio de % confirmado para esa fecha',k; END IF;
       SELECT x.* INTO nextrow FROM amendment_private.records x WHERE x.cycle_id=r.cycle_id AND x.id<>r.id AND x.status IN ('scheduled','applied') AND x.effective_on>r.effective_on AND x.changes ? k ORDER BY x.effective_on,x.number LIMIT 1;
       IF nextrow.id IS NOT NULL AND ((nextrow.before_values->k)-'label') IS DISTINCT FROM (v-'label') THEN RAISE EXCEPTION 'El retroactivo contradice el Otrosí % posterior (%). Revise la secuencia',nextrow.number,k; END IF;
       prior:=amendment_private.conditions(r.cycle_id,r.effective_on);
       IF prior ? k AND ((prior->k)-'label') IS DISTINCT FROM ((r.before_values->k)-'label') THEN RAISE EXCEPTION 'La secuencia de vigencias cambió. Revise el borrador y renueve el soporte' USING ERRCODE='40001'; END IF;
     END LOOP;
     IF r.kind='amendment' THEN
       path:=payload->>'signed_path';
       IF path IS NULL OR path NOT LIKE company::text||'/'||r.id::text||'/'||r.revision||'/%.pdf' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='amendments' AND name=path AND metadata->>'mimetype'='application/pdf') THEN RAISE EXCEPTION 'Adjunte el PDF firmado antes de confirmar'; END IF;
       INSERT INTO public.employee_documents(employee_id,company_id,employment_cycle_id,document_type,document_name,file_url,file_name,mime_type,uploaded_by)
       VALUES(r.employee_id,r.company_id,r.cycle_id,'contratos_otrosi','Otrosí '||r.number,'amendments/'||path,'Otrosi-'||r.number||'.pdf','application/pdf',auth.uid()) RETURNING id INTO r.document_id;
     END IF;
     SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'center_id',operation_center_id,'level',level,'cutoff_date',cutoff_date)),'[]') INTO cutoff
     FROM public.payroll_control_cuts WHERE company_id=r.company_id AND active AND cutoff_date>=r.effective_on
     AND operation_center_id IN ((r.base_snapshot#>>'{center,id}')::uuid,(r.changes#>>'{center,id}')::uuid);
     UPDATE amendment_private.records SET status='scheduled',confirmed_at=clock_timestamp(),confirmed_by=auth.uid(),signed_path=path,document_id=r.document_id,affected_cuts=cutoff,updated_at=clock_timestamp() WHERE id=r.id;
     PERFORM amendment_private.apply_record(r.id);
   END IF;
 ELSE RAISE EXCEPTION 'Acción no permitida';
 END IF;
 INSERT INTO amendment_private.events(amendment_id,action,actor_id,details) VALUES(id_value,action,auth.uid(),CASE WHEN action='save' THEN jsonb_build_object('revision',coalesce(r.revision+1,1)) ELSE '{}'::jsonb END);
 RETURN id_value;
END $$;

CREATE FUNCTION amendment_private.employee_data(employee uuid, at_date date DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; result jsonb; rows jsonb; cycle uuid; snap jsonb; salary boolean; current_contract jsonb;
BEGIN
 company:=amendment_private.access_employee(employee);
 salary:=amendment_private.can(company,'salarios','view');
 SELECT id INTO cycle FROM public.employee_employment_cycles WHERE employee_id=employee AND status='active';
 snap:=CASE WHEN at_date IS NULL THEN amendment_private.snapshot(cycle) ELSE amendment_private.conditions(cycle,at_date) END;
 SELECT jsonb_build_object('id',id,'number',contract_number,'start_date',start_date) INTO current_contract FROM public.contracts WHERE employment_cycle_id=cycle AND NOT coalesce(is_terminated,false) ORDER BY created_at DESC LIMIT 1;
 SELECT coalesce(jsonb_agg((to_jsonb(r)-'base_snapshot')||jsonb_build_object(
   'reason',CASE WHEN salary OR NOT r.changes ? 'salary' THEN r.reason ELSE 'Información salarial restringida' END,
   'changes',CASE WHEN salary THEN r.changes ELSE r.changes-'salary' END,
   'before_values',CASE WHEN salary THEN r.before_values ELSE r.before_values-'salary' END,
   'has_salary',r.changes ? 'salary',
   'generated_path',CASE WHEN salary OR NOT r.changes ? 'salary' THEN r.generated_path END,
   'signed_path',CASE WHEN salary OR NOT r.changes ? 'salary' THEN r.signed_path END,
   'events',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id),'[]') FROM amendment_private.events e WHERE e.amendment_id=r.id)) ORDER BY r.effective_on DESC,r.number DESC),'[]') INTO rows
 FROM amendment_private.records r WHERE r.employee_id=employee;
 result:=jsonb_build_object('records',rows,'snapshot',CASE WHEN salary THEN snap ELSE snap-'salary' END,'contract',current_contract,
 'cycle_id',cycle,'observed_on',(SELECT observed_on FROM amendment_private.baselines WHERE cycle_id=cycle),
 'template',(SELECT to_jsonb(t) FROM amendment_private.templates t WHERE t.company_id=company ORDER BY created_at DESC LIMIT 1),
 'can_manage',amendment_private.can(company,'otrosi','create') AND amendment_private.can(company,'otrosi','update'),
 'can_correct',amendment_private.can(company,'correcciones_laborales','create') AND amendment_private.can(company,'correcciones_laborales','update'),
 'can_salary',salary AND amendment_private.can(company,'salarios','update'),
 'identity',(SELECT jsonb_build_object('employee_name',concat_ws(' ',e.first_name,e.middle_name,e.last_name,e.second_last_name),'employee_document',e.document_number,'company_name',c.name,'company_nit',c.nit) FROM public.employees_v2 e JOIN public.companies c ON c.id=e.company_id WHERE e.id=employee));
 RETURN result;
END $$;

CREATE FUNCTION public.employee_amendments(p_employee_id uuid,p_at_date date DEFAULT NULL) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT amendment_private.employee_data(p_employee_id,p_at_date) $$;
CREATE FUNCTION public.employee_amendment_command(p_action text,p_payload jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT amendment_private.command(p_action,p_payload) $$;

CREATE FUNCTION amendment_private.reconcile() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; t record; problem text; today date:=(now() AT TIME ZONE 'America/Bogota')::date; BEGIN
 FOR r IN SELECT id FROM amendment_private.records WHERE status='scheduled' AND effective_on<=(now() AT TIME ZONE 'America/Bogota')::date ORDER BY effective_on,number LIMIT 200 LOOP
   BEGIN PERFORM amendment_private.apply_record(r.id);
   EXCEPTION WHEN OTHERS THEN
     GET STACKED DIAGNOSTICS problem=MESSAGE_TEXT;
     UPDATE amendment_private.records SET status='needs_review',review_reason=problem WHERE id=r.id;
     INSERT INTO amendment_private.events(amendment_id,action,details) VALUES(r.id,'needs_review',jsonb_build_object('reason',problem));
   END;
 END LOOP;
 -- A cut can defer the operational schedule to the first open date. Activate
 -- these versions independently of whether anybody opens the employee screen.
 FOR r IN SELECT DISTINCT a.cycle_id FROM amendment_private.records a JOIN public.employee_employment_cycles ec ON ec.id=a.cycle_id
 WHERE a.status='applied' AND ec.status='active' AND (a.changes ? 'schedule' OR a.changes ? 'center') LOOP
   PERFORM pg_advisory_xact_lock(hashtextextended('amendment:'||r.cycle_id::text,0));
   INSERT INTO amendment_private.write_context VALUES(txid_current(),r.cycle_id) ON CONFLICT DO NOTHING;
   FOR t IN SELECT * FROM public.employee_time_config WHERE employment_cycle_id=r.cycle_id AND is_active AND end_date<today FOR UPDATE LOOP
     INSERT INTO payroll_private.write_context VALUES(txid_current(),t.id,'version') ON CONFLICT DO NOTHING;
     UPDATE public.employee_time_config SET is_active=false WHERE id=t.id;
     DELETE FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=t.id AND kind='version';
   END LOOP;
   FOR t IN SELECT * FROM public.employee_time_config WHERE employment_cycle_id=r.cycle_id AND NOT is_active AND start_date<=today AND (end_date IS NULL OR end_date>=today) FOR UPDATE LOOP
     INSERT INTO payroll_private.write_context VALUES(txid_current(),t.id,'version') ON CONFLICT DO NOTHING;
     UPDATE public.employee_time_config SET is_active=true WHERE id=t.id;
     DELETE FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=t.id AND kind='version';
   END LOOP;
   DELETE FROM amendment_private.write_context WHERE tx=txid_current() AND cycle_id=r.cycle_id;
 END LOOP;
END $$;

-- Private, immutable objects. No UPDATE/DELETE policy: upload paths are unique.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('amendments','amendments',false,20971520,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
CREATE FUNCTION amendment_private.file_access(path text, writing boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE parts text[]:=string_to_array(path,'/'); company uuid; r amendment_private.records;
BEGIN
 company:=parts[1]::uuid;
 IF NOT amendment_private.can(company,'otrosi',CASE WHEN writing THEN 'update' ELSE 'view' END) THEN RETURN false; END IF;
 IF parts[2]='templates' THEN RETURN array_length(parts,1)=3 AND right(path,5)='.docx'; END IF;
 SELECT * INTO r FROM amendment_private.records WHERE id=parts[2]::uuid AND company_id=company;
 RETURN r.id IS NOT NULL AND public.has_employee_v2_access(r.employee_id)
 AND parts[3]=r.revision::text AND array_length(parts,1)=4
 AND (NOT r.changes ? 'salary' OR amendment_private.can(company,'salarios','view'))
 AND (NOT writing OR (r.status IN ('draft','awaiting_signature') AND parts[3]=r.revision::text AND array_length(parts,1)=4));
EXCEPTION WHEN invalid_text_representation THEN RETURN false;
END $$;
CREATE POLICY amendment_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='amendments' AND amendment_private.file_access(name));
CREATE POLICY amendment_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='amendments' AND amendment_private.file_access(name,true));
CREATE POLICY amendment_files_read_boundary ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(bucket_id<>'amendments' OR amendment_private.file_access(name));
CREATE POLICY amendment_files_insert_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'amendments' OR amendment_private.file_access(name,true));
CREATE POLICY amendment_files_no_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'amendments') WITH CHECK(bucket_id<>'amendments');
CREATE POLICY amendment_files_no_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'amendments');
CREATE FUNCTION amendment_private.document_access(id_value uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT EXISTS(SELECT 1 FROM amendment_private.records WHERE document_id=id_value) OR EXISTS(
 SELECT 1 FROM amendment_private.records r WHERE document_id=id_value AND amendment_private.file_access(r.signed_path))
$$;
CREATE POLICY amendment_document_read ON public.employee_documents AS RESTRICTIVE FOR SELECT TO authenticated USING(amendment_private.document_access(id));
CREATE FUNCTION amendment_private.guard_document() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM amendment_private.records WHERE document_id=OLD.id) THEN RAISE EXCEPTION 'El soporte de un Otrosí confirmado es inmutable'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER amendment_document_guard BEFORE UPDATE OR DELETE ON public.employee_documents FOR EACH ROW EXECUTE FUNCTION amendment_private.guard_document();

-- Guard only business conditions. Completion, termination and identity routines
-- may still update their own fields. First-time setup remains possible.
CREATE FUNCTION amendment_private.guard_conditions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cycle uuid; fields text[]; previous jsonb; nextdoc jsonb; k text; active_contract boolean;
BEGIN
 previous:=CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) ELSE '{}' END;
 nextdoc:=CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) ELSE '{}' END;
 cycle:=coalesce((previous->>'employment_cycle_id')::uuid,(nextdoc->>'employment_cycle_id')::uuid);
 IF cycle IS NULL OR EXISTS(SELECT 1 FROM amendment_private.write_context WHERE tx=txid_current() AND cycle_id=cycle) THEN RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END IF;
 SELECT EXISTS(SELECT 1 FROM public.contracts c JOIN public.employee_employment_cycles ec ON ec.id=c.employment_cycle_id WHERE ec.id=cycle AND ec.status='active' AND NOT coalesce(c.is_terminated,false)) INTO active_contract;
 IF NOT active_contract THEN RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END IF;
 IF TG_OP='INSERT' THEN
   -- The original contract / initial schedule may be completed after hiring.
   IF TG_TABLE_NAME='contracts' THEN RAISE EXCEPTION 'La vinculación ya tiene contrato. Registre un Otrosí' USING ERRCODE='42501'; END IF;
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE employment_cycle_id=$1)',TG_TABLE_NAME) INTO active_contract USING cycle;
   IF NOT active_contract THEN RETURN NEW; END IF;
   RAISE EXCEPTION 'Registre el cambio desde Otrosí o Corregir error de captura' USING ERRCODE='42501';
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Conserve el historial laboral; utilice Otrosí o corrección' USING ERRCODE='42501'; END IF;
 fields:=CASE TG_TABLE_NAME
 WHEN 'employee_work_info' THEN ARRAY['position_id','position_name','operation_center_id','link_type','valid_from','valid_to','is_current']
 WHEN 'employee_schedule' THEN ARRAY['rest_day','shift_type_id','is_office_schedule','valid_from','valid_to','is_current']
 WHEN 'employee_time_config' THEN ARRAY['mode','work_schedule_id','shift_cycle_id','cycle_start_date','start_date','end_date','is_active']
 WHEN 'contracts' THEN ARRAY['salary','contract_type','work_labor_description','end_date','amendment_effective_on'] END;
 fields:=fields||ARRAY['employee_id','company_id','employment_cycle_id'];
 FOREACH k IN ARRAY fields LOOP
   IF previous->k IS DISTINCT FROM nextdoc->k THEN RAISE EXCEPTION 'Registre el cambio de % desde Otrosí o Corregir error de captura',k USING ERRCODE='42501'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['employee_work_info','employee_schedule','employee_time_config','contracts'] LOOP
 EXECUTE format('CREATE TRIGGER amendment_conditions_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION amendment_private.guard_conditions()',t);
 END LOOP;
END $$;

-- Capture observed conditions without claiming that they were true since hiring.
-- Center changes on an open schedule can come only from the amendment gateway.
-- Retain the payroll guard's checks against BOTH old and new closed scopes.
DO $$ DECLARE original text; patched text; needle text; replacement text; BEGIN
 SELECT pg_get_functiondef('payroll_private.row_guard()'::regprocedure) INTO original;
 needle:=$code$IF olddoc->>'operation_center_id' IS NOT NULL OR NEW.operation_center_id IS DISTINCT FROM payroll_private.employee_center(company,(newdoc->>'employee_id')::uuid,(newdoc->>'employment_cycle_id')::uuid,(newdoc->>col)::date) THEN$code$;
 replacement:=$code$IF (olddoc->>'operation_center_id' IS NOT NULL OR NEW.operation_center_id IS DISTINCT FROM payroll_private.employee_center(company,(newdoc->>'employee_id')::uuid,(newdoc->>'employment_cycle_id')::uuid,(newdoc->>col)::date))
 AND NOT (TG_TABLE_NAME='employee_time_config' AND EXISTS(SELECT 1 FROM amendment_private.write_context WHERE tx=txid_current() AND cycle_id=(newdoc->>'employment_cycle_id')::uuid)
 AND NEW.operation_center_id IS NOT DISTINCT FROM payroll_private.employee_center(company,(newdoc->>'employee_id')::uuid,(newdoc->>'employment_cycle_id')::uuid,(newdoc->>col)::date)) THEN$code$;
 patched:=replace(original,needle,replacement);
 IF patched=original THEN RAISE EXCEPTION 'Revise la protección de centros de nómina antes de instalar Otrosí'; END IF;
 EXECUTE patched;
END $$;

INSERT INTO amendment_private.baselines(cycle_id,employee_id,company_id,contract_id,observed_on,snapshot)
SELECT ec.id,ec.employee_id,ec.company_id,c.id,(now() AT TIME ZONE 'America/Bogota')::date,amendment_private.snapshot(ec.id)
FROM public.employee_employment_cycles ec JOIN public.contracts c ON c.employment_cycle_id=ec.id AND NOT coalesce(c.is_terminated,false)
WHERE ec.status='active' AND amendment_private.snapshot(ec.id) IS NOT NULL ON CONFLICT DO NOTHING;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA amendment_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION amendment_private.command(text,jsonb),amendment_private.employee_data(uuid,date),amendment_private.file_access(text,boolean),amendment_private.document_access(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.employee_amendments(uuid,date),public.employee_amendment_command(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.employee_amendments(uuid,date),public.employee_amendment_command(text,jsonb) TO authenticated;
SELECT cron.schedule('employee-amendments-apply','* * * * *','SELECT amendment_private.reconcile()');
