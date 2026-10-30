-- A no-show reverses a first hire only. Retain an immutable receipt and a private
-- snapshot before removing the provisional employee and its preparation records.
CREATE TABLE public.candidate_hiring_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL UNIQUE,
  vacancy_id uuid NOT NULL REFERENCES public.vacancies(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 2000),
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  performed_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  documents_preserved integer NOT NULL,
  contract_numbers text[] NOT NULL,
  review_token text NOT NULL
);
ALTER TABLE public.candidate_hiring_reversals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.candidate_hiring_reversals FROM anon, authenticated;
GRANT SELECT ON public.candidate_hiring_reversals TO authenticated;
CREATE POLICY "Read accessible hiring reversal history"
ON public.candidate_hiring_reversals FOR SELECT TO authenticated USING (
  (public.is_super_admin() OR public.is_company_member(company_id))
  AND (public.is_super_admin() OR public.is_admin() OR public.check_user_permission(auth.uid(), 'seleccion', 'view'))
  AND EXISTS (SELECT 1 FROM public.vacancies v WHERE v.id=vacancy_id
    AND public.check_center_access(v.company_id,v.operation_center_id)
    AND (v.requisition_id IS NULL OR public.user_can_read_requisition(v.requisition_id)))
);
CREATE INDEX candidate_hiring_reversals_candidate_idx ON public.candidate_hiring_reversals(candidate_id, created_at DESC);

