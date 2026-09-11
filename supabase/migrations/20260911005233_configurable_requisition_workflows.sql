-- Immutable company workflows. Privileged implementation lives outside the Data API.
CREATE SCHEMA IF NOT EXISTS requisition_private;
REVOKE ALL ON SCHEMA requisition_private FROM PUBLIC;
GRANT USAGE ON SCHEMA requisition_private TO authenticated, service_role;

CREATE TABLE public.requisition_workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  version integer NOT NULL CHECK (version > 0),
  steps jsonb NOT NULL CHECK (jsonb_typeof(steps) = 'array' AND jsonb_array_length(steps) > 0),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, version), UNIQUE (company_id, id)
);
CREATE TABLE public.requisition_workflow_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id),
  active_version_id uuid NOT NULL,
  FOREIGN KEY (company_id, active_version_id) REFERENCES public.requisition_workflow_versions(company_id, id)
);
ALTER TABLE public.personnel_requisitions
  ADD COLUMN workflow_version_id uuid,
  ADD COLUMN current_approval_step_id uuid,
  ADD CONSTRAINT requisition_workflow_company_fk FOREIGN KEY (company_id, workflow_version_id)
    REFERENCES public.requisition_workflow_versions(company_id, id);
CREATE INDEX personnel_requisitions_workflow_idx ON public.personnel_requisitions(workflow_version_id);
CREATE TABLE public.requisition_step_executions (
  requisition_id uuid NOT NULL REFERENCES public.personnel_requisitions(id) ON DELETE CASCADE,
  step_id uuid NOT NULL,
  position integer NOT NULL,
  approved boolean,
  answers jsonb NOT NULL DEFAULT '{}',
  observations text,
  approver_id uuid,
  approver_name text,
  decided_at timestamptz,
  PRIMARY KEY (requisition_id, step_id), UNIQUE (requisition_id, position),
  CHECK ((approved IS NULL AND decided_at IS NULL AND approver_id IS NULL)
      OR (approved IS NOT NULL AND decided_at IS NOT NULL AND approver_id IS NOT NULL))
);
ALTER TABLE public.requisition_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_step_executions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.requisition_workflow_versions, public.requisition_workflow_settings,
  public.requisition_step_executions FROM anon, authenticated;
GRANT SELECT ON public.requisition_workflow_versions, public.requisition_workflow_settings,
  public.requisition_step_executions TO authenticated;
GRANT ALL ON public.requisition_workflow_versions, public.requisition_workflow_settings,
  public.requisition_step_executions TO service_role;
CREATE POLICY workflow_versions_read ON public.requisition_workflow_versions FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));
CREATE POLICY workflow_settings_read ON public.requisition_workflow_settings FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.is_company_member(company_id));

INSERT INTO public.modules(code, name, parent_id, icon, sort_order)
SELECT 'req_workflow_config', 'Configurar ciclo de requisiciones', id, 'GitBranch', 191
FROM public.modules WHERE code = 'requisiciones' ON CONFLICT (code) DO NOTHING;
INSERT INTO public.permissions(module_id, action, description)
SELECT id, 'update', 'Configurar y publicar el ciclo de aprobación de la empresa'
FROM public.modules WHERE code='req_workflow_config' ON CONFLICT (module_id, action) DO NOTHING;

