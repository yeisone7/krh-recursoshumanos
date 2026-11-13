ALTER TABLE amendment_private.records
  DROP CONSTRAINT records_kind_check,
  ADD CONSTRAINT records_kind_check CHECK (kind IN ('amendment','correction','direct')),
  ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE amendment_private.records
  ADD CONSTRAINT records_contract_required CHECK (kind='direct' OR contract_id IS NOT NULL);

ALTER TABLE amendment_private.baselines ALTER COLUMN contract_id DROP NOT NULL;

CREATE FUNCTION amendment_private.comparable(field text, value jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT CASE
    WHEN field='position' AND value->>'id' IS NULL THEN value
    WHEN field='schedule' THEN value-'label'-'is_office_schedule'
    ELSE value-'label'
  END
$$;

CREATE OR REPLACE FUNCTION amendment_private.snapshot(cycle uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object(
    'position',jsonb_build_object('id',w.position_id,'label',w.position_name),
    'center',jsonb_build_object('id',w.operation_center_id,'label',oc.name),
    'link_type',jsonb_build_object('code',w.link_type),
    'rest_day',jsonb_build_object('value',s.rest_day),
    'schedule',jsonb_build_object('mode',t.mode,'work_schedule_id',t.work_schedule_id,'shift_cycle_id',t.shift_cycle_id,
      'cycle_start_date',t.cycle_start_date,'shift_type_id',s.shift_type_id,'is_office_schedule',s.is_office_schedule,
      'label',coalesce(ws.name,sc.name)))
    || CASE WHEN c.id IS NULL THEN '{}'::jsonb ELSE jsonb_build_object(
      'salary',jsonb_build_object('amount',c.salary),
      'contract_type',jsonb_build_object('code',c.contract_type,'label',coalesce(ct.display_name,c.contract_type),
        'end_date',c.end_date,'work_labor_description',c.work_labor_description)) END
  FROM public.employee_employment_cycles ec
  LEFT JOIN LATERAL (SELECT * FROM public.contracts WHERE employment_cycle_id=ec.id
    AND NOT coalesce(is_terminated,false) ORDER BY created_at DESC,id DESC LIMIT 1) c ON true
  JOIN LATERAL (SELECT * FROM public.employee_work_info WHERE employment_cycle_id=ec.id AND is_current
    ORDER BY valid_from DESC,created_at DESC,id DESC LIMIT 1) w ON true
  LEFT JOIN public.operation_centers oc ON oc.id=w.operation_center_id
  LEFT JOIN public.contract_type_config ct ON ct.company_id=ec.company_id AND ct.contract_type=c.contract_type
  LEFT JOIN LATERAL (SELECT * FROM public.employee_schedule WHERE employment_cycle_id=ec.id AND is_current
    ORDER BY valid_from DESC,created_at DESC,id DESC LIMIT 1) s ON true
  LEFT JOIN LATERAL (SELECT * FROM public.employee_time_config WHERE employment_cycle_id=ec.id AND is_active
    ORDER BY start_date DESC,created_at DESC,id DESC LIMIT 1) t ON true
  LEFT JOIN public.work_schedules ws ON ws.id=t.work_schedule_id
  LEFT JOIN public.shift_cycles sc ON sc.id=t.shift_cycle_id
  WHERE ec.id=cycle
$$;

-- Excluding a scheduled record and its successors gives the exact state it
-- would take effect against. A direct edit is ordered after earlier events
-- on the same date and never rewrites the frozen values of a signed record.
CREATE FUNCTION amendment_private.timeline_at(
  cycle uuid, on_date date, before_number bigint DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE
  baseline amendment_private.baselines;
  result jsonb := '{}';
  entry record;
  field text;
  value jsonb;
BEGIN
  SELECT * INTO baseline FROM amendment_private.baselines WHERE cycle_id=cycle;
  IF on_date>=baseline.observed_on THEN result:=baseline.snapshot; END IF;
  FOR entry IN
    SELECT * FROM amendment_private.records
    WHERE cycle_id=cycle AND confirmed_at IS NOT NULL AND status IN ('scheduled','applied')
      AND (before_number IS NULL OR (effective_on,number)<(on_date,before_number))
    ORDER BY effective_on,number
  LOOP
    IF entry.effective_on<=on_date THEN
      result:=result||entry.changes;
      IF entry.changes ? 'contract_type' THEN
        result:=result||jsonb_build_object('link_type',jsonb_build_object('code',entry.changes#>>'{contract_type,code}'));
      END IF;
    ELSE
      FOR field,value IN SELECT * FROM jsonb_each(entry.before_values) LOOP
        IF NOT result ? field AND (entry.declared_before OR on_date>=baseline.observed_on) THEN
          result:=result||jsonb_build_object(field,value);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN result;
END
$$;

CREATE OR REPLACE FUNCTION amendment_private.conditions(cycle uuid, on_date date) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT amendment_private.timeline_at(cycle,on_date)
$$;

CREATE FUNCTION amendment_private.review_direct_conflicts(cycle uuid, fields text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  entry amendment_private.records;
  expected jsonb;
  conflict boolean;
BEGIN
  FOR entry IN SELECT * FROM amendment_private.records r
    WHERE r.cycle_id=cycle AND r.status='scheduled' AND r.changes ?| fields
    ORDER BY r.effective_on,r.number FOR UPDATE
  LOOP
    expected:=amendment_private.timeline_at(cycle,entry.effective_on,entry.number);
    SELECT EXISTS (
      SELECT 1 FROM unnest(fields) AS field
      WHERE entry.changes ? field AND expected ? field
        AND amendment_private.comparable(field,expected->field)
          IS DISTINCT FROM amendment_private.comparable(field,entry.before_values->field)
    ) INTO conflict;
    IF conflict THEN
      UPDATE amendment_private.records
      SET status='needs_review', review_reason='Una edición directa cambió las condiciones de partida',
          updated_at=clock_timestamp()
      WHERE id=entry.id;
      INSERT INTO amendment_private.events(amendment_id,action,actor_id,details)
      VALUES(entry.id,'needs_review',auth.uid(),'{"reason":"direct_edit_conflict"}');
    END IF;
  END LOOP;
END
$$;

-- Row mutations already hold their row lock. Try the cycle lock instead of
-- waiting behind an amendment that may itself be waiting on this row.
CREATE OR REPLACE FUNCTION amendment_private.guard_conditions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  previous jsonb := CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) ELSE '{}' END;
  nextdoc jsonb := CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) ELSE '{}' END;
  cycle uuid := coalesce((previous->>'employment_cycle_id')::uuid,(nextdoc->>'employment_cycle_id')::uuid);
  active_contract boolean;
  condition_fields text[];
  changed boolean;
BEGIN
  IF EXISTS(SELECT 1 FROM amendment_private.write_context WHERE tx=txid_current() AND cycle_id=cycle) THEN
    RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP='UPDATE' AND TG_TABLE_NAME='contracts' AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(ARRAY['salary','salary_type','transport_allowance','other_allowances']) AS field
    WHERE previous->field IS DISTINCT FROM nextdoc->field
  ) AND NOT (
    amendment_private.can(OLD.company_id,'salarios','view') AND amendment_private.can(OLD.company_id,'salarios','update')
  ) THEN
    RAISE EXCEPTION 'Sin permiso para modificar salarios' USING ERRCODE='42501';
  END IF;

  IF cycle IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.employee_employment_cycles WHERE id=cycle AND status='active'
  ) THEN
    RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.contracts WHERE employment_cycle_id=cycle AND NOT coalesce(is_terminated,false))
    INTO active_contract;

  IF TG_OP='DELETE' THEN
    IF active_contract THEN RAISE EXCEPTION 'Conserve el historial de la vinculación activa' USING ERRCODE='42501'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP='INSERT' AND TG_TABLE_NAME='contracts' AND active_contract THEN
    RAISE EXCEPTION 'La vinculación ya tiene un contrato activo' USING ERRCODE='42501';
  END IF;
  IF TG_OP='UPDATE' AND EXISTS (
    SELECT 1 FROM unnest(ARRAY['employee_id','company_id','employment_cycle_id','amendment_effective_on']) AS field
    WHERE previous->field IS DISTINCT FROM nextdoc->field
  ) THEN
    RAISE EXCEPTION 'No puede cambiar la identidad de la vinculación ni la vigencia de un Otrosí' USING ERRCODE='42501';
  END IF;

  condition_fields:=CASE TG_TABLE_NAME
    WHEN 'employee_work_info' THEN ARRAY['position_id','position_name','operation_center_id','link_type']
    WHEN 'employee_schedule' THEN ARRAY['rest_day','shift_type_id','is_office_schedule']
    WHEN 'employee_time_config' THEN ARRAY['mode','work_schedule_id','shift_cycle_id','cycle_start_date']
    WHEN 'contracts' THEN ARRAY['salary','contract_type','end_date','work_labor_description'] END;

  SELECT EXISTS(SELECT 1 FROM unnest(condition_fields) AS field
    WHERE previous->field IS DISTINCT FROM nextdoc->field) INTO changed;
  IF TG_OP='UPDATE' AND changed AND (
    (TG_TABLE_NAME IN ('employee_work_info','employee_schedule') AND NOT coalesce((previous->>'is_current')::boolean,false))
    OR (TG_TABLE_NAME='employee_time_config' AND NOT coalesce((previous->>'is_active')::boolean,false))
  ) AND (active_contract OR EXISTS (
    SELECT 1 FROM amendment_private.records WHERE cycle_id=cycle AND status='applied'
  )) THEN
    RAISE EXCEPTION 'Las condiciones de una versión histórica no se editan directamente' USING ERRCODE='42501';
  END IF;

  IF changed AND NOT pg_try_advisory_xact_lock(hashtextextended('amendment:'||cycle::text,0)) THEN
    RAISE EXCEPTION 'Hay otro cambio laboral en curso. Intente guardar nuevamente' USING ERRCODE='40001';
  END IF;
  -- An edited duration keeps previous extension rules. A change of type
  -- resets which extensions are relevant to the current contract.
  IF TG_OP='UPDATE' AND TG_TABLE_NAME='contracts' THEN
    IF OLD.contract_type IS DISTINCT FROM NEW.contract_type AND NOT coalesce(NEW.is_terminated,false) THEN
      NEW.amendment_effective_on:=(now() AT TIME ZONE 'America/Bogota')::date;
    END IF;
  END IF;
  RETURN NEW;
END
$$;
-- Optional amendments and automatic history for authorized direct edits.

CREATE OR REPLACE FUNCTION amendment_private.apply_record(record_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r amendment_private.records; k text; v jsonb; next_date date; current_center uuid; old_center uuid; today date:=(now() AT TIME ZONE 'America/Bogota')::date;
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
 IF EXISTS (
   SELECT 1 FROM jsonb_object_keys(r.changes) AS field
   CROSS JOIN LATERAL (SELECT amendment_private.timeline_at(r.cycle_id,r.effective_on,r.number) AS prior) AS timeline
   WHERE EXISTS (
     SELECT 1 FROM amendment_private.records direct
     WHERE direct.cycle_id=r.cycle_id AND direct.kind='direct' AND direct.changes ? field
       AND (direct.effective_on,direct.number)<(r.effective_on,r.number)
   ) AND timeline.prior ? field
     AND amendment_private.comparable(field,timeline.prior->field)
       IS DISTINCT FROM amendment_private.comparable(field,r.before_values->field)
 ) THEN
   UPDATE amendment_private.records SET status='needs_review',
     review_reason='Una edición directa cambió las condiciones de partida',updated_at=clock_timestamp()
   WHERE id=r.id;
   INSERT INTO amendment_private.events(amendment_id,action,details)
   VALUES(r.id,'needs_review','{"reason":"direct_edit_conflict"}');
   RETURN;
 END IF;
 INSERT INTO amendment_private.write_context VALUES(txid_current(),r.cycle_id) ON CONFLICT DO NOTHING;
 SELECT operation_center_id INTO old_center FROM public.employee_work_info WHERE employment_cycle_id=r.cycle_id AND is_current LIMIT 1;
 FOR k,v IN SELECT * FROM jsonb_each(r.changes) LOOP
   SELECT min(effective_on) INTO next_date FROM amendment_private.records WHERE cycle_id=r.cycle_id AND id<>r.id
   AND status IN ('scheduled','applied')
   AND (effective_on>r.effective_on OR (effective_on=r.effective_on AND kind='direct' AND number>r.number))
   AND (changes ? k OR (k='contract_type' AND changes ? 'link_type'));
   CASE k
   WHEN 'position' THEN PERFORM amendment_private.version_rows('employee_work_info',r.cycle_id,r.effective_on,next_date,jsonb_build_object('position_id',v->>'id','position_name',v->>'label'));
   WHEN 'center' THEN
     PERFORM amendment_private.version_rows('employee_work_info',r.cycle_id,r.effective_on,next_date,jsonb_build_object('operation_center_id',v->>'id'));
     PERFORM amendment_private.version_rows('employee_time_config',r.cycle_id,r.effective_on,next_date,jsonb_build_object('operation_center_id',v->>'id'));
   WHEN 'contract_type' THEN PERFORM amendment_private.version_rows('employee_work_info',r.cycle_id,r.effective_on,next_date,jsonb_build_object('link_type',v->>'code'));
   WHEN 'rest_day' THEN PERFORM amendment_private.version_rows('employee_schedule',r.cycle_id,r.effective_on,next_date,jsonb_build_object('rest_day',v->>'value'));
   WHEN 'schedule' THEN
     PERFORM amendment_private.version_rows('employee_schedule',r.cycle_id,r.effective_on,next_date,jsonb_build_object('is_office_schedule',v->>'mode'='administrative','shift_type_id',v->'shift_type_id'));
     PERFORM amendment_private.version_rows('employee_time_config',r.cycle_id,r.effective_on,next_date,v-'label'-'shift_type_id'-'is_office_schedule');
   ELSE NULL;
   END CASE;
   IF k='salary' AND (next_date IS NULL OR next_date>today) THEN
     UPDATE public.contracts SET salary=(v->>'amount')::numeric WHERE id=r.contract_id;
   END IF;
   IF k='contract_type' AND NOT EXISTS (
     SELECT 1 FROM amendment_private.records later
     WHERE later.contract_id=r.contract_id AND later.id<>r.id
       AND later.status IN ('scheduled','applied') AND later.effective_on<=today
       AND (later.effective_on,later.number)>(r.effective_on,r.number)
       AND later.changes ? 'contract_type'
   ) THEN
     UPDATE public.contracts
     SET contract_type=v->>'code', end_date=(v->>'end_date')::date,
         work_labor_description=v->>'work_labor_description', amendment_effective_on=r.effective_on
     WHERE id=r.contract_id;
   END IF;
 END LOOP;
 SELECT operation_center_id INTO current_center FROM public.employee_work_info
 WHERE employment_cycle_id=r.cycle_id AND is_current ORDER BY valid_from DESC,id DESC LIMIT 1;
 IF old_center IS DISTINCT FROM current_center THEN
   DELETE FROM public.employee_operation_center_assignments WHERE employment_cycle_id=r.cycle_id AND operation_center_id=old_center;
   IF current_center IS NOT NULL THEN
     INSERT INTO public.employee_operation_center_assignments(employee_id,company_id,employment_cycle_id,operation_center_id,created_by)
     VALUES(r.employee_id,r.company_id,r.cycle_id,current_center,r.created_by) ON CONFLICT DO NOTHING;
   END IF;
 END IF;
 UPDATE amendment_private.records SET status='applied',applied_at=clock_timestamp(),review_reason=NULL WHERE id=r.id;
 INSERT INTO amendment_private.events(amendment_id,action,actor_id) VALUES(r.id,'applied',auth.uid());
 DELETE FROM amendment_private.write_context WHERE tx=txid_current() AND cycle_id=r.cycle_id;
END $$;

CREATE OR REPLACE FUNCTION amendment_private.command(action text, payload jsonb) RETURNS uuid
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
 IF r.kind='direct' THEN RAISE EXCEPTION 'Una edición directa es de solo lectura'; END IF;
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
   IF EXISTS(SELECT 1 FROM amendment_private.records x WHERE x.cycle_id=r.cycle_id AND x.id<>r.id AND x.kind<>'direct' AND x.status IN ('scheduled','applied') AND x.effective_on>r.effective_on AND x.changes ?| ARRAY(SELECT jsonb_object_keys(r.changes))) THEN RAISE EXCEPTION 'Hay documentos posteriores dependientes. Revise su secuencia antes de cancelar'; END IF;
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
   IF coalesce(payload->>'kind','') NOT IN ('amendment','correction') THEN RAISE EXCEPTION 'Tipo de registro inválido'; END IF;
   IF payload->>'kind'='correction' AND d>today THEN RAISE EXCEPTION 'Una corrección no puede ser futura'; END IF;
   changes:=amendment_private.normalize(company,payload->'changes');
   IF changes ? 'contract_type' AND (changes#>>'{contract_type,end_date}')::date<d THEN RAISE EXCEPTION 'El vencimiento debe ser posterior o igual a la vigencia'; END IF;
   INSERT INTO amendment_private.baselines(cycle_id,employee_id,company_id,contract_id,observed_on,snapshot)
   VALUES(cycle.id,employee,company,contract.id,today,snap) ON CONFLICT DO NOTHING;
   SELECT * INTO b FROM amendment_private.baselines WHERE cycle_id=cycle.id;
   prior:=amendment_private.conditions(cycle.id,d);
   IF d>=today THEN
     -- The first contract can be created after the cycle had its baseline.
     prior:=snap||prior;
   END IF;
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
     IF amendment_private.comparable(k,v) IS NOT DISTINCT FROM amendment_private.comparable(k,prior->k) THEN changes:=changes-k; prior:=prior-k; END IF;
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
   IF EXISTS(SELECT 1 FROM amendment_private.records x WHERE x.cycle_id=r.cycle_id AND x.id<>r.id AND x.kind<>'direct' AND x.status IN ('scheduled','applied') AND x.effective_on>=r.effective_on AND x.changes ?| ARRAY(SELECT jsonb_object_keys(r.changes))) THEN RAISE EXCEPTION 'Hay cambios posteriores. Subsane la secuencia antes de reintentar'; END IF;
   IF r.review_reason='Una edición directa cambió las condiciones de partida' AND EXISTS (
     SELECT 1 FROM jsonb_object_keys(r.changes) AS field
     CROSS JOIN LATERAL (SELECT amendment_private.timeline_at(r.cycle_id,r.effective_on,r.number) AS prior) AS timeline
     WHERE timeline.prior ? field AND amendment_private.comparable(field,timeline.prior->field)
       IS DISTINCT FROM amendment_private.comparable(field,r.before_values->field)
   ) THEN RAISE EXCEPTION 'Las condiciones de partida cambiaron. Revise el soporte antes de aplicar'; END IF;
   UPDATE amendment_private.records SET status='scheduled',review_reason=NULL WHERE id=r.id;
   PERFORM amendment_private.apply_record(r.id);
 ELSIF action IN ('generated','confirm') THEN
   IF r.id IS NULL THEN RAISE EXCEPTION 'Guarde el borrador primero'; END IF;
   IF action='confirm' AND r.status IN ('scheduled','applied') THEN RETURN r.id; END IF;
   IF r.status NOT IN ('draft','awaiting_signature') OR r.revision IS DISTINCT FROM (payload->>'revision')::integer THEN RAISE EXCEPTION 'Borrador desactualizado' USING ERRCODE='40001'; END IF;
   FOR k,v IN SELECT * FROM jsonb_each(r.changes) LOOP
     IF amendment_private.comparable(k,snap->k) IS DISTINCT FROM amendment_private.comparable(k,r.base_snapshot->k) THEN RAISE EXCEPTION 'Las condiciones cambiaron. Revise el borrador y renueve el soporte' USING ERRCODE='40001'; END IF;
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
       IF EXISTS(SELECT 1 FROM amendment_private.records x WHERE x.cycle_id=r.cycle_id AND x.id<>r.id AND x.status IN ('scheduled','applied') AND x.kind<>'direct' AND x.effective_on=r.effective_on AND x.changes ? k AND x.id IS DISTINCT FROM r.related_id) THEN RAISE EXCEPTION 'Ya hay un cambio de % confirmado para esa fecha',k; END IF;
       SELECT x.* INTO nextrow FROM amendment_private.records x WHERE x.cycle_id=r.cycle_id AND x.id<>r.id AND x.status IN ('scheduled','applied') AND x.effective_on>r.effective_on AND x.changes ? k ORDER BY x.effective_on,x.number LIMIT 1;
       IF nextrow.id IS NOT NULL AND nextrow.kind<>'direct' AND amendment_private.comparable(k,nextrow.before_values->k) IS DISTINCT FROM amendment_private.comparable(k,v) THEN RAISE EXCEPTION 'El retroactivo contradice el Otrosí % posterior (%). Revise la secuencia',nextrow.number,k; END IF;
       prior:=amendment_private.conditions(r.cycle_id,r.effective_on);
       IF r.effective_on>=today THEN prior:=snap||prior; END IF;
       IF prior ? k AND amendment_private.comparable(k,prior->k) IS DISTINCT FROM amendment_private.comparable(k,r.before_values->k) THEN RAISE EXCEPTION 'La secuencia de vigencias cambió. Revise el borrador y renueve el soporte' USING ERRCODE='40001'; END IF;
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

CREATE OR REPLACE FUNCTION amendment_private.employee_data(employee uuid, at_date date DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; result jsonb; rows jsonb; cycle uuid; snap jsonb; salary boolean; current_contract jsonb;
BEGIN
 company:=amendment_private.access_employee(employee);
 salary:=amendment_private.can(company,'salarios','view');
 SELECT id INTO cycle FROM public.employee_employment_cycles WHERE employee_id=employee AND status='active';
 snap:=CASE WHEN at_date IS NULL THEN amendment_private.snapshot(cycle) ELSE amendment_private.conditions(cycle,at_date) END;
 SELECT jsonb_build_object('id',id,'number',contract_number,'start_date',start_date) INTO current_contract FROM public.contracts WHERE employment_cycle_id=cycle AND NOT coalesce(is_terminated,false) ORDER BY created_at DESC LIMIT 1;
 SELECT coalesce(jsonb_agg((to_jsonb(r)-'base_snapshot')||jsonb_build_object(
   'reason',CASE WHEN r.kind='direct' THEN NULL WHEN salary OR NOT r.changes ? 'salary' THEN r.reason ELSE 'Información salarial restringida' END,
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


CREATE FUNCTION amendment_private.record_direct_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  actor uuid:=auth.uid();
  today date:=(now() AT TIME ZONE 'America/Bogota')::date;
  cycle uuid:=NEW.employment_cycle_id;
  before_state jsonb:='{}';
  after_state jsonb:='{}';
  current_state jsonb;
  prior jsonb:='{}';
  changes jsonb:='{}';
  field text;
  value jsonb;
  active_contract_id uuid;
  actor_label text;
  entry_id uuid;
  earlier_time public.employee_time_config;
BEGIN
  IF actor IS NULL OR cycle IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.employee_employment_cycles ec
    WHERE ec.id=cycle AND ec.status='active' AND ec.employee_id=NEW.employee_id AND ec.company_id=NEW.company_id
  ) OR EXISTS(SELECT 1 FROM amendment_private.write_context WHERE tx=txid_current() AND cycle_id=cycle) THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME='contracts' THEN
    IF TG_OP='INSERT' OR coalesce(NEW.is_terminated,false) OR coalesce(OLD.is_terminated,false)
      OR (NEW.salary,NEW.contract_type,NEW.end_date,NEW.work_labor_description) IS NOT DISTINCT FROM
         (OLD.salary,OLD.contract_type,OLD.end_date,OLD.work_labor_description) THEN RETURN NEW; END IF;
    active_contract_id:=NEW.id;
    SELECT jsonb_build_object('salary',jsonb_build_object('amount',OLD.salary),
      'contract_type',jsonb_build_object('code',OLD.contract_type,'label',coalesce(t.display_name,OLD.contract_type),
        'end_date',OLD.end_date,'work_labor_description',OLD.work_labor_description))
    INTO before_state FROM (SELECT 1) AS seed
    LEFT JOIN public.contract_type_config t ON t.company_id=OLD.company_id AND t.contract_type=OLD.contract_type;
    SELECT jsonb_build_object('salary',jsonb_build_object('amount',NEW.salary),
      'contract_type',jsonb_build_object('code',NEW.contract_type,'label',coalesce(t.display_name,NEW.contract_type),
        'end_date',NEW.end_date,'work_labor_description',NEW.work_labor_description))
    INTO after_state FROM (SELECT 1) AS seed
    LEFT JOIN public.contract_type_config t ON t.company_id=NEW.company_id AND t.contract_type=NEW.contract_type;
  ELSIF TG_TABLE_NAME='employee_work_info' THEN
    IF TG_OP='INSERT' OR NOT NEW.is_current OR old.valid_from>today OR
      (NEW.position_id,NEW.position_name,NEW.operation_center_id,NEW.link_type) IS NOT DISTINCT FROM
      (OLD.position_id,OLD.position_name,OLD.operation_center_id,OLD.link_type) THEN RETURN NEW; END IF;
    SELECT jsonb_build_object(
      'position',jsonb_build_object('id',OLD.position_id,'label',OLD.position_name),
      'center',jsonb_build_object('id',OLD.operation_center_id,'label',oc.name),
      'link_type',jsonb_build_object('code',OLD.link_type))
    INTO before_state FROM (SELECT 1) AS seed
    LEFT JOIN public.operation_centers oc ON oc.id=OLD.operation_center_id;
    SELECT jsonb_build_object(
      'position',jsonb_build_object('id',NEW.position_id,'label',NEW.position_name),
      'center',jsonb_build_object('id',NEW.operation_center_id,'label',oc.name),
      'link_type',jsonb_build_object('code',NEW.link_type))
    INTO after_state FROM (SELECT 1) AS seed
    LEFT JOIN public.operation_centers oc ON oc.id=NEW.operation_center_id;
  ELSIF TG_TABLE_NAME='employee_schedule' THEN
    IF NOT NEW.is_current OR (TG_OP='UPDATE' AND
      (NEW.rest_day,NEW.shift_type_id,NEW.is_office_schedule) IS NOT DISTINCT FROM
      (OLD.rest_day,OLD.shift_type_id,OLD.is_office_schedule)) THEN RETURN NEW; END IF;
    IF TG_OP='INSERT' AND NOT EXISTS(
      SELECT 1 FROM public.employee_work_info WHERE employment_cycle_id=cycle AND created_at<transaction_timestamp()
    ) THEN RETURN NEW; END IF;
    current_state:=amendment_private.snapshot(cycle);
    after_state:=jsonb_build_object(
      'rest_day',jsonb_build_object('value',NEW.rest_day),
      'schedule',coalesce(current_state->'schedule','{}')||jsonb_build_object(
        'shift_type_id',NEW.shift_type_id,'is_office_schedule',NEW.is_office_schedule));
    before_state:=jsonb_build_object(
      'rest_day',jsonb_build_object('value',CASE WHEN TG_OP='UPDATE' THEN OLD.rest_day END),
      'schedule',coalesce(after_state->'schedule','{}')||jsonb_build_object(
        'shift_type_id',CASE WHEN TG_OP='UPDATE' THEN OLD.shift_type_id END,
        'is_office_schedule',CASE WHEN TG_OP='UPDATE' THEN OLD.is_office_schedule END));
  ELSE
    IF NOT NEW.is_active OR (TG_OP='UPDATE' AND
      (NEW.mode,NEW.work_schedule_id,NEW.shift_cycle_id,NEW.cycle_start_date) IS NOT DISTINCT FROM
      (OLD.mode,OLD.work_schedule_id,OLD.shift_cycle_id,OLD.cycle_start_date)) THEN RETURN NEW; END IF;
    IF TG_OP='UPDATE' THEN earlier_time:=OLD;
    ELSE
      SELECT * INTO earlier_time FROM public.employee_time_config
      WHERE employment_cycle_id=cycle AND id<>NEW.id AND start_date<=NEW.start_date
      ORDER BY start_date DESC,created_at DESC,id DESC LIMIT 1;
      IF earlier_time.id IS NULL AND NOT EXISTS(
        SELECT 1 FROM public.employee_work_info WHERE employment_cycle_id=cycle AND created_at<transaction_timestamp()
      ) THEN RETURN NEW; END IF;
    END IF;
    current_state:=amendment_private.snapshot(cycle);
    SELECT jsonb_build_object('schedule',coalesce(current_state->'schedule','{}')||jsonb_build_object(
      'mode',NEW.mode,'work_schedule_id',NEW.work_schedule_id,'shift_cycle_id',NEW.shift_cycle_id,
      'cycle_start_date',NEW.cycle_start_date,'label',coalesce(ws.name,sc.name)))
    INTO after_state FROM (SELECT 1) AS seed
    LEFT JOIN public.work_schedules ws ON ws.id=NEW.work_schedule_id
    LEFT JOIN public.shift_cycles sc ON sc.id=NEW.shift_cycle_id;
    SELECT jsonb_build_object('schedule',coalesce(after_state->'schedule','{}')||jsonb_build_object(
      'mode',earlier_time.mode,'work_schedule_id',earlier_time.work_schedule_id,'shift_cycle_id',earlier_time.shift_cycle_id,
      'cycle_start_date',earlier_time.cycle_start_date,'label',coalesce(ws.name,sc.name)))
    INTO before_state FROM (SELECT 1) AS seed
    LEFT JOIN public.work_schedules ws ON ws.id=earlier_time.work_schedule_id
    LEFT JOIN public.shift_cycles sc ON sc.id=earlier_time.shift_cycle_id;
  END IF;

  FOR field,value IN SELECT * FROM jsonb_each(after_state) LOOP
    IF value IS DISTINCT FROM before_state->field THEN
      changes:=changes||jsonb_build_object(field,value);
      prior:=prior||jsonb_build_object(field,before_state->field);
    END IF;
  END LOOP;
  IF changes='{}' THEN RETURN NEW; END IF;

  IF active_contract_id IS NULL THEN
    SELECT id INTO active_contract_id FROM public.contracts
    WHERE employment_cycle_id=cycle AND NOT coalesce(is_terminated,false)
    ORDER BY created_at DESC,id DESC LIMIT 1;
  END IF;
  current_state:=coalesce(amendment_private.snapshot(cycle),'{}');
  INSERT INTO amendment_private.baselines(cycle_id,employee_id,company_id,contract_id,observed_on,snapshot)
  VALUES(cycle,NEW.employee_id,NEW.company_id,active_contract_id,today,current_state||before_state)
  ON CONFLICT DO NOTHING;

  SELECT coalesce(display_name,full_name) INTO actor_label FROM public.user_profiles WHERE id=actor;
  INSERT INTO amendment_private.records(id,company_id,employee_id,cycle_id,contract_id,kind,status,
    effective_on,reason,changes,before_values,base_snapshot,created_by,actor_name,confirmed_at,confirmed_by,applied_at)
  VALUES(gen_random_uuid(),NEW.company_id,NEW.employee_id,cycle,active_contract_id,'direct','applied',
    today,'Edición directa',changes,prior,current_state,actor,coalesce(actor_label,auth.jwt()->>'email',actor::text),
    clock_timestamp(),actor,clock_timestamp())
  RETURNING id INTO entry_id;

  INSERT INTO amendment_private.events(amendment_id,action,actor_id) VALUES(entry_id,'direct_edit',actor);
  PERFORM amendment_private.review_direct_conflicts(cycle,ARRAY(SELECT jsonb_object_keys(changes)));
  RETURN NEW;
END
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['employee_work_info','employee_schedule','employee_time_config','contracts'] LOOP
    EXECUTE format('CREATE TRIGGER amendment_record_direct_edit AFTER INSERT OR UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION amendment_private.record_direct_edit()',table_name);
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION amendment_private.comparable(text,jsonb),
  amendment_private.timeline_at(uuid,date,bigint),
  amendment_private.review_direct_conflicts(uuid,text[]),
  amendment_private.record_direct_edit()
FROM PUBLIC, anon, authenticated;