CREATE TABLE private.candidate_hiring_reversal_archives (
  reversal_id uuid PRIMARY KEY REFERENCES public.candidate_hiring_reversals(id) ON DELETE RESTRICT,
  snapshot jsonb NOT NULL
);
ALTER TABLE private.candidate_hiring_reversal_archives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.candidate_hiring_reversal_archives FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.candidate_hiring_reversal(
  p_candidate_id uuid, p_company_id uuid, p_execute boolean,
  p_employee_id uuid DEFAULT NULL, p_review_token text DEFAULT NULL,
  p_reason text DEFAULT NULL, p_document_number text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := (SELECT auth.uid());
  c public.candidates; v public.vacancies; e public.employees_v2;
  cycle public.employee_employment_cycles;
  prior public.candidate_hiring_reversals;
  t record; a jsonb; deps jsonb := '{}'::jsonb; snapshot jsonb; attachments jsonb;
  token text; receipt_id uuid; doc_count integer; contract_numbers text[];
  actor_name text; next_status public.vacancy_status;
BEGIN
  IF p_execute IS NULL THEN RAISE EXCEPTION 'Debe indicar el tipo de operación.'; END IF;
  IF actor IS NULL THEN RAISE EXCEPTION 'Debe iniciar sesión.' USING ERRCODE='42501'; END IF;
  IF NOT (public.is_super_admin() OR (
    public.is_company_member(p_company_id) AND (
      public.is_admin() OR (
        SELECT count(DISTINCT (m.code,p.action))=2
        FROM public.user_custom_roles ur JOIN public.custom_roles cr ON cr.id=ur.role_id
        JOIN public.role_permissions rp ON rp.role_id=cr.id
        JOIN public.permissions p ON p.id=rp.permission_id JOIN public.modules m ON m.id=p.module_id
        WHERE ur.user_id=actor AND cr.company_id=p_company_id AND cr.is_active AND m.is_active
        AND ((m.code='seleccion' AND p.action::text='update') OR (m.code='empleados' AND p.action::text='delete'))
      )
    )
  )) THEN RAISE EXCEPTION 'Requiere actualizar Selección y eliminar Empleados en esta empresa.' USING ERRCODE='42501'; END IF;

  SELECT * INTO c FROM public.candidates WHERE id=p_candidate_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidato no disponible.'; END IF;
  -- Same identity lock used by complete_candidate_hiring.
  PERFORM pg_advisory_xact_lock(hashtextextended(c.company_id::text||':'||c.document_type::text||':'||lower(btrim(c.document_number)),0));
  SELECT * INTO c FROM public.candidates WHERE id=p_candidate_id AND company_id=p_company_id FOR UPDATE;
  SELECT * INTO v FROM public.vacancies WHERE id=c.vacancy_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND OR NOT public.check_center_access(v.company_id,v.operation_center_id)
    OR (v.requisition_id IS NOT NULL AND NOT public.user_can_read_requisition(v.requisition_id))
  THEN RAISE EXCEPTION 'No tiene acceso a este proceso.' USING ERRCODE='42501'; END IF;
  PERFORM id FROM public.candidates WHERE vacancy_id=v.id ORDER BY id FOR UPDATE NOWAIT;

  IF p_execute THEN
    IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Escriba un motivo de 10 a 2000 caracteres.'; END IF;
    IF p_document_number IS NULL OR btrim(p_document_number)<>btrim(c.document_number) THEN RAISE EXCEPTION 'El documento de confirmación no coincide.'; END IF;
    SELECT * INTO prior FROM public.candidate_hiring_reversals
    WHERE candidate_id=c.id AND employee_id=p_employee_id AND review_token=p_review_token;
    IF FOUND AND c.status='withdrawn' AND c.employee_id IS NULL THEN
      RETURN jsonb_build_object('reversal_id',prior.id,'candidate_id',c.id,'vacancy_id',v.id,'documents_preserved',prior.documents_preserved,'existing',true);
    END IF;
  END IF;
  IF c.status<>'hired' OR c.employee_id IS NULL THEN RAISE EXCEPTION 'Solo puede revertirse un candidato en Seleccionado - Contratar vinculado a Empleados.'; END IF;
  IF c.rehire_employee_id IS NOT NULL THEN RAISE EXCEPTION 'Es un reingreso: requiere revisión para conservar la historia laboral anterior.'; END IF;
  IF v.status NOT IN ('in_process','pending_placed') OR v.actual_close_date IS NOT NULL OR v.colocado_url IS NOT NULL THEN
    RAISE EXCEPTION 'La vacante debe estar En Proceso o Pendiente Colocado y sin cierre ni colocado.';
  END IF;
  SELECT * INTO e FROM public.employees_v2 WHERE id=c.employee_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND OR e.document_type<>c.document_type OR lower(btrim(e.document_number))<>lower(btrim(c.document_number))
    OR NOT e.is_active OR e.status<>'active' THEN RAISE EXCEPTION 'El vínculo o estado del empleado requiere revisión.'; END IF;
  SELECT * INTO cycle FROM public.employee_employment_cycles WHERE employee_id=e.id FOR UPDATE;
  IF NOT FOUND OR (SELECT count(*) FROM public.employee_employment_cycles WHERE employee_id=e.id)<>1
    OR cycle.candidate_id IS DISTINCT FROM c.id OR cycle.cycle_number<>1 OR cycle.source<>'selection'
    OR cycle.company_id<>p_company_id OR cycle.status<>'active' OR cycle.end_date IS NOT NULL
  THEN RAISE EXCEPTION 'Solo se permite revertir el primer ingreso originado en este candidato.'; END IF;
  IF EXISTS(SELECT 1 FROM public.employee_work_info w WHERE w.employee_id=e.id
    AND (w.company_id<>p_company_id OR w.operation_center_id IS NULL OR NOT public.check_center_access(w.company_id,w.operation_center_id)))
  THEN RAISE EXCEPTION 'No tiene acceso a todos los centros del empleado.' USING ERRCODE='42501'; END IF;

  -- Fail closed for every employee/cycle reference, including new FK columns.
  -- Row locks stop changes to existing preparation records until COMMIT.
  FOR t IN
    SELECT DISTINCT n.nspname schema_name,cl.relname table_name,att.attname column_name,
      EXISTS(SELECT 1 FROM pg_constraint fk WHERE fk.conrelid=cl.oid AND fk.contype='f'
        AND att.attnum=ANY(fk.conkey) AND fk.confrelid IN ('public.employees_v2'::regclass,'public.employee_employment_cycles'::regclass)) has_fk,
      CASE WHEN att.attname IN ('employment_cycle_id','cycle_id') OR EXISTS (
        SELECT 1 FROM pg_constraint fk WHERE fk.conrelid=cl.oid AND fk.contype='f'
        AND att.attnum=ANY(fk.conkey) AND fk.confrelid='public.employee_employment_cycles'::regclass
      ) THEN cycle.id ELSE e.id END target
    FROM pg_attribute att JOIN pg_class cl ON cl.oid=att.attrelid JOIN pg_namespace n ON n.oid=cl.relnamespace
    WHERE cl.relkind IN ('r','p') AND att.attnum>0 AND NOT att.attisdropped AND att.atttypid='uuid'::regtype
    AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
    AND NOT (n.nspname='public' AND cl.relname='candidate_hiring_reversals')
    AND (att.attname IN ('employee_id','source_employee_id','target_employee_id','rehire_employee_id','employment_cycle_id')
      OR EXISTS (SELECT 1 FROM pg_constraint fk WHERE fk.conrelid=cl.oid AND fk.contype='f'
        AND att.attnum=ANY(fk.conkey) AND fk.confrelid IN ('public.employees_v2'::regclass,'public.employee_employment_cycles'::regclass)))
    ORDER BY 1,2,3
  LOOP
    -- Parent row locks protect FK references. Only legacy columns without FK
    -- protection need a table lock, avoiding contention on unrelated activity.
    IF NOT t.has_fk THEN
      EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE NOWAIT',t.schema_name,t.table_name);
    END IF;
    EXECUTE format('SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM (SELECT * FROM %I.%I WHERE %I=$1 FOR UPDATE) x',t.schema_name,t.table_name,t.column_name) INTO a USING t.target;
    IF a IS NULL THEN CONTINUE; END IF;
    IF t.schema_name<>'public' OR t.table_name<>ALL(ARRAY[
      'candidates','employee_employment_cycles','contracts','employee_contact','employee_family','employee_family_members',
      'employee_work_info','employee_social_security','employee_bank_info','employee_documents','employee_certifications',
      'employee_vaccinations','employee_schedule','employee_time_config','employee_operation_center_assignments',
      'employee_onboarding_tasks','medical_exams','vacation_balances','leave_balances','vacation_balance_movements'
    ]) THEN RAISE EXCEPTION 'Hay actividad o vínculos en %. Requiere revisión manual.',t.table_name; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(a) j WHERE j->>'company_id' IS DISTINCT FROM p_company_id::text) THEN
      RAISE EXCEPTION 'Hay registros vinculados a otra empresa. Requiere revisión manual.';
    END IF;
    deps:=deps||jsonb_build_object(t.schema_name||'.'||t.table_name||'.'||t.column_name,a);
  END LOOP;
  -- Unknown indirect descendants must never silently disappear in a cascade.
  FOR t IN
    SELECT child_ns.nspname child_schema,child.relname child_table,ca.attname child_column,
      parent_ns.nspname parent_schema,parent.relname parent_table,pa.attname parent_column
    FROM pg_constraint fk JOIN pg_class parent ON parent.oid=fk.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid=parent.relnamespace
    JOIN pg_class child ON child.oid=fk.conrelid JOIN pg_namespace child_ns ON child_ns.oid=child.relnamespace
    JOIN pg_attribute ca ON ca.attrelid=child.oid AND ca.attnum=fk.conkey[1]
    JOIN pg_attribute pa ON pa.attrelid=parent.oid AND pa.attnum=fk.confkey[1]
    WHERE fk.contype='f' AND parent_ns.nspname='public'
      AND parent.relname IN ('contracts','employee_contact','employee_family','employee_family_members','employee_work_info',
        'employee_social_security','employee_bank_info','employee_documents','employee_certifications','employee_vaccinations',
        'employee_schedule','employee_time_config','employee_operation_center_assignments','employee_onboarding_tasks',
        'medical_exams','vacation_balances','leave_balances','vacation_balance_movements')
      AND EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=parent.oid AND a.attname='employee_id' AND NOT a.attisdropped)
      AND NOT (child_ns.nspname='public' AND child.relname='vacation_balance_movements')
    ORDER BY child_ns.nspname,child.relname
  LOOP
    EXECUTE format('SELECT jsonb_agg(to_jsonb(x)) FROM %I.%I x JOIN %I.%I p ON x.%I=p.%I WHERE p.employee_id=$1',
      t.child_schema,t.child_table,t.parent_schema,t.parent_table,t.child_column,t.parent_column) INTO a USING e.id;
    IF a IS NOT NULL THEN RAISE EXCEPTION 'Hay registros dependientes en %. Requiere revisión manual.',t.child_table; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.candidates x WHERE x.id<>c.id AND (x.employee_id=e.id OR x.rehire_employee_id=e.id))
    OR EXISTS(SELECT 1 FROM public.contracts x WHERE x.employee_id=e.id AND (x.is_approved OR x.approved_at IS NOT NULL OR x.is_terminated OR x.document_url IS NOT NULL OR x.employment_cycle_id IS DISTINCT FROM cycle.id))
    OR (SELECT count(*) FROM public.contracts WHERE employee_id=e.id)>1
    OR EXISTS(SELECT 1 FROM public.contract_extensions x JOIN public.contracts k ON k.id=x.contract_id WHERE k.employee_id=e.id)
    OR EXISTS(SELECT 1 FROM public.medical_exams WHERE employee_id=e.id AND exam_type::text<>'ingreso')
    OR EXISTS(SELECT 1 FROM public.vacation_balances WHERE employee_id=e.id AND (days_taken<>0 OR days_compensated<>0 OR days_reserved<>0 OR days_adjusted<>0))
    OR EXISTS(SELECT 1 FROM public.vacation_balance_movements WHERE employee_id=e.id AND movement_type::text<>'automatic_accrual')
  THEN RAISE EXCEPTION 'Hay contrato aprobado, historia previa o actividad posterior al ingreso. Requiere revisión manual.'; END IF;
  -- Descendants that could otherwise be removed or modified indirectly.
  IF EXISTS(SELECT 1 FROM public.document_expiry_alerts a JOIN public.employee_documents d ON a.document_id=d.id WHERE d.employee_id=e.id)
    OR EXISTS(SELECT 1 FROM public.employee_incapacities i JOIN public.medical_exams m ON m.id=i.reintegration_exam_id WHERE m.employee_id=e.id)
    OR EXISTS(SELECT 1 FROM public.vacation_requests q JOIN public.vacation_balances b ON b.id=q.balance_id WHERE b.employee_id=e.id)
    OR EXISTS(SELECT 1 FROM public.vacation_request_allocations q JOIN public.vacation_balances b ON b.id=q.balance_id WHERE b.employee_id=e.id)
  THEN RAISE EXCEPTION 'Hay registros posteriores dependientes. Requiere revisión manual.'; END IF;
  snapshot:=jsonb_build_object('candidate',to_jsonb(c),'vacancy',to_jsonb(v),'employee',to_jsonb(e),'dependencies',deps,
    'other_candidates',(SELECT jsonb_agg(jsonb_build_object('id',id,'status',status,'employee_id',employee_id) ORDER BY id)
      FROM public.candidates WHERE vacancy_id=v.id AND id<>c.id));
  token:=md5(snapshot::text);
  -- Some preparation modules store attachments outside employee_documents.
  -- Include those links too (medical exams, vaccinations, certificates, etc.).
  SELECT coalesce(jsonb_agg(item ORDER BY item->>'file_url'),'[]'::jsonb) INTO attachments FROM (
    SELECT DISTINCT ON (f.value) jsonb_build_object('file_url',f.value,
      'file_name',coalesce(nullif(r->>'file_name',''),nullif(substring(split_part(f.value,'?',1) from '[^/]+$'),''),'Documento conservado'),
      'document_type',CASE
        WHEN d.key LIKE 'public.medical_exams.%' THEN 'examenes_ocupacionales'
        WHEN d.key LIKE 'public.employee_vaccinations.%' THEN 'carne_vacunas'
        WHEN d.key LIKE 'public.employee_certifications.%' THEN 'certificados_laborales_academicos'
        WHEN d.key LIKE 'public.employee_bank_info.%' THEN 'certificados_bancarios'
        WHEN d.key LIKE 'public.employee_contact.%' THEN 'certificados_residencia'
        WHEN d.key LIKE 'public.candidates.%' AND f.key='cv_url' THEN 'hoja_vida'
        ELSE 'otro' END) item
    FROM jsonb_each(deps) d CROSS JOIN LATERAL jsonb_array_elements(d.value) r
    CROSS JOIN LATERAL jsonb_each_text(r) f
    WHERE right(f.key,4)='_url' AND nullif(btrim(f.value),'') IS NOT NULL
      AND d.key NOT LIKE 'public.employee_documents.%'
    ORDER BY f.value,d.key
  ) links;
  SELECT count(*) INTO doc_count FROM (
    SELECT file_url FROM public.employee_documents WHERE employee_id=e.id
    UNION SELECT item->>'file_url' FROM jsonb_array_elements(attachments) item
  ) documents;
  SELECT coalesce(array_agg(contract_number ORDER BY contract_number),ARRAY[]::text[]) INTO contract_numbers FROM public.contracts WHERE employee_id=e.id;
  next_status:=CASE WHEN EXISTS(SELECT 1 FROM public.candidates WHERE vacancy_id=v.id AND id<>c.id AND status='hired') THEN v.status ELSE 'in_process'::public.vacancy_status END;
  IF NOT p_execute THEN RETURN jsonb_build_object('employee_id',e.id,'candidate_name',concat_ws(' ',c.first_name,c.last_name),
    'document_number',c.document_number,'position_title',v.position_title,'review_token',token,
    'documents_to_preserve',doc_count,'contract_numbers',contract_numbers,'vacancy_status_after',next_status); END IF;
  IF p_employee_id IS DISTINCT FROM e.id OR p_review_token IS DISTINCT FROM token THEN RAISE EXCEPTION 'La información cambió. Cierre y vuelva a revisar la reversión antes de confirmar.'; END IF;

  SELECT coalesce(nullif(btrim(full_name),''),'Usuario autorizado') INTO actor_name FROM public.user_profiles WHERE id=actor;
  INSERT INTO public.candidate_hiring_reversals(company_id,candidate_id,employee_id,vacancy_id,reason,performed_by,performed_by_name,documents_preserved,contract_numbers,review_token)
  VALUES(p_company_id,c.id,e.id,v.id,btrim(p_reason),actor,coalesce(actor_name,'Usuario autorizado'),doc_count,contract_numbers,token) RETURNING id INTO receipt_id;
  INSERT INTO private.candidate_hiring_reversal_archives VALUES(receipt_id,snapshot);
  INSERT INTO public.candidate_documents(candidate_id,company_id,document_name,file_url,file_name,file_size,mime_type,observations,uploaded_by,created_at,document_type,expiry_date)
  SELECT c.id,d.company_id,d.document_name,d.file_url,d.file_name,d.file_size,d.mime_type,
    concat_ws(E'\n',nullif(d.observations,''),'Conservado al revertir contratación por no ingreso.'),d.uploaded_by,d.created_at,d.document_type,d.expiry_date
  FROM public.employee_documents d WHERE d.employee_id=e.id
    AND NOT EXISTS(SELECT 1 FROM public.candidate_documents cd WHERE cd.candidate_id=c.id AND cd.file_url=d.file_url);
  INSERT INTO public.candidate_documents(candidate_id,company_id,document_name,file_url,file_name,document_type,observations,uploaded_by)
  SELECT c.id,p_company_id,item->>'file_name',item->>'file_url',item->>'file_name',
    (jsonb_populate_record(NULL::public.candidate_documents,jsonb_build_object('document_type',item->>'document_type'))).document_type,
    'Adjunto conservado al revertir contratación por no ingreso.',actor
  FROM jsonb_array_elements(attachments) item WHERE NOT EXISTS(
    SELECT 1 FROM public.candidate_documents cd WHERE cd.candidate_id=c.id AND cd.file_url=item->>'file_url');
  IF EXISTS(SELECT 1 FROM public.employee_documents d WHERE d.employee_id=e.id AND NOT EXISTS(
    SELECT 1 FROM public.candidate_documents cd WHERE cd.candidate_id=c.id AND cd.company_id=p_company_id AND cd.file_url=d.file_url))
  THEN RAISE EXCEPTION 'No se pudieron conservar todos los documentos.'; END IF;
  UPDATE public.candidates SET status='withdrawn',is_selected=false,employee_id=NULL,
    withdrawal_reason='No ingresó. '||btrim(p_reason) WHERE id=c.id;
  UPDATE public.vacancies SET status=next_status WHERE id=v.id;
  -- Scope guards on absence balances need the employee and its active cycle to
  -- still exist; remove the archived, unused balances before the parent row.
  DELETE FROM public.vacation_balances WHERE employee_id=e.id;
  DELETE FROM public.leave_balances WHERE employee_id=e.id;
  DELETE FROM public.employees_v2 WHERE id=e.id AND company_id=p_company_id;
  INSERT INTO public.audit_logs(user_id,user_email,company_id,action,entity_type,entity_id,entity_name,old_values,new_values,description)
  VALUES(actor,(SELECT auth.jwt()->>'email'),p_company_id,'revert_candidate_hiring','candidate',c.id,
    concat_ws(' ',c.first_name,c.last_name),jsonb_build_object('employee_id',e.id,'status',c.status,'vacancy_status',v.status),
    jsonb_build_object('reversal_id',receipt_id,'status','withdrawn','vacancy_status',next_status,'documents_preserved',doc_count,'reason',btrim(p_reason)),
    'No ingresó / Revertir contratación');
  RETURN jsonb_build_object('reversal_id',receipt_id,'candidate_id',c.id,'vacancy_id',v.id,'documents_preserved',doc_count,'existing',false);
EXCEPTION WHEN lock_not_available OR deadlock_detected THEN
  RAISE EXCEPTION 'El proceso está siendo actualizado. Cierre y vuelva a revisar la reversión.';
END $$;
REVOKE ALL ON FUNCTION private.candidate_hiring_reversal(uuid,uuid,boolean,uuid,text,text,text) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.candidate_hiring_reversal(uuid,uuid,boolean,uuid,text,text,text) TO authenticated;

CREATE FUNCTION public.preview_candidate_hiring_reversal(p_candidate_id uuid,p_company_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.candidate_hiring_reversal(p_candidate_id,p_company_id,false);
$$;
CREATE FUNCTION public.revert_candidate_hiring(p_candidate_id uuid,p_company_id uuid,p_employee_id uuid,p_review_token text,p_reason text,p_document_number text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.candidate_hiring_reversal(p_candidate_id,p_company_id,true,p_employee_id,p_review_token,p_reason,p_document_number);
$$;
REVOKE ALL ON FUNCTION public.preview_candidate_hiring_reversal(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revert_candidate_hiring(uuid,uuid,uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_candidate_hiring_reversal(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_candidate_hiring(uuid,uuid,uuid,text,text,text) TO authenticated;