CREATE FUNCTION requisition_private.step_permission(kind text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE kind WHEN 'coordinadores' THEN 'req_approve_coordinadores'
    WHEN 'rrhh' THEN 'req_approve_rh' WHEN 'juridico' THEN 'req_approve_juridica'
    WHEN 'operaciones' THEN 'req_approve_ger_op' WHEN 'gerencia' THEN 'req_approve_ger_adm'
    WHEN 'seleccion' THEN 'req_approve_seleccion' END
$$;
CREATE FUNCTION requisition_private.step_status(step jsonb) RETURNS public.requisition_status
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN step->>'kind' = 'custom' THEN 'en_aprobacion'
    ELSE 'en_' || (step->>'kind') END::public.requisition_status
$$;

CREATE FUNCTION requisition_private.can_approve(p_requisition_id uuid, p_step_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.personnel_requisitions; s jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT * INTO r FROM public.personnel_requisitions WHERE id=p_requisition_id;
  IF NOT FOUND OR r.workflow_version_id IS NULL OR r.current_approval_step_id IS DISTINCT FROM p_step_id
    OR r.estado_requisicion::text IN ('borrador','aprobada','rechazada','cerrada')
    OR NOT (public.is_super_admin() OR public.is_company_member(r.company_id))
    OR NOT public.check_center_access(r.company_id, r.operation_center_id) THEN RETURN false; END IF;
  SELECT s0 INTO s FROM public.requisition_workflow_versions v,
    LATERAL jsonb_array_elements(v.steps) s0
    WHERE v.id=r.workflow_version_id AND s0->>'id'=p_step_id::text;
  IF s IS NULL THEN RETURN false; END IF;
  IF public.is_super_admin() OR public.is_admin() THEN RETURN true; END IF;
  IF s->>'kind' <> 'custom' THEN
    RETURN public.check_user_permission(auth.uid(), requisition_private.step_permission(s->>'kind'), 'approve');
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_custom_roles ur JOIN public.custom_roles cr ON cr.id=ur.role_id
    WHERE ur.user_id=auth.uid() AND cr.company_id=r.company_id AND cr.is_active
      AND s->'role_ids' ? cr.id::text);
END $$;
CREATE FUNCTION public.can_approve_requisition_step(p_requisition_id uuid, p_step_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT requisition_private.can_approve(p_requisition_id, p_step_id)
$$;

-- Add dynamic approvers to read access without weakening the legacy confidentiality rules.
CREATE POLICY workflow_approver_read ON public.personnel_requisitions FOR SELECT TO authenticated
  USING (workflow_version_id IS NOT NULL AND public.can_approve_requisition_step(id, current_approval_step_id));
CREATE POLICY workflow_execution_read ON public.requisition_step_executions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.personnel_requisitions r WHERE r.id=requisition_id));

CREATE FUNCTION requisition_private.validate_steps(p_company_id uuid, p_steps jsonb) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE s jsonb; f jsonb; ids text[] := '{}'; kinds text[] := '{}'; field_ids text[];
  rid text; pos integer := 0; opt jsonb;
