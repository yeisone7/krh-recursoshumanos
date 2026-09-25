-- A requester may decide their own ticket when their role grants correction approval.
CREATE OR REPLACE FUNCTION public.payroll_ticket_transition(p_id uuid,p_action text,p_reason text,p_start date DEFAULT NULL,p_end date DEFAULT NULL,p_expires timestamptz DEFAULT NULL,p_actions text[] DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.payroll_correction_tickets; oldv jsonb; BEGIN
 PERFORM payroll_private.review_lock();
 SELECT * INTO t FROM public.payroll_correction_tickets WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT payroll_private.correction_read(t.company_id,t.operation_center_id,t.requested_by) THEN RAISE EXCEPTION 'Solicitud no autorizada' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Escriba un motivo de al menos cinco caracteres' USING ERRCODE='22023'; END IF;
 oldv:=to_jsonb(t);
 IF p_action IN('authorize','reject') THEN
 IF NOT payroll_private.can(t.company_id,'correction_tickets','approve') THEN RAISE EXCEPTION 'Sin permiso para aprobar o rechazar la solicitud' USING ERRCODE='42501'; END IF;
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
