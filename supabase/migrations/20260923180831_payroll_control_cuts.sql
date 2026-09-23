-- Payroll cuts are independent of payroll calculation/settlement.
CREATE SCHEMA IF NOT EXISTS payroll_private;
REVOKE ALL ON SCHEMA payroll_private FROM PUBLIC, anon, authenticated;

INSERT INTO public.modules(code,name,icon,sort_order) VALUES
 ('cortes_control','Cortes de control','ShieldCheck',36);
INSERT INTO public.modules(code,name,parent_id,sort_order)
 SELECT v.code,v.name,m.id,v.n FROM public.modules m CROSS JOIN (VALUES
 ('cortes_control_nivel_uno','Nivel 1 · Operativo',1),
 ('cortes_control_nivel_dos','Nivel 2 · Superior',2)) v(code,name,n) WHERE m.code='cortes_control';
INSERT INTO public.permissions(module_id,action,description)
 SELECT id,'view','Consultar cortes e historial' FROM public.modules WHERE code='cortes_control';
INSERT INTO public.permissions(module_id,action,description)
 SELECT m.id,a.action::public.permission_action,a.label FROM public.modules m CROSS JOIN
 (VALUES ('create','Aplicar'),('update','Modificar fecha'),('approve','Reabrir')) a(action,label)
 WHERE m.code IN ('cortes_control_nivel_uno','cortes_control_nivel_dos');

CREATE TABLE public.payroll_control_cuts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id),
 operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id), level smallint NOT NULL CHECK(level IN(1,2)),
 cutoff_date date NOT NULL, active boolean NOT NULL DEFAULT true, reason text NOT NULL,
 created_by uuid NOT NULL, created_by_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX payroll_cut_active_level ON public.payroll_control_cuts(company_id,operation_center_id,level) WHERE active;
CREATE TABLE public.payroll_control_cut_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cut_id uuid NOT NULL REFERENCES public.payroll_control_cuts(id),
 company_id uuid NOT NULL REFERENCES public.companies(id), operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id),
 level smallint NOT NULL, action text NOT NULL CHECK(action IN('create','update','reopen')),
 old_date date, new_date date, reason text NOT NULL, actor_id uuid NOT NULL, actor_name text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX payroll_cut_events_center ON public.payroll_control_cut_events(company_id,operation_center_id,occurred_at DESC);
ALTER TABLE public.payroll_control_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_control_cut_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payroll_control_cuts,public.payroll_control_cut_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.payroll_control_cuts,public.payroll_control_cut_events TO authenticated;

CREATE FUNCTION payroll_private.can(p_company uuid,p_module text,p_action text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_company_member(p_company) OR public.is_super_admin()) AND
 (public.is_admin() OR public.is_super_admin() OR EXISTS(
 SELECT 1 FROM public.user_custom_roles ur JOIN public.custom_roles r ON r.id=ur.role_id
 WHERE ur.user_id=auth.uid() AND r.company_id=p_company AND r.is_active AND
 (r.is_system OR EXISTS(SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id=rp.permission_id
 JOIN public.modules m ON m.id=p.module_id WHERE rp.role_id=r.id AND m.code=p_module AND m.is_active AND p.action::text=p_action))))
$$;
CREATE POLICY payroll_cuts_read ON public.payroll_control_cuts FOR SELECT TO authenticated USING
 (payroll_private.can(company_id,'cortes_control','view') AND public.check_center_access(company_id,operation_center_id));
CREATE POLICY payroll_cut_events_read ON public.payroll_control_cut_events FOR SELECT TO authenticated USING
 (payroll_private.can(company_id,'cortes_control','view') AND public.check_center_access(company_id,operation_center_id));
-- RLS may call this private predicate, but it never accepts a caller-supplied identity.
GRANT USAGE ON SCHEMA payroll_private TO authenticated;
GRANT EXECUTE ON FUNCTION payroll_private.can(uuid,text,text) TO authenticated;

CREATE FUNCTION payroll_private.lock_center(p_company uuid,p_center uuid) RETURNS void
LANGUAGE sql VOLATILE SET search_path='' AS $$
 SELECT pg_advisory_xact_lock(hashtextextended('payroll-cut:'||p_company::text||':'||coalesce(p_center::text,'unresolved'),0))
$$;
CREATE FUNCTION payroll_private.effective(p_company uuid,p_center uuid) RETURNS date
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
 SELECT max(cutoff_date) FROM public.payroll_control_cuts WHERE company_id=p_company AND operation_center_id=p_center AND active