BEGIN
  IF jsonb_typeof(p_steps) IS DISTINCT FROM 'array' OR jsonb_array_length(p_steps)=0 THEN
    RAISE EXCEPTION 'El ciclo debe tener al menos una etapa.' USING ERRCODE='23514'; END IF;
  FOR s IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
    pos := pos+1;
    IF jsonb_typeof(s) IS DISTINCT FROM 'object' OR jsonb_typeof(s->'name') IS DISTINCT FROM 'string' OR NULLIF(btrim(s->>'name'),'') IS NULL
      OR s->>'kind' IS NULL OR s->>'kind' NOT IN ('custom','coordinadores','rrhh','juridico','operaciones','gerencia','seleccion')
      OR s->>'id' IS NULL THEN RAISE EXCEPTION 'Etapa inválida.' USING ERRCODE='23514'; END IF;
    PERFORM (s->>'id')::uuid;
    IF s->>'id'=ANY(ids) THEN RAISE EXCEPTION 'Las etapas deben tener identificadores únicos.'; END IF;
    ids := array_append(ids,s->>'id');
    IF s->>'kind'<>'custom' AND s->>'kind'=ANY(kinds) THEN RAISE EXCEPTION 'No puede repetir una etapa estándar.'; END IF;
    kinds := array_append(kinds,s->>'kind');
    IF s->>'kind'='seleccion' AND pos<>jsonb_array_length(p_steps) THEN RAISE EXCEPTION 'Selección debe estar al final.'; END IF;
    IF jsonb_typeof(s->'fields') IS DISTINCT FROM 'array' OR jsonb_typeof(s->'role_ids') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Campos y roles inválidos.'; END IF;
    IF s->>'kind'<>'custom' AND (jsonb_array_length(s->'fields')>0 OR jsonb_array_length(s->'role_ids')>0) THEN
      RAISE EXCEPTION 'Las etapas estándar conservan sus campos y permisos.'; END IF;
    IF s->>'kind'='custom' AND jsonb_array_length(s->'role_ids')=0 THEN RAISE EXCEPTION 'Asigne al menos un rol aprobador.'; END IF;
    FOR rid IN SELECT jsonb_array_elements_text(s->'role_ids') LOOP
      PERFORM id FROM public.custom_roles WHERE id=rid::uuid AND company_id=p_company_id AND is_active FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'El rol debe estar activo y pertenecer a la empresa.'; END IF;
    END LOOP;
    field_ids := '{}';
    FOR f IN SELECT value FROM jsonb_array_elements(s->'fields') LOOP
      IF jsonb_typeof(f->'label') IS DISTINCT FROM 'string' OR NULLIF(btrim(f->>'label'),'') IS NULL OR f->>'id' IS NULL
        OR f->>'type' IS NULL OR f->>'type' NOT IN ('text','textarea','number','date','boolean','select')
        OR jsonb_typeof(f->'required') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Campo inválido.'; END IF;
      PERFORM (f->>'id')::uuid;
      IF f->>'id'=ANY(field_ids) THEN RAISE EXCEPTION 'Identificador de campo duplicado.'; END IF;
      field_ids := array_append(field_ids,f->>'id');
      IF f->>'type'='select' THEN
        IF jsonb_typeof(f->'options') IS DISTINCT FROM 'array' OR jsonb_array_length(f->'options')=0 THEN
          RAISE EXCEPTION 'Defina las opciones del campo.'; END IF;
        FOR opt IN SELECT value FROM jsonb_array_elements(f->'options') LOOP
          IF jsonb_typeof(opt)<>'string' OR btrim(opt #>> '{}')='' THEN RAISE EXCEPTION 'Opción inválida.'; END IF;
        END LOOP;
        IF (SELECT count(*)<>count(DISTINCT value) FROM jsonb_array_elements(f->'options')) THEN
          RAISE EXCEPTION 'Las opciones no pueden repetirse.'; END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

CREATE FUNCTION requisition_private.publish(p_company_id uuid, p_steps jsonb, p_expected_version_id uuid)
RETURNS public.requisition_workflow_versions LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE active uuid; result public.requisition_workflow_versions;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_super_admin() OR public.is_company_member(p_company_id))
    OR NOT (public.is_admin() OR public.is_super_admin() OR public.check_user_permission(auth.uid(),'req_workflow_config','update')) THEN
    RAISE EXCEPTION 'No tiene permiso para configurar este ciclo.' USING ERRCODE='42501'; END IF;
  PERFORM id FROM public.companies WHERE id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa no encontrada.'; END IF;
  SELECT active_version_id INTO active FROM public.requisition_workflow_settings WHERE company_id=p_company_id;
  IF active IS DISTINCT FROM p_expected_version_id THEN
    RAISE EXCEPTION 'El ciclo cambió. Recargue la configuración antes de publicar.' USING ERRCODE='40001'; END IF;
  PERFORM requisition_private.validate_steps(p_company_id,p_steps);
  INSERT INTO public.requisition_workflow_versions(company_id,version,steps,created_by)
    SELECT p_company_id,COALESCE(max(version),0)+1,p_steps,auth.uid()
    FROM public.requisition_workflow_versions WHERE company_id=p_company_id RETURNING * INTO result;
  INSERT INTO public.requisition_workflow_settings VALUES (p_company_id,result.id)
    ON CONFLICT (company_id) DO UPDATE SET active_version_id=excluded.active_version_id;
  RETURN result;
