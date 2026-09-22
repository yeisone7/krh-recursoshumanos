-- Run inside BEGIN/ROLLBACK after attendance migrations. No fixture survives.
DO $$
DECLARE actor uuid; e record; p uuid; link jsonb; ctx jsonb; identity jsonb; result jsonb; repeated jsonb;
 session text; pin text; event_id uuid; idem uuid:=gen_random_uuid(); d uuid; q jsonb; req uuid; i integer; night uuid; start_time timestamptz; exit_event uuid; evidence_path text;
BEGIN
 SELECT user_id INTO actor FROM public.user_roles WHERE role::text IN ('super_admin','admin') ORDER BY (role::text='super_admin') DESC LIMIT 1;
 ASSERT actor IS NOT NULL, 'Fixture requires an admin';
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 SELECT emp.id,emp.company_id,emp.document_number,w.operation_center_id,c.id AS cycle_id INTO e
 FROM public.employees_v2 emp JOIN public.employee_employment_cycles c ON c.employee_id=emp.id AND c.status='active'
 JOIN public.employee_work_info w ON w.employee_id=emp.id AND w.employment_cycle_id=c.id AND w.is_current
 WHERE emp.is_active AND w.operation_center_id IS NOT NULL AND public.has_employee_v2_access(emp.id) LIMIT 1;
 ASSERT e.id IS NOT NULL, 'Fixture requires an active employee with center';
 INSERT INTO public.time_clock_points(company_id,operation_center_id,name,latitude,longitude,require_break_punches) VALUES(e.company_id,e.operation_center_id,'ROLLBACK attendance test '||gen_random_uuid(),4.65,-74.1,true) RETURNING id INTO p;
 link:=public.time_clock_manage_link(p,'get');
 ASSERT length(link->>'token')=64, 'Fixed link generated';
 result:=public.time_clock_issue_pin(e.id); pin:=result->>'pin';
 ASSERT length(pin)=6, 'PIN has six digits';
 ctx:=public.time_clock_public('context',jsonb_build_object('token',link->>'token'),'test-ip');
 identity:=public.time_clock_public('identify',jsonb_build_object('session',ctx->>'challenge','document',e.document_number,'pin',pin),'test-ip');
 ASSERT identity->>'session' IS NOT NULL, 'Valid credentials identify';
 ASSERT (identity->>'must_change')::boolean, 'Temporary PIN requires change';
 session:=identity->>'session';
 result:=public.time_clock_public('history',jsonb_build_object('session',session),'test-ip');
 ASSERT result->>'error'='PIN_CHANGE_REQUIRED', 'Temporary PIN cannot access history';
 result:=public.time_clock_public('change_pin',jsonb_build_object('session',session,'pin',CASE WHEN pin='748291' THEN '921847' ELSE '748291' END),'test-ip');
 ASSERT (result->>'success')::boolean, 'PIN can change';
 pin:=CASE WHEN pin='748291' THEN '921847' ELSE '748291' END;
 result:=public.time_clock_public('history',jsonb_build_object('session',session),'test-ip');
 ASSERT result ? 'events', 'Own history available';
 BEGIN
   PERFORM public.time_clock_public('punch',jsonb_build_object('session',session,'action','clock_in','idempotency_key',idem,'latitude',0,'longitude',0,'accuracy',5,'position_captured_at',now()),'test-ip');
   RAISE EXCEPTION 'TEST_FAILED: accepted outside geofence';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'OUTSIDE_ALLOWED_AREA' THEN RAISE; END IF; END;
 UPDATE public.time_clock_points SET require_clock_in_photo=true WHERE id=p;
 result:=public.time_clock_public_punch(jsonb_build_object('session',session,'action','clock_in','idempotency_key',idem,'latitude',4.65,'longitude',-74.1,'accuracy',5,'position_captured_at',now()),'test-ip',NULL);
 ASSERT result->>'error'='PHOTO_REQUIRED', 'Required entry photo cannot be omitted';
 evidence_path:=p::text||'/'||extract(year FROM now())::integer||'/'||gen_random_uuid()::text||'.jpg';
 result:=public.time_clock_public_punch(jsonb_build_object('session',session,'action','clock_in','idempotency_key',idem,'latitude',4.65,'longitude',-74.1,'accuracy',5,'position_captured_at',now()),'test-ip',evidence_path);
 ASSERT result->>'event_id' IS NOT NULL, 'Punch creates event';
 event_id:=(result->>'event_id')::uuid; d:=(result->>'day_id')::uuid;
 repeated:=public.time_clock_public('punch',jsonb_build_object('session',session,'action','clock_in','idempotency_key',idem),'test-ip');
 ASSERT repeated->>'event_id'=result->>'event_id' AND (repeated->>'duplicate')::boolean, 'Lost response retries return same event';
 ASSERT (SELECT count(*)=1 FROM public.time_clock_events WHERE employee_id=e.id AND idempotency_key=idem), 'No duplicate event';
 ASSERT (SELECT identity_method='pin' AND recorded_by IS NULL AND qr_kind='qr_static' FROM public.time_clock_events WHERE id=event_id), 'PIN audit without fake auth user';
 ASSERT (SELECT time_clock_events.photo_path=evidence_path AND photo_captured_at IS NOT NULL FROM public.time_clock_events WHERE id=event_id), 'Private photo is attached to entry';
 result:=public.time_clock_public('history',jsonb_build_object('session',session),'test-ip');
 ASSERT result->>'error'='SESSION_EXPIRED', 'Session consumed after punch';

 -- Replacement evidence is excluded; next-day exit belongs to the original day.
 UPDATE public.time_clock_events SET occurred_at=now()-interval '10 hours',created_at=now()-interval '10 hours' WHERE id=event_id;
 UPDATE public.time_clock_days SET expected_start=now()-interval '10 hours',expected_end=now(),scheduled_break_minutes=60,policy_snapshot='{"require_break_punches":false,"late_tolerance_minutes":5}' WHERE id=d;
 INSERT INTO public.time_clock_events(company_id,day_id,employee_id,employment_cycle_id,operation_center_id,action,occurred_at,recorded_by,idempotency_key,source,identity_method)
 VALUES(e.company_id,d,e.id,e.cycle_id,e.operation_center_id,'clock_out',now(),actor,gen_random_uuid(),'supervised','supervisor');
 PERFORM public.time_clock_recalculate_day(d);
 ASSERT (SELECT worked_minutes=540 AND break_minutes=60 FROM public.time_clock_days WHERE id=d), 'Scheduled break deducted once';
 INSERT INTO public.time_clock_events(company_id,day_id,employee_id,employment_cycle_id,operation_center_id,action,occurred_at,recorded_by,idempotency_key,source,identity_method,supersedes_event_id)
 VALUES(e.company_id,d,e.id,e.cycle_id,e.operation_center_id,'clock_in',now()-interval '9 hours',actor,gen_random_uuid(),'correction','correction',event_id);
 PERFORM public.time_clock_recalculate_day(d);
 ASSERT (SELECT worked_minutes=480 AND NOT ('invalid_sequence'=ANY(incident_codes)) FROM public.time_clock_days WHERE id=d), 'Replacement is counted once';
 PERFORM public.time_clock_recalculate_day(d);
 ASSERT (SELECT worked_minutes=480 FROM public.time_clock_days WHERE id=d), 'Recalculation is idempotent';

 ctx:=public.time_clock_public('context',jsonb_build_object('token',link->>'token'),'test-ip');
 identity:=public.time_clock_public('identify',jsonb_build_object('session',ctx->>'challenge','document',e.document_number,'pin',pin),'test-ip');
 session:=identity->>'session';
 result:=public.time_clock_public('correction',jsonb_build_object('session',session,'action','clock_out','requested_at',now()-interval '1 minute','work_date',(now() AT TIME ZONE 'America/Bogota')::date,'reason','Salida pendiente de revisión'),'test-ip');
 ASSERT result->>'id' IS NOT NULL, 'Employee can request correction';
 req:=(result->>'id')::uuid;
 PERFORM public.time_clock_resolve_correction(req,false,'No procede por registro ya existente');
 ASSERT (SELECT status='rejected' AND reviewed_by=actor FROM public.time_clock_correction_requests WHERE id=req), 'Review attributed to supervisor';
 PERFORM public.time_clock_manage_link(p,'regenerate');
 result:=public.time_clock_public('history',jsonb_build_object('session',session),'test-ip');
 ASSERT result->>'error'='SESSION_EXPIRED', 'Regeneration revokes sessions';
 result:=public.time_clock_public('context',jsonb_build_object('token',link->>'token'),'test-ip');
 ASSERT result->>'error'='LINK_UNAVAILABLE', 'Old printed link revoked';

 q:=public.time_clock_issue_qr(p);
 ctx:=public.time_clock_public('context',jsonb_build_object('point',p,'token',q->>'token'),'dynamic-ip');
 UPDATE public.time_clock_qr_sessions SET expires_at=now()-interval '1 second',created_at=now()-interval '1 minute' WHERE point_id=p;
 identity:=public.time_clock_public('identify',jsonb_build_object('session',ctx->>'challenge','document',e.document_number,'pin',pin),'dynamic-ip');
 ASSERT identity->>'session' IS NOT NULL, 'Exchanged QR survives original 30 second expiry';
 PERFORM public.time_clock_issue_pin(e.id);
 result:=public.time_clock_public('history',jsonb_build_object('session',identity->>'session'),'dynamic-ip');
 ASSERT result->>'error'='SESSION_EXPIRED', 'PIN reset revokes sessions';
 link:=public.time_clock_manage_link(p,'get');
 FOR i IN 1..6 LOOP
   ctx:=public.time_clock_public('context',jsonb_build_object('token',link->>'token'),'bad-ip');
   result:=public.time_clock_public('identify',jsonb_build_object('session',ctx->>'challenge','document','0000000000000000000','pin','111111'),'bad-ip');
 END LOOP;
 ASSERT result->>'error'='RATE_LIMITED', 'Five failures lock account bucket';
 ASSERT NOT has_function_privilege('anon','public.time_clock_public(text,jsonb,text)','EXECUTE'), 'Public role cannot bypass gateway';
 ASSERT NOT has_function_privilege('authenticated','public.time_clock_public(text,jsonb,text)','EXECUTE'), 'Authenticated users cannot bypass gateway';
 ASSERT NOT has_function_privilege('authenticated','public.time_clock_public_punch(jsonb,text,text)','EXECUTE'), 'Authenticated users cannot attach arbitrary photos';
 ASSERT NOT has_schema_privilege('authenticated','time_clock_private','USAGE'), 'Private secrets are inaccessible';
 ASSERT NOT has_function_privilege('authenticated','public.time_clock_recalculate_day(uuid)','EXECUTE'), 'Clients cannot recalculate arbitrary days';
 -- Multiple explicit pauses on a night shift, plus an approved exit correction.
 start_time:=(((now() AT TIME ZONE 'America/Bogota')::date-2)+time '22:00') AT TIME ZONE 'America/Bogota';
 INSERT INTO public.time_clock_days(company_id,employee_id,employment_cycle_id,operation_center_id,work_date,expected_start,expected_end,scheduled_break_minutes,policy_snapshot)
 VALUES(e.company_id,e.id,e.cycle_id,e.operation_center_id,(start_time AT TIME ZONE 'America/Bogota')::date,start_time,start_time+interval '8 hours',60,'{"require_break_punches":true,"late_tolerance_minutes":5}') RETURNING id INTO night;
 INSERT INTO public.time_clock_events(company_id,day_id,employee_id,employment_cycle_id,operation_center_id,action,occurred_at,recorded_by,idempotency_key,source)
 SELECT e.company_id,night,e.id,e.cycle_id,e.operation_center_id,step.action,start_time+step.elapsed,actor,gen_random_uuid(),'supervised'
 FROM (VALUES('clock_in',interval '0 hours'),('break_start',interval '2 hours'),('break_end',interval '2 hours 30 minutes'),('break_start',interval '4 hours'),('break_end',interval '4 hours 30 minutes'),('clock_out',interval '8 hours')) step(action,elapsed);
 PERFORM public.time_clock_recalculate_day(night);
 ASSERT (SELECT worked_minutes=420 AND break_minutes=60 AND status='complete' FROM public.time_clock_days WHERE id=night), 'Night shift with two pauses';
 SELECT id INTO exit_event FROM public.time_clock_events WHERE day_id=night AND action='clock_out';
 INSERT INTO public.time_clock_correction_requests(company_id,employee_id,employment_cycle_id,operation_center_id,event_id,requested_action,requested_at,reason,identity_method)
 VALUES(e.company_id,e.id,e.cycle_id,e.operation_center_id,exit_event,'clock_out',start_time+interval '8 hours 15 minutes','Salida correcta del turno nocturno','pin') RETURNING id INTO req;
 PERFORM public.time_clock_resolve_correction(req,true,'Horario verificado con supervisor');
 ASSERT (SELECT worked_minutes=435 FROM public.time_clock_days WHERE id=night), 'Approved exit stays in original night shift';
 ASSERT (SELECT reviewer_name IS NOT NULL FROM public.time_clock_correction_requests WHERE id=req), 'Reviewer name retained';
 ASSERT (SELECT count(*)=7 FROM public.time_clock_events WHERE day_id=night), 'Original evidence retained';
 PERFORM public.time_clock_configure_center(e.operation_center_id,(now() AT TIME ZONE 'America/Bogota')::date,true);
 PERFORM time_clock_private.reconcile();
 ASSERT (SELECT last_scan_date=(now() AT TIME ZONE 'America/Bogota')::date FROM public.time_clock_center_settings WHERE operation_center_id=e.operation_center_id), 'Worker runs for activated center';
 ASSERT NOT EXISTS(SELECT 1 FROM public.time_clock_days WHERE work_date<(now() AT TIME ZONE 'America/Bogota')::date AND id<>night AND id<>d), 'No artificial historical absences';
END $$;