$$;
CREATE FUNCTION payroll_private.require_open(p_company uuid,p_center uuid,p_date date,p_record text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.payroll_control_cuts; center_name text;
BEGIN
 IF p_date IS NULL THEN RAISE EXCEPTION 'No se pudo determinar la fecha de %',p_record USING ERRCODE='22023'; END IF;
 PERFORM payroll_private.lock_center(p_company,p_center);
 IF p_center IS NULL THEN
   IF EXISTS(SELECT 1 FROM public.payroll_control_cuts WHERE company_id=p_company AND active) THEN
     RAISE EXCEPTION 'Asigne un centro de operación a % antes de modificarlo',p_record USING ERRCODE='23514';
   END IF;
   RETURN;
 END IF;
 SELECT * INTO c FROM public.payroll_control_cuts WHERE company_id=p_company AND operation_center_id=p_center AND active
 ORDER BY cutoff_date DESC,level DESC LIMIT 1;
 IF c.id IS NOT NULL AND p_date<=c.cutoff_date THEN
   SELECT name INTO center_name FROM public.operation_centers WHERE id=p_center;
   RAISE EXCEPTION 'Corte de control · % · Nivel % · hasta % inclusive. Registro: %. Motivo: %',center_name,c.level,c.cutoff_date,p_record,c.reason USING ERRCODE='PCC01';
 END IF;
END $$;

-- Snapshot the principal center using employment-cycle and date evidence, never an arbitrary center.
CREATE FUNCTION payroll_private.employee_center(p_company uuid,p_employee uuid,p_cycle uuid,p_date date) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN count(DISTINCT w.operation_center_id)=1 THEN (array_agg(DISTINCT w.operation_center_id))[1] END
 FROM public.employee_work_info w WHERE w.company_id=p_company AND w.employee_id=p_employee
 AND (p_cycle IS NULL OR w.employment_cycle_id=p_cycle)
 AND coalesce(w.valid_from,w.hire_date,'-infinity'::date)<=p_date
 AND coalesce(w.valid_to,w.termination_date,'infinity'::date)>=p_date
$$;
DO $$ DECLARE t text; date_col text; BEGIN
 FOR t,date_col IN SELECT * FROM (VALUES('employee_shift_assignments','assignment_date'),('payroll_novelties','novelty_date'),
 ('employee_loans','start_date'),('employee_deductions','start_date'),('employee_time_config','start_date')) v(t,d) LOOP
   EXECUTE format('ALTER TABLE public.%I ADD COLUMN operation_center_id uuid REFERENCES public.operation_centers(id)',t);
   EXECUTE format('UPDATE public.%I r SET operation_center_id=payroll_private.employee_center(r.company_id,r.employee_id,(to_jsonb(r)->>''employment_cycle_id'')::uuid,r.%I)',t,date_col);
   EXECUTE format('CREATE INDEX %I ON public.%I(company_id,operation_center_id,%I)',t||'_cut_scope',t,date_col);
 END LOOP;
END $$;
ALTER TABLE public.employee_deductions ADD COLUMN previous_version_id uuid REFERENCES public.employee_deductions(id);
CREATE UNIQUE INDEX deduction_next_version ON public.employee_deductions(previous_version_id) WHERE previous_version_id IS NOT NULL;
-- Only trusted RPCs can authorize a narrowly scoped derived update in their transaction.
CREATE TABLE payroll_private.write_context(tx bigint NOT NULL, record_id uuid NOT NULL, kind text NOT NULL, PRIMARY KEY(tx,record_id,kind));
REVOKE ALL ON payroll_private.write_context FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.payroll_cut_centers(p_company_id uuid) RETURNS TABLE(id uuid,name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT payroll_private.can(p_company_id,'cortes_control','view') THEN RAISE EXCEPTION 'Sin permiso para consultar cortes' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT c.id,c.name FROM public.operation_centers c WHERE c.company_id=p_company_id AND public.check_center_access(c.company_id,c.id) ORDER BY c.name;
END $$;
CREATE FUNCTION public.payroll_cut_resolve_centers(p_company_id uuid) RETURNS TABLE(source_table text,unresolved_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t text; d text; BEGIN
 IF NOT payroll_private.can(p_company_id,'cortes_control','view') OR NOT
 (payroll_private.can(p_company_id,'cortes_control_nivel_uno','create') OR payroll_private.can(p_company_id,'cortes_control_nivel_dos','create')) THEN RAISE EXCEPTION 'Sin permiso para preparar centros' USING ERRCODE='42501'; END IF;
 PERFORM payroll_private.lock_center(p_company_id,NULL);
 FOR t,d IN SELECT * FROM (VALUES('employee_shift_assignments','assignment_date'),('payroll_novelties','novelty_date'),('employee_loans','start_date'),('employee_deductions','start_date'),('employee_time_config','start_date')) v(t,d) LOOP
   EXECUTE format('UPDATE public.%I r SET operation_center_id=payroll_private.employee_center(r.company_id,r.employee_id,(to_jsonb(r)->>''employment_cycle_id'')::uuid,r.%I) WHERE company_id=$1 AND operation_center_id IS NULL AND payroll_private.employee_center(r.company_id,r.employee_id,(to_jsonb(r)->>''employment_cycle_id'')::uuid,r.%I) IS NOT NULL AND public.check_center_access(r.company_id,payroll_private.employee_center(r.company_id,r.employee_id,(to_jsonb(r)->>''employment_cycle_id'')::uuid,r.%I))',t,d,d,d) USING p_company_id;
   source_table:=t;
   EXECUTE format('SELECT count(*) FROM public.%I WHERE company_id=$1 AND operation_center_id IS NULL',t) INTO unresolved_count USING p_company_id;
   RETURN NEXT;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.payroll_cut_resolve_centers(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.payroll_cut_resolve_centers(uuid) TO authenticated;
CREATE FUNCTION public.payroll_cut_change(p_company_id uuid,p_center_id uuid,p_level smallint,p_action text,p_date date,p_reason text,p_cut_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.payroll_control_cuts; superior date; actor text; t text; missing bigint; action_permission text;
BEGIN
 action_permission:=CASE p_action WHEN 'create' THEN 'create' WHEN 'update' THEN 'update' WHEN 'reopen' THEN 'approve' END;
 IF p_level NOT IN(1,2) OR action_permission IS NULL THEN RAISE EXCEPTION 'Acción o nivel inválido'; END IF;
 IF NOT payroll_private.can(p_company_id,CASE p_level WHEN 1 THEN 'cortes_control_nivel_uno' ELSE 'cortes_control_nivel_dos' END,action_permission)
 OR NOT public.check_center_access(p_company_id,p_center_id)
 OR NOT EXISTS(SELECT 1 FROM public.operation_centers WHERE id=p_center_id AND company_id=p_company_id)
 THEN RAISE EXCEPTION 'Empresa, centro o permiso no autorizado' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Escriba un motivo de al menos cinco caracteres' USING ERRCODE='22023'; END IF;
 -- The unresolved lock serializes against rows that still lack a center.
 PERFORM payroll_private.lock_center(p_company_id,NULL);
 PERFORM payroll_private.lock_center(p_company_id,p_center_id);
 IF p_action<>'reopen' THEN
   IF p_date IS NULL OR p_date>(clock_timestamp() AT TIME ZONE 'America/Bogota')::date THEN RAISE EXCEPTION 'La fecha debe ser hasta hoy' USING ERRCODE='22023'; END IF;
   FOREACH t IN ARRAY ARRAY['employee_shift_assignments','payroll_novelties','employee_loans','employee_deductions','employee_time_config'] LOOP
     EXECUTE format('SELECT count(*) FROM public.%I WHERE company_id=$1 AND operation_center_id IS NULL',t) INTO missing USING p_company_id;
     IF missing>0 THEN RAISE EXCEPTION 'Resuelva % registros sin centro en % antes de aplicar el corte',missing,t USING ERRCODE='23514'; END IF;
   END LOOP;
 END IF;
 IF p_action<>'create' THEN
   SELECT * INTO c FROM public.payroll_control_cuts WHERE id=p_cut_id AND company_id=p_company_id AND operation_center_id=p_center_id AND level=p_level AND active FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'El corte cambió o ya está reabierto. Actualice la pantalla.' USING ERRCODE='40001'; END IF;
 END IF;
 SELECT cutoff_date INTO superior FROM public.payroll_control_cuts WHERE company_id=p_company_id AND operation_center_id=p_center_id AND level=2 AND active;
 IF p_level=1 AND coalesce(CASE WHEN p_action='reopen' THEN c.cutoff_date ELSE p_date END,'-infinity'::date)<superior THEN
   RAISE EXCEPTION 'El nivel 1 debe estar desde % inclusive, límite del nivel Superior',superior USING ERRCODE='42501'; END IF;
 SELECT coalesce(display_name,full_name,'Usuario') INTO actor FROM public.user_profiles WHERE id=auth.uid();
 actor:=coalesce(actor,'Usuario');
 IF p_action='create' THEN
   INSERT INTO public.payroll_control_cuts(company_id,operation_center_id,level,cutoff_date,reason,created_by,created_by_name)
   VALUES(p_company_id,p_center_id,p_level,p_date,btrim(p_reason),auth.uid(),actor) RETURNING id INTO p_cut_id;
 ELSE
   UPDATE public.payroll_control_cuts SET cutoff_date=CASE WHEN p_action='reopen' THEN cutoff_date ELSE p_date END,
   active=p_action<>'reopen',reason=btrim(p_reason) WHERE id=p_cut_id;
 END IF;
 INSERT INTO public.payroll_control_cut_events(cut_id,company_id,operation_center_id,level,action,old_date,new_date,reason,actor_id,actor_name)
 VALUES(p_cut_id,p_company_id,p_center_id,p_level,p_action,c.cutoff_date,CASE WHEN p_action<>'reopen' THEN p_date END,btrim(p_reason),auth.uid(),actor);
 RETURN p_cut_id;
END $$;

CREATE FUNCTION payroll_private.row_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE olddoc jsonb; newdoc jsonb; doc jsonb; parent jsonb; date_value date; center uuid; company uuid; col text; item record;
BEGIN
 IF TG_OP<>'INSERT' THEN olddoc:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN newdoc:=to_jsonb(NEW); END IF;
 col:=CASE TG_TABLE_NAME WHEN 'employee_shift_assignments' THEN 'assignment_date' WHEN 'payroll_novelties' THEN 'novelty_date'
 WHEN 'time_clock_days' THEN 'work_date' WHEN 'employee_loan_payments' THEN 'payment_date' ELSE 'start_date' END;
 IF TG_TABLE_NAME IN('employee_shift_assignments','payroll_novelties','employee_loans','employee_deductions','employee_time_config') AND TG_OP<>'DELETE' THEN
   company:=(newdoc->>'company_id')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.employees_v2 WHERE id=(newdoc->>'employee_id')::uuid AND company_id=company) THEN RAISE EXCEPTION 'Empleado de otra empresa' USING ERRCODE='42501'; END IF;
   IF TG_OP='INSERT' OR (olddoc->>'employee_id',olddoc->>'company_id') IS DISTINCT FROM (newdoc->>'employee_id',newdoc->>'company_id') THEN
     NEW.operation_center_id:=payroll_private.employee_center(company,(newdoc->>'employee_id')::uuid,(newdoc->>'employment_cycle_id')::uuid,(newdoc->>col)::date);
   ELSIF (newdoc->>'operation_center_id') IS DISTINCT FROM (olddoc->>'operation_center_id') THEN
     -- Repair is allowed only for unresolved legacy rows and must use employment evidence.
     IF olddoc->>'operation_center_id' IS NOT NULL OR NEW.operation_center_id IS DISTINCT FROM payroll_private.employee_center(company,(newdoc->>'employee_id')::uuid,(newdoc->>'employment_cycle_id')::uuid,(newdoc->>col)::date) THEN
       RAISE EXCEPTION 'El centro histórico no puede reasignarse' USING ERRCODE='42501'; END IF;
   END IF;
   newdoc:=to_jsonb(NEW);
 END IF;
 -- Lock both scopes in a stable order before checking old/new values.
 FOR item IN SELECT DISTINCT (v->>'company_id')::uuid e,(v->>'operation_center_id')::uuid c FROM unnest(ARRAY[olddoc,newdoc]) v WHERE v IS NOT NULL ORDER BY 1,2 NULLS FIRST LOOP
   PERFORM payroll_private.lock_center(item.e,item.c);
 END LOOP;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=OLD.id AND kind='payment')
 AND TG_TABLE_NAME='employee_loans' AND (olddoc-ARRAY['paid_installments','paid_amount','remaining_balance','status','updated_at'])=(newdoc-ARRAY['paid_installments','paid_amount','remaining_balance','status','updated_at']) THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=OLD.id AND kind='version')
 AND TG_TABLE_NAME IN('employee_time_config','employee_deductions')
 AND (olddoc-ARRAY['end_date','is_active','updated_at'])=(newdoc-ARRAY['end_date','is_active','updated_at']) THEN RETURN NEW; END IF;
 FOREACH doc IN ARRAY ARRAY[olddoc,newdoc] LOOP
   IF doc IS NULL THEN CONTINUE; END IF;
   company:=(doc->>'company_id')::uuid; center:=(doc->>'operation_center_id')::uuid; date_value:=(doc->>col)::date;
   IF TG_TABLE_NAME IN('employee_loan_payments','loan_refinancing_history') THEN
     SELECT to_jsonb(l) INTO parent FROM public.employee_loans l WHERE id=(doc->>'loan_id')::uuid;
     IF parent IS NULL OR company IS DISTINCT FROM (parent->>'company_id')::uuid THEN RAISE EXCEPTION 'Préstamo no válido' USING ERRCODE='42501'; END IF;
     center:=(parent->>'operation_center_id')::uuid;
     IF TG_TABLE_NAME='employee_loan_payments' AND TG_OP='INSERT'
       AND payroll_private.effective(company,center) IS NOT NULL
       AND NOT EXISTS(SELECT 1 FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=(doc->>'id')::uuid AND kind='payment_insert') THEN
       RAISE EXCEPTION 'Registre el abono desde la versión actualizada de Préstamos para actualizar el saldo de forma atómica' USING ERRCODE='42501';
     END IF;
     IF TG_TABLE_NAME='loan_refinancing_history' THEN date_value:=(parent->>'start_date')::date; END IF;
   ELSIF TG_TABLE_NAME='time_clock_events' THEN
     SELECT to_jsonb(d) INTO parent FROM public.time_clock_days d WHERE id=(doc->>'day_id')::uuid;
     IF parent IS NULL OR (parent->>'company_id',parent->>'employee_id',parent->>'operation_center_id') IS DISTINCT FROM (doc->>'company_id',doc->>'employee_id',doc->>'operation_center_id') THEN RAISE EXCEPTION 'Jornada no válida' USING ERRCODE='42501'; END IF;
     date_value:=(parent->>'work_date')::date;
   ELSIF TG_TABLE_NAME='time_clock_correction_requests' THEN
     SELECT to_jsonb(d) INTO parent FROM public.time_clock_events ev JOIN public.time_clock_days d ON d.id=ev.day_id WHERE ev.id=(doc->>'event_id')::uuid;
     IF parent IS NOT NULL THEN
       PERFORM payroll_private.require_open((parent->>'company_id')::uuid,(parent->>'operation_center_id')::uuid,(parent->>'work_date')::date,TG_TABLE_NAME||':'||(doc->>'id'));
     END IF;
     date_value:=coalesce((doc->>'target_work_date')::date,(parent->>'work_date')::date,((doc->>'requested_at')::timestamptz AT TIME ZONE 'America/Bogota')::date);
   END IF;
   PERFORM payroll_private.require_open(company,center,date_value,TG_TABLE_NAME||':'||(doc->>'id'));
 END LOOP;
 RETURN coalesce(NEW,OLD);
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['employee_shift_assignments','payroll_novelties','employee_loans','employee_loan_payments','loan_refinancing_history','employee_deductions','employee_time_config','time_clock_days','time_clock_events','time_clock_correction_requests'] LOOP
   EXECUTE format('CREATE TRIGGER payroll_cut_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION payroll_private.row_guard()',t);
 END LOOP;
END $$;

-- Catalog edits must not mutate the meaning of a protected assignment/configuration.
CREATE FUNCTION payroll_private.catalog_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; ids uuid[]; doc jsonb; target uuid; BEGIN
 ids:=ARRAY[]::uuid[];
 IF TG_OP<>'INSERT' THEN ids:=array_append(ids,(to_jsonb(OLD)->>CASE WHEN TG_TABLE_NAME='shift_cycle_days' THEN 'shift_cycle_id' ELSE 'id' END)::uuid); END IF;
 IF TG_OP<>'DELETE' THEN ids:=array_append(ids,(to_jsonb(NEW)->>CASE WHEN TG_TABLE_NAME='shift_cycle_days' THEN 'shift_cycle_id' ELSE 'id' END)::uuid); END IF;
 FOR r IN
 SELECT a.company_id,a.operation_center_id,a.assignment_date AS d,a.id FROM public.employee_shift_assignments a WHERE TG_TABLE_NAME='shifts' AND a.shift_id=ANY(ids)
 UNION ALL
 SELECT c.company_id,c.operation_center_id,c.start_date,c.id FROM public.employee_time_config c WHERE
 (TG_TABLE_NAME='work_schedules' AND c.work_schedule_id=ANY(ids)) OR
 (TG_TABLE_NAME IN('shift_cycles','shift_cycle_days') AND c.shift_cycle_id=ANY(ids)) OR
 (TG_TABLE_NAME='shifts' AND EXISTS(SELECT 1 FROM public.shift_cycle_days d WHERE d.shift_cycle_id=c.shift_cycle_id AND d.shift_id=ANY(ids)))
 ORDER BY company_id,operation_center_id
 LOOP PERFORM payroll_private.require_open(r.company_id,r.operation_center_id,r.d,TG_TABLE_NAME||' usado por '||r.id::text); END LOOP;
 RETURN coalesce(NEW,OLD);
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['work_schedules','shifts','shift_cycles','shift_cycle_days'] LOOP
 EXECUTE format('CREATE TRIGGER payroll_catalog_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION payroll_private.catalog_guard()',t);
 END LOOP;
END $$;

CREATE FUNCTION public.payroll_register_loan_payment(p_loan_id uuid,p_date date,p_amount numeric,p_period text DEFAULT NULL,p_notes text DEFAULT NULL,p_id uuid DEFAULT gen_random_uuid()) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.employee_loans; result uuid; BEGIN
 SELECT * INTO l FROM public.employee_loans WHERE id=p_loan_id;
 IF l.id IS NULL OR NOT payroll_private.can(l.company_id,'prestamos','update') OR NOT public.check_center_access(l.company_id,l.operation_center_id) THEN RAISE EXCEPTION 'Sin permiso para registrar el pago' USING ERRCODE='42501'; END IF;
 PERFORM payroll_private.lock_center(l.company_id,l.operation_center_id);
 SELECT * INTO l FROM public.employee_loans WHERE id=p_loan_id FOR UPDATE;
 SELECT id INTO result FROM public.employee_loan_payments WHERE id=p_id AND loan_id=p_loan_id AND amount=p_amount AND payment_date=p_date;
 IF result IS NOT NULL THEN RETURN result; END IF;
 PERFORM payroll_private.require_open(l.company_id,l.operation_center_id,p_date,'Pago de préstamo '||l.id);
 IF p_amount IS NULL OR p_amount<=0 OR p_amount>l.remaining_balance OR p_date<l.start_date OR l.status NOT IN('activo','aprobado') THEN RAISE EXCEPTION 'Monto, fecha o estado del préstamo no válido' USING ERRCODE='22023'; END IF;
 INSERT INTO payroll_private.write_context VALUES(txid_current(),p_id,'payment_insert');
 INSERT INTO public.employee_loan_payments(id,loan_id,company_id,payment_number,payment_date,amount,balance_after,payroll_period,notes,created_by)
 VALUES(p_id,l.id,l.company_id,l.paid_installments+1,p_date,p_amount,l.remaining_balance-p_amount,p_period,p_notes,auth.uid());
 DELETE FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=p_id AND kind='payment_insert';
 INSERT INTO payroll_private.write_context VALUES(txid_current(),l.id,'payment');
 UPDATE public.employee_loans SET paid_installments=l.paid_installments+1,paid_amount=l.paid_amount+p_amount,remaining_balance=l.remaining_balance-p_amount,
 status=CASE WHEN l.remaining_balance-p_amount=0 THEN 'pagado'::public.loan_status ELSE 'activo'::public.loan_status END WHERE id=l.id;
 DELETE FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=l.id AND kind='payment';
 RETURN p_id;
END $$;
-- Keep old clients usable during rollout while there are no cuts. Once a center has
-- a cut, the trigger requires the atomic RPC even for a payment after the cutoff.
REVOKE UPDATE,DELETE ON public.employee_loan_payments FROM authenticated,anon;

CREATE FUNCTION public.payroll_refinance_loan(p_loan_id uuid,p_installments integer,p_rate numeric,p_start date,p_expected_balance numeric,p_reason text,p_document text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.employee_loans; total numeric; result uuid; BEGIN
 SELECT * INTO l FROM public.employee_loans WHERE id=p_loan_id;
 IF l.id IS NULL OR NOT payroll_private.can(l.company_id,'prestamos','update') OR NOT public.check_center_access(l.company_id,l.operation_center_id) THEN RAISE EXCEPTION 'Sin permiso para refinanciar' USING ERRCODE='42501'; END IF;
 PERFORM payroll_private.lock_center(l.company_id,l.operation_center_id);
 SELECT * INTO l FROM public.employee_loans WHERE id=p_loan_id FOR UPDATE;
 PERFORM payroll_private.require_open(l.company_id,l.operation_center_id,l.start_date,'Préstamo a refinanciar');
 PERFORM payroll_private.require_open(l.company_id,l.operation_center_id,p_start,'Nueva fecha del préstamo');
 IF p_installments IS NULL OR p_installments<1 OR p_rate IS NULL OR p_rate<0 OR l.remaining_balance<=0 OR l.status<>'activo' THEN RAISE EXCEPTION 'Condiciones de refinanciación inválidas'; END IF;
 IF p_expected_balance IS DISTINCT FROM l.remaining_balance THEN RAISE EXCEPTION 'El saldo cambió. Actualice el préstamo antes de refinanciar.' USING ERRCODE='40001'; END IF;
 total:=round(l.remaining_balance*(1+p_rate/100),2);
 INSERT INTO public.loan_refinancing_history(loan_id,company_id,employee_id,previous_total_amount,previous_interest_rate,previous_total_with_interest,previous_installments,previous_installment_amount,previous_paid_installments,previous_paid_amount,previous_remaining_balance,new_total_amount,new_interest_rate,new_total_with_interest,new_installments,new_installment_amount,new_start_date,reason,document_url,created_by)
 VALUES(l.id,l.company_id,l.employee_id,l.total_amount,l.interest_rate,l.total_with_interest,l.installments,l.installment_amount,l.paid_installments,l.paid_amount,l.remaining_balance,l.remaining_balance,p_rate,total,p_installments,round(total/p_installments,2),p_start,p_reason,p_document,auth.uid()) RETURNING id INTO result;
 UPDATE public.employee_loans SET total_amount=l.remaining_balance,interest_rate=p_rate,total_with_interest=total,installments=p_installments,installment_amount=round(total/p_installments,2),remaining_balance=total,paid_installments=0,paid_amount=0,start_date=p_start,notes=concat_ws(E'\n',l.notes,'[REFINANCIAMIENTO] '||p_reason) WHERE id=l.id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.payroll_refinance_loan(uuid,integer,numeric,date,numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.payroll_refinance_loan(uuid,integer,numeric,date,numeric,text,text) TO authenticated;

CREATE FUNCTION public.payroll_version_deduction(p_id uuid,p_effective_date date,p_changes jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE oldrow public.employee_deductions; nextrow public.employee_deductions; BEGIN
 SELECT * INTO oldrow FROM public.employee_deductions WHERE id=p_id;
 IF oldrow.id IS NULL OR NOT payroll_private.can(oldrow.company_id,'descuentos','update') OR NOT public.check_center_access(oldrow.company_id,oldrow.operation_center_id) THEN RAISE EXCEPTION 'Sin permiso para modificar descuento' USING ERRCODE='42501'; END IF;
 PERFORM payroll_private.lock_center(oldrow.company_id,oldrow.operation_center_id);
 SELECT * INTO oldrow FROM public.employee_deductions WHERE id=p_id FOR UPDATE;
 PERFORM payroll_private.require_open(oldrow.company_id,oldrow.operation_center_id,p_effective_date,'Nueva vigencia del descuento');
 IF NOT oldrow.is_recurring OR p_effective_date<=oldrow.start_date OR p_effective_date>coalesce(oldrow.end_date,'infinity'::date) THEN RAISE EXCEPTION 'La nueva vigencia debe comenzar después de la anterior y dentro de su vigencia'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_changes) k WHERE k NOT IN('deduction_type','description','amount','is_percentage','percentage_value','end_date','is_recurring','reference_number','entity_name','status','notes','document_url')) THEN RAISE EXCEPTION 'Campo de descuento no permitido'; END IF;
 nextrow:=jsonb_populate_record(oldrow,p_changes);
 nextrow.id:=gen_random_uuid(); nextrow.previous_version_id:=oldrow.id; nextrow.start_date:=p_effective_date;
 nextrow.created_at:=clock_timestamp(); nextrow.updated_at:=clock_timestamp(); nextrow.created_by:=auth.uid();
 IF nextrow.end_date<nextrow.start_date THEN RAISE EXCEPTION 'Fin de vigencia inválido'; END IF;
 INSERT INTO payroll_private.write_context VALUES(txid_current(),oldrow.id,'version');
 UPDATE public.employee_deductions SET end_date=p_effective_date-1 WHERE id=oldrow.id;
 DELETE FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=oldrow.id AND kind='version';
 INSERT INTO public.employee_deductions SELECT nextrow.*;
 RETURN nextrow.id;
END $$;

CREATE FUNCTION public.payroll_set_time_config(p_company_id uuid,p_config jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE oldrow public.employee_time_config; nextrow public.employee_time_config; center uuid; BEGIN
 IF NOT payroll_private.can(p_company_id,'jornadas','update') AND NOT payroll_private.can(p_company_id,'jornadas','create') THEN RAISE EXCEPTION 'Sin permiso para configurar jornadas' USING ERRCODE='42501'; END IF;
 nextrow:=jsonb_populate_record(NULL::public.employee_time_config,p_config);
 nextrow.company_id:=p_company_id;
 IF NOT EXISTS(SELECT 1 FROM public.employees_v2 WHERE id=nextrow.employee_id AND company_id=p_company_id) THEN RAISE EXCEPTION 'Empleado no autorizado'; END IF;
 SELECT id INTO nextrow.employment_cycle_id FROM public.employee_employment_cycles WHERE employee_id=nextrow.employee_id AND company_id=p_company_id AND status='active';
 center:=payroll_private.employee_center(p_company_id,nextrow.employee_id,nextrow.employment_cycle_id,nextrow.start_date);
 IF NOT public.check_center_access(p_company_id,center) THEN RAISE EXCEPTION 'Centro no autorizado' USING ERRCODE='42501'; END IF;
 PERFORM payroll_private.lock_center(p_company_id,center);
 -- Employee lock also serializes first configurations and transfers between centers.
 PERFORM pg_advisory_xact_lock(hashtextextended('payroll-config:'||nextrow.employee_id::text,0));
 PERFORM payroll_private.require_open(p_company_id,center,nextrow.start_date,'Nueva vigencia de jornada');
 SELECT * INTO oldrow FROM public.employee_time_config WHERE employee_id=nextrow.employee_id AND is_active FOR UPDATE;
 IF oldrow.id IS NOT NULL THEN
   IF nextrow.start_date<=oldrow.start_date OR nextrow.start_date>coalesce(oldrow.end_date,'infinity'::date) THEN RAISE EXCEPTION 'Seleccione una nueva vigencia posterior al inicio actual'; END IF;
   PERFORM payroll_private.require_open(oldrow.company_id,oldrow.operation_center_id,nextrow.start_date,'Fin de vigencia anterior');
   INSERT INTO payroll_private.write_context VALUES(txid_current(),oldrow.id,'version');
   UPDATE public.employee_time_config SET end_date=nextrow.start_date-1,is_active=false WHERE id=oldrow.id;
   DELETE FROM payroll_private.write_context WHERE tx=txid_current() AND record_id=oldrow.id AND kind='version';
 END IF;
 nextrow.id:=gen_random_uuid(); nextrow.operation_center_id:=center; nextrow.is_active:=true; nextrow.created_at:=clock_timestamp(); nextrow.updated_at:=clock_timestamp(); nextrow.created_by:=auth.uid();
 IF nextrow.end_date<nextrow.start_date THEN RAISE EXCEPTION 'Fin de vigencia inválido'; END IF;
 INSERT INTO public.employee_time_config SELECT nextrow.*;
 RETURN nextrow.id;
END $$;

-- Preserve original clock behavior, adding cut-aware early returns only to automatic processing.
DO $$ DECLARE def text; patched text; BEGIN
 SELECT pg_get_functiondef('time_clock_private.refresh_date(uuid,date)'::regprocedure) INTO def;
 patched:=replace(def,'IF company IS NULL THEN RETURN; END IF;',
 'IF company IS NULL THEN RETURN; END IF; PERFORM payroll_private.lock_center(company,_center); IF _date<=payroll_private.effective(company,_center) THEN RETURN; END IF;');
 IF patched=def THEN RAISE EXCEPTION 'Review time-clock refresh function before migration'; END IF;
 patched:=replace(patched,'AND c.is_active AND c.mode=','AND (c.is_active OR c.end_date IS NOT NULL) AND c.mode=');
 EXECUTE patched;
 SELECT pg_get_functiondef('public.time_clock_recalculate_day(uuid)'::regprocedure) INTO def;
 patched:=replace(def,'AND config.is_active','AND (config.is_active OR config.end_date IS NOT NULL)');
 EXECUTE patched;
END $$;
CREATE OR REPLACE FUNCTION time_clock_private.reconcile() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE setting record; work_day date; d record; today date:=(now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
 IF NOT pg_try_advisory_xact_lock(hashtextextended('time-clock-reconcile',0)) THEN RETURN; END IF;
 FOR setting IN SELECT * FROM public.time_clock_center_settings WHERE enabled AND tracking_start_date<=today ORDER BY company_id,operation_center_id LOOP
   PERFORM payroll_private.lock_center(setting.company_id,setting.operation_center_id);
   FOR work_day IN SELECT generate_series(greatest(setting.tracking_start_date,coalesce(setting.last_scan_date-1,setting.tracking_start_date),coalesce(payroll_private.effective(setting.company_id,setting.operation_center_id)+1,setting.tracking_start_date)),today,interval '1 day')::date LOOP
     PERFORM time_clock_private.refresh_date(setting.operation_center_id,work_day);
   END LOOP;
   UPDATE public.time_clock_center_settings SET last_scan_date=today WHERE operation_center_id=setting.operation_center_id;
 END LOOP;
 FOR d IN SELECT * FROM public.time_clock_days WHERE first_clock_in IS NOT NULL AND (status IN('open','on_break') OR work_date>=today-1) ORDER BY company_id,operation_center_id LOOP
   PERFORM payroll_private.lock_center(d.company_id,d.operation_center_id);
   IF d.work_date>coalesce(payroll_private.effective(d.company_id,d.operation_center_id),'-infinity'::date) THEN PERFORM public.time_clock_recalculate_day(d.id); END IF;
 END LOOP;
 DELETE FROM time_clock_private.sessions WHERE expires_at<now()-interval '1 day';
 DELETE FROM time_clock_private.attempts WHERE resets_at<now()-interval '1 day';
 DELETE FROM public.time_clock_qr_sessions WHERE expires_at<now()-interval '1 day';
END $$;

-- Operators may see blocking dates without receiving access to the audit/admin screen.
CREATE FUNCTION public.payroll_cut_status(p_company_id uuid) RETURNS TABLE(operation_center_id uuid,center_name text,level smallint,cutoff_date date,reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT (payroll_private.can(p_company_id,'cortes_control','view') OR payroll_private.can(p_company_id,'jornadas','view') OR payroll_private.can(p_company_id,'novedades','view') OR payroll_private.can(p_company_id,'reloj_checador','view') OR payroll_private.can(p_company_id,'prestamos','view') OR payroll_private.can(p_company_id,'descuentos','view')) THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT c.operation_center_id,o.name,c.level,c.cutoff_date,c.reason FROM public.payroll_control_cuts c JOIN public.operation_centers o ON o.id=c.operation_center_id WHERE c.company_id=p_company_id AND c.active AND public.check_center_access(c.company_id,c.operation_center_id);
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA payroll_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION payroll_private.can(uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.payroll_cut_centers(uuid),public.payroll_cut_change(uuid,uuid,smallint,text,date,text,uuid),public.payroll_cut_status(uuid),public.payroll_register_loan_payment(uuid,date,numeric,text,text,uuid),public.payroll_version_deduction(uuid,date,jsonb),public.payroll_set_time_config(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.payroll_cut_centers(uuid),public.payroll_cut_change(uuid,uuid,smallint,text,date,text,uuid),public.payroll_cut_status(uuid),public.payroll_register_loan_payment(uuid,date,numeric,text,text,uuid),public.payroll_version_deduction(uuid,date,jsonb),public.payroll_set_time_config(uuid,jsonb) TO authenticated;