END $$;
CREATE FUNCTION public.publish_requisition_workflow(p_company_id uuid,p_steps jsonb,p_expected_version_id uuid DEFAULT NULL)
RETURNS public.requisition_workflow_versions LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT requisition_private.publish(p_company_id,p_steps,p_expected_version_id)
$$;

CREATE FUNCTION requisition_private.submit(p_requisition_id uuid) RETURNS public.personnel_requisitions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.personnel_requisitions; v public.requisition_workflow_versions;
BEGIN
  SELECT * INTO r FROM public.personnel_requisitions WHERE id=p_requisition_id FOR UPDATE;
  IF auth.uid() IS NULL OR r.id IS NULL OR NOT (public.is_super_admin() OR public.is_company_member(r.company_id))
    OR NOT public.check_center_access(r.company_id,r.operation_center_id)
    OR NOT public.user_can_read_requisition(r.id)
    OR NOT (public.is_super_admin() OR public.is_admin_or_rrhh() OR r.created_by=auth.uid()
      OR public.check_user_permission(auth.uid(),'requisiciones','create')
      OR public.check_user_permission(auth.uid(),'requisiciones','update')
      OR public.check_user_permission(auth.uid(),'req_approve_coordinadores','approve')) THEN
    RAISE EXCEPTION 'No tiene permiso para enviar esta requisición.' USING ERRCODE='42501'; END IF;
  IF r.estado_requisicion<>'borrador' THEN RAISE EXCEPTION 'La requisición ya fue enviada.' USING ERRCODE='40001'; END IF;
  IF NULLIF(btrim(r.lider_proceso),'') IS NULL THEN RAISE EXCEPTION 'Debe ingresar el Líder del Proceso.'; END IF;
  SELECT v0.* INTO v FROM public.requisition_workflow_versions v0
    JOIN public.requisition_workflow_settings s ON s.active_version_id=v0.id WHERE s.company_id=r.company_id;
  IF v.id IS NULL THEN
    IF r.autoriza IS NULL THEN RAISE EXCEPTION 'Debe seleccionar quién autoriza.'; END IF;
    UPDATE public.personnel_requisitions SET estado_requisicion='en_coordinadores' WHERE id=r.id RETURNING * INTO r;
  ELSE
    INSERT INTO public.requisition_step_executions(requisition_id,step_id,position)
      SELECT r.id,(s->>'id')::uuid, ord::integer FROM jsonb_array_elements(v.steps) WITH ORDINALITY a(s,ord);
    UPDATE public.personnel_requisitions SET workflow_version_id=v.id, current_approval_step_id=(v.steps->0->>'id')::uuid,
      autoriza=NULL, estado_requisicion=requisition_private.step_status(v.steps->0) WHERE id=r.id RETURNING * INTO r;
  END IF;
  RETURN r;
END $$;
CREATE FUNCTION public.submit_requisition(p_requisition_id uuid) RETURNS public.personnel_requisitions
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT requisition_private.submit(p_requisition_id) $$;

CREATE FUNCTION requisition_private.validate_answers(s jsonb,a jsonb,approved boolean) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE f jsonb; val jsonb; k text;
BEGIN
  IF jsonb_typeof(a) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Respuestas inválidas.'; END IF;
  FOR k IN SELECT jsonb_object_keys(a) LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(s->'fields') f0 WHERE f0->>'id'=k) THEN
      RAISE EXCEPTION 'Campo desconocido.'; END IF;
  END LOOP;
  FOR f IN SELECT value FROM jsonb_array_elements(s->'fields') LOOP
    val := a->(f->>'id');
    IF val IS NULL OR val='null'::jsonb OR (jsonb_typeof(val)='string' AND btrim(val #>> '{}')='') THEN
      IF approved AND (f->>'required')::boolean THEN RAISE EXCEPTION 'Complete el campo: %',f->>'label'; END IF;
      CONTINUE;
    END IF;
    IF (f->>'type'='number' AND jsonb_typeof(val)<>'number')
      OR (f->>'type'='boolean' AND jsonb_typeof(val)<>'boolean')
      OR (f->>'type' IN ('text','textarea','date','select') AND jsonb_typeof(val)<>'string') THEN
      RAISE EXCEPTION 'Tipo de dato incorrecto: %',f->>'label'; END IF;
    IF f->>'type'='date' THEN
      IF (val #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Fecha inválida.'; END IF;
      PERFORM (val #>> '{}')::date;
    END IF;
    IF f->>'type'='select' AND NOT (f->'options' @> jsonb_build_array(val)) THEN RAISE EXCEPTION 'Opción no válida.'; END IF;
  END LOOP;
END $$;

CREATE FUNCTION requisition_private.approve(p_requisition_id uuid,p_step_id uuid,p_approved boolean,
  p_observations text,p_answers jsonb,p_standard_data jsonb,p_vacancy_codes jsonb) RETURNS public.personnel_requisitions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.personnel_requisitions; s jsonb; next_s jsonb; pos integer; name text;
  patch jsonb; key text; allowed text[]; assignments text;
BEGIN
  SELECT * INTO r FROM public.personnel_requisitions WHERE id=p_requisition_id FOR UPDATE;
  IF NOT requisition_private.can_approve(p_requisition_id,p_step_id) THEN
    RAISE EXCEPTION 'No tiene permiso o esta etapa ya no está activa.' USING ERRCODE='42501'; END IF;
  IF p_approved IS NULL THEN RAISE EXCEPTION 'Indique la decisión.'; END IF;
  SELECT e.position INTO pos FROM public.requisition_step_executions e
    WHERE e.requisition_id=r.id AND e.step_id=p_step_id AND e.approved IS NULL;
  IF pos IS NULL OR EXISTS (SELECT 1 FROM public.requisition_step_executions e WHERE e.requisition_id=r.id
    AND e.position<pos AND e.approved IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Etapa fuera de secuencia.'; END IF;
  SELECT steps->(pos-1),steps->pos INTO s,next_s FROM public.requisition_workflow_versions WHERE id=r.workflow_version_id;
  SELECT COALESCE(NULLIF(btrim(p.full_name),''),NULLIF(btrim(p.display_name),''),auth.uid()::text)
    INTO name FROM public.user_profiles p WHERE p.id=auth.uid();
  name := COALESCE(name,auth.uid()::text);
  IF s->>'kind'='custom' THEN
    PERFORM requisition_private.validate_answers(s,p_answers,p_approved);
    IF p_standard_data<>'{}'::jsonb THEN RAISE EXCEPTION 'Datos estándar no permitidos.'; END IF;
  ELSE
    IF p_answers<>'{}'::jsonb THEN RAISE EXCEPTION 'Respuestas personalizadas no permitidas.'; END IF;
    allowed := CASE s->>'kind'
      WHEN 'rrhh' THEN ARRAY['rrhh_asignacion_salarial','rrhh_condiciones_adicionales','rrhh_fuente_asignacion_salarial','rrhh_nivel_politica_salarial','rrhh_tipo_convocatoria','rrhh_incluye_auxilio_transporte']
      WHEN 'juridico' THEN ARRAY['juridico_tipo_contrato','juridico_duracion']
      WHEN 'seleccion' THEN ARRAY['seleccion_fecha_inicio_proceso','seleccion_perfil_cargo_creado','seleccion_tipo_mano_obra']
      WHEN 'operaciones' THEN ARRAY['operaciones_aprobado_salario']
      WHEN 'gerencia' THEN ARRAY['gerencia_aprobado_salario'] ELSE ARRAY[]::text[] END;
    IF jsonb_typeof(p_standard_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Datos inválidos.'; END IF;
    FOR key IN SELECT jsonb_object_keys(p_standard_data) LOOP
      IF NOT key=ANY(allowed) THEN RAISE EXCEPTION 'Campo no permitido: %',key; END IF;
    END LOOP;
    IF s->>'kind'='rrhh' AND (p_approved OR p_standard_data<>'{}'::jsonb)
      AND NOT (public.is_admin() OR public.is_super_admin() OR public.check_user_permission(auth.uid(),'salarios','update')) THEN
      RAISE EXCEPTION 'No tiene permisos para asignar salarios.' USING ERRCODE='42501'; END IF;
    IF p_approved THEN
      IF s->>'kind'='rrhh' AND (COALESCE((p_standard_data->>'rrhh_asignacion_salarial')::numeric,0)<=0
        OR COALESCE(p_standard_data->>'rrhh_tipo_convocatoria','') NOT IN ('externa','interna','mixta')) THEN
        RAISE EXCEPTION 'Complete salario y tipo de convocatoria.'; END IF;
      IF s->>'kind'='juridico' AND (NULLIF(btrim(p_standard_data->>'juridico_tipo_contrato'),'') IS NULL
        OR NULLIF(btrim(p_standard_data->>'juridico_duracion'),'') IS NULL) THEN RAISE EXCEPTION 'Complete contrato y duración.'; END IF;
      IF s->>'kind'='seleccion' AND (NULLIF(p_standard_data->>'seleccion_fecha_inicio_proceso','') IS NULL
        OR NULLIF(btrim(p_standard_data->>'seleccion_tipo_mano_obra'),'') IS NULL) THEN RAISE EXCEPTION 'Complete fecha y tipo de mano de obra.'; END IF;
    END IF;
    patch := p_standard_data || jsonb_build_object(
      (s->>'kind')||'_aprobado',p_approved,(s->>'kind')||'_quien_aprobo',name,
      (s->>'kind')||'_aprobador_id',auth.uid(),(s->>'kind')||'_fecha_aprobacion',now(),
      (s->>'kind')||'_observaciones',p_observations);
    SELECT string_agg(format('%I = x.%I', k,k),',') INTO assignments FROM jsonb_object_keys(patch) k;
    EXECUTE format('UPDATE public.personnel_requisitions r SET %s FROM jsonb_populate_record(NULL::public.personnel_requisitions,$1) x WHERE r.id=$2',assignments)
      USING patch,r.id;
  END IF;
  UPDATE public.requisition_step_executions SET approved=p_approved,observations=p_observations,
    answers=CASE WHEN s->>'kind'='custom' THEN p_answers ELSE p_standard_data END,
    approver_id=auth.uid(),approver_name=name,decided_at=now() WHERE requisition_id=r.id AND step_id=p_step_id;
  IF jsonb_typeof(p_vacancy_codes) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Códigos de vacante inválidos.'; END IF;
  IF jsonb_array_length(p_vacancy_codes)>0 THEN
    IF s->>'kind'<>'seleccion' OR NOT p_approved THEN RAISE EXCEPTION 'Los códigos se registran al aprobar Selección.'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_vacancy_codes) c LEFT JOIN public.vacancy_publication_platforms vp
      ON vp.id=(c->>'platform_id')::uuid AND vp.company_id=r.company_id AND vp.is_active
      WHERE vp.id IS NULL OR NULLIF(btrim(c->>'codigo_vacante_externa'),'') IS NULL
        OR (c->>'fecha_cierre')::date < (c->>'fecha_creacion')::date) THEN RAISE EXCEPTION 'Plataforma, código o fechas inválidas.'; END IF;
    INSERT INTO public.requisition_vacancy_codes(requisition_id,company_id,platform_id,codigo_vacante_externa,entidad_origen,fecha_creacion,fecha_cierre)
      SELECT r.id,r.company_id,vp.id,btrim(c->>'codigo_vacante_externa'),vp.name,(c->>'fecha_creacion')::date,(c->>'fecha_cierre')::date
      FROM jsonb_array_elements(p_vacancy_codes) c JOIN public.vacancy_publication_platforms vp ON vp.id=(c->>'platform_id')::uuid;
  END IF;
  UPDATE public.personnel_requisitions SET
    estado_requisicion=CASE WHEN NOT p_approved THEN 'rechazada'::public.requisition_status
      WHEN next_s IS NULL THEN 'aprobada'::public.requisition_status ELSE requisition_private.step_status(next_s) END,
    current_approval_step_id=CASE WHEN p_approved AND next_s IS NOT NULL THEN (next_s->>'id')::uuid ELSE NULL END
    WHERE id=r.id RETURNING * INTO r;
  RETURN r;
END $$;
CREATE FUNCTION public.approve_requisition_step(p_requisition_id uuid,p_step_id uuid,p_approved boolean,
  p_observations text DEFAULT NULL,p_answers jsonb DEFAULT '{}',p_standard_data jsonb DEFAULT '{}',p_vacancy_codes jsonb DEFAULT '[]')
RETURNS public.personnel_requisitions LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT requisition_private.approve(p_requisition_id,p_step_id,p_approved,p_observations,p_answers,p_standard_data,p_vacancy_codes)
$$;

-- The legacy trigger still validates only legacy requisitions. New writes are RPC-only.
-- Some installations predate the legacy sequence trigger. Preserve either deployment.
DO $$ BEGIN
  IF to_regprocedure('public.enforce_requisition_approval_sequence()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS enforce_requisition_approval_sequence ON public.personnel_requisitions;
    CREATE TRIGGER enforce_requisition_approval_sequence BEFORE UPDATE ON public.personnel_requisitions
      FOR EACH ROW WHEN (NEW.workflow_version_id IS NULL) EXECUTE FUNCTION public.enforce_requisition_approval_sequence();
  END IF;
END $$;
CREATE FUNCTION requisition_private.guard_requisition() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE k text;
BEGIN
  -- RPC implementation runs as the owner; a client cannot impersonate that database role.
  IF current_user NOT IN ('authenticated','anon','authenticator') THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.workflow_version_id IS NOT NULL OR NEW.current_approval_step_id IS NOT NULL THEN
      RAISE EXCEPTION 'Envíe la requisición mediante la operación de envío.' USING ERRCODE='42501'; END IF;
    IF EXISTS (SELECT 1 FROM public.requisition_workflow_settings WHERE company_id=NEW.company_id) THEN
      IF NEW.estado_requisicion<>'borrador' THEN RAISE EXCEPTION 'Las requisiciones nuevas deben crearse en borrador.' USING ERRCODE='42501'; END IF;
      FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
        IF k ~ '_(aprobado|aprobador_id|quien_aprobo|fecha_aprobacion)$' AND to_jsonb(NEW)->k<>'null'::jsonb THEN
          RAISE EXCEPTION 'No puede crear aprobaciones directamente.' USING ERRCODE='42501'; END IF;
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.workflow_version_id IS DISTINCT FROM OLD.workflow_version_id
    OR NEW.current_approval_step_id IS DISTINCT FROM OLD.current_approval_step_id THEN
    RAISE EXCEPTION 'El ciclo se gestiona mediante las operaciones de aprobación.' USING ERRCODE='42501'; END IF;
  IF OLD.workflow_version_id IS NOT NULL THEN
    FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF (k ~ '^(coordinadores|rrhh|juridico|operaciones|gerencia|seleccion)_' OR k IN ('company_id','autoriza','estado_requisicion'))
        AND to_jsonb(NEW)->k IS DISTINCT FROM to_jsonb(OLD)->k THEN
        IF k='estado_requisicion' AND OLD.estado_requisicion='aprobada' AND NEW.estado_requisicion='cerrada' THEN CONTINUE; END IF;
        RAISE EXCEPTION 'No puede modificar directamente el historial de aprobación.' USING ERRCODE='42501';
      END IF;
    END LOOP;
  ELSIF OLD.estado_requisicion='borrador' AND NEW.estado_requisicion<>OLD.estado_requisicion
    AND EXISTS (SELECT 1 FROM public.requisition_workflow_settings WHERE company_id=NEW.company_id) THEN
    RAISE EXCEPTION 'Envíe la requisición con el ciclo publicado.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_configured_requisition BEFORE INSERT OR UPDATE ON public.personnel_requisitions
  FOR EACH ROW EXECUTE FUNCTION requisition_private.guard_requisition();

CREATE FUNCTION requisition_private.protect_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.is_active AND NEW.company_id=OLD.company_id THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.requisition_workflow_versions v,LATERAL jsonb_array_elements(v.steps) s
    WHERE s->'role_ids' ? OLD.id::text AND (
      EXISTS (SELECT 1 FROM public.requisition_workflow_settings cfg WHERE cfg.active_version_id=v.id)
      OR EXISTS (SELECT 1 FROM public.personnel_requisitions r WHERE r.workflow_version_id=v.id
        AND r.estado_requisicion::text NOT IN ('aprobada','rechazada','cerrada')))) THEN
    RAISE EXCEPTION 'El rol está asignado a un ciclo publicado o una requisición pendiente.' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_requisition_workflow_role BEFORE DELETE OR UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION requisition_private.protect_role();

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA requisition_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION requisition_private.can_approve(uuid,uuid),
  requisition_private.publish(uuid,jsonb,uuid), requisition_private.submit(uuid),
  requisition_private.approve(uuid,uuid,boolean,text,jsonb,jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.can_approve_requisition_step(uuid,uuid),
  public.publish_requisition_workflow(uuid,jsonb,uuid),public.submit_requisition(uuid),
  public.approve_requisition_step(uuid,uuid,boolean,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_approve_requisition_step(uuid,uuid),
  public.publish_requisition_workflow(uuid,jsonb,uuid),public.submit_requisition(uuid),
  public.approve_requisition_step(uuid,uuid,boolean,text,jsonb,jsonb,jsonb) TO authenticated;

CREATE FUNCTION requisition_private.has_assignment(p_company_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND (public.is_super_admin() OR public.is_company_member(p_company_id))
    AND EXISTS (SELECT 1 FROM public.user_custom_roles ur JOIN public.custom_roles cr ON cr.id=ur.role_id
      JOIN public.requisition_workflow_versions v ON v.company_id=cr.company_id,
      LATERAL jsonb_array_elements(v.steps) s
      WHERE ur.user_id=auth.uid() AND cr.is_active AND cr.company_id=p_company_id AND s->'role_ids' ? cr.id::text
        AND (EXISTS (SELECT 1 FROM public.requisition_workflow_settings cfg WHERE cfg.active_version_id=v.id)
          OR EXISTS (SELECT 1 FROM public.personnel_requisitions r WHERE r.workflow_version_id=v.id
            AND r.current_approval_step_id IS NOT NULL)))
$$;
CREATE FUNCTION public.has_requisition_workflow_assignment(p_company_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT requisition_private.has_assignment(p_company_id)
$$;
REVOKE ALL ON FUNCTION requisition_private.has_assignment(uuid),public.has_requisition_workflow_assignment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION requisition_private.has_assignment(uuid),public.has_requisition_workflow_assignment(uuid) TO authenticated;

CREATE FUNCTION requisition_private.guard_vacancy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.personnel_requisitions;
BEGIN
  IF NEW.requisition_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO r FROM public.personnel_requisitions WHERE id=NEW.requisition_id;
  IF r.workflow_version_id IS NOT NULL AND (r.company_id<>NEW.company_id
    OR r.estado_requisicion::text NOT IN ('en_seleccion','aprobada')) THEN
    RAISE EXCEPTION 'La requisición aún no habilita la creación de vacantes.' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION requisition_private.guard_vacancy() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_configured_requisition_vacancy BEFORE INSERT OR UPDATE OF requisition_id,company_id
  ON public.vacancies FOR EACH ROW EXECUTE FUNCTION requisition_private.guard_vacancy();
