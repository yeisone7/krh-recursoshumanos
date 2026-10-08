-- A company-scoped catalog; writes go through the atomic settings RPC.
CREATE TABLE public.payroll_concepts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(btrim(name)) > 0),
 identifier text NOT NULL CHECK (length(btrim(identifier)) > 0),
 identifier_key text GENERATED ALWAYS AS (upper(btrim(identifier))) STORED,
 unit text NOT NULL CHECK (unit IN ('hours','days')),
 percentage numeric NOT NULL CHECK (percentage >= 0 AND percentage::text NOT IN ('NaN','Infinity','-Infinity')),
 is_active boolean NOT NULL DEFAULT true,
 system_type text CHECK (system_type IN ('hedo','heno','rn','hedf','henf','rnf','dominical_trabajado','festivo_trabajado')),
 sort_order integer NOT NULL DEFAULT 0,
 UNIQUE (company_id,id), UNIQUE (company_id,system_type),
 CONSTRAINT payroll_concepts_identifier_unique UNIQUE (company_id,identifier_key) DEFERRABLE INITIALLY DEFERRED
);
ALTER TABLE public.payroll_concepts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payroll_concepts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payroll_concepts TO authenticated;
CREATE POLICY payroll_concepts_read ON public.payroll_concepts FOR SELECT TO authenticated USING (
 payroll_private.can(company_id,'config_laboral','view') OR payroll_private.can(company_id,'novedades','view')
 OR payroll_private.can(company_id,'novedades','create') OR payroll_private.can(company_id,'novedades','update')
 OR payroll_private.can(company_id,'pre_liquidacion','view') OR payroll_private.can(company_id,'analitica_nomina','view')
 OR payroll_private.can(company_id,'consulta_dinamica_nomina','view'));

CREATE FUNCTION payroll_private.seed_concepts(c uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.payroll_concepts(company_id,name,identifier,unit,percentage,system_type,sort_order)
 SELECT c,v.name,v.identifier,v.unit,coalesce((to_jsonb(cfg)->>v.column_name)::numeric,v.rate),v.kind,v.ord
 FROM (VALUES
 ('hedo','H.E. Diurna Ordinaria','HEDO','hours','surcharge_hedo',25,0),
 ('heno','H.E. Nocturna Ordinaria','HENO','hours','surcharge_heno',75,1),
 ('rn','Recargo Nocturno','RN','hours','surcharge_rn',35,2),
 ('hedf','H.E. Diurna Dom/Fest','HEDF','hours','surcharge_hedf',100,3),
 ('henf','H.E. Nocturna Dom/Fest','HENF','hours','surcharge_henf',150,4),
 ('rnf','Recargo Nocturno Fest','RNF','hours','surcharge_rnf',110,5),
 ('dominical_trabajado','Dominical Trabajado','DOMINICAL','days','surcharge_dominical',75,6),
 ('festivo_trabajado','Festivo Trabajado','FESTIVO','days','surcharge_festivo',75,7)
 ) v(kind,name,identifier,unit,column_name,rate,ord)
 LEFT JOIN public.payroll_labor_config cfg ON cfg.company_id=c
 ON CONFLICT (company_id,system_type) DO NOTHING
$$;
REVOKE ALL ON FUNCTION payroll_private.seed_concepts(uuid) FROM PUBLIC,anon,authenticated;
SELECT payroll_private.seed_concepts(id) FROM public.companies;
CREATE FUNCTION payroll_private.company_concepts() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM payroll_private.seed_concepts(NEW.id); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION payroll_private.company_concepts() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER company_payroll_concepts AFTER INSERT ON public.companies
 FOR EACH ROW EXECUTE FUNCTION payroll_private.company_concepts();

ALTER TABLE public.payroll_novelties
 ADD COLUMN concept_id uuid,
 ADD COLUMN quantity numeric,
 ADD COLUMN quantity_unit text CHECK (quantity_unit IN ('hours','days')),
 ADD CONSTRAINT payroll_novelty_concept FOREIGN KEY (company_id,concept_id) REFERENCES public.payroll_concepts(company_id,id);
CREATE UNIQUE INDEX payroll_custom_novelty_unique ON public.payroll_novelties(company_id,employee_id,novelty_date,concept_id) WHERE novelty_type='custom';
CREATE INDEX payroll_novelties_concept ON public.payroll_novelties(company_id,concept_id);
ALTER TABLE public.payroll_novelties DROP CONSTRAINT payroll_novelties_novelty_type_check;
ALTER TABLE public.payroll_novelties ADD CONSTRAINT payroll_novelties_novelty_type_check CHECK (
 novelty_type IN ('jornada','hedo','heno','hedf','henf','rn','rnf','dominical_trabajado','festivo_trabajado','descanso_remunerado','incapacidad','vacaciones','permiso','custom'));
-- Preserve trigger state while backfilling metadata without changing calendar records.
DO $$ DECLARE t text; enabled_triggers text[]; BEGIN
 SELECT coalesce(array_agg(tgname::text),'{}') INTO enabled_triggers FROM pg_trigger WHERE tgrelid='public.payroll_novelties'::regclass AND NOT tgisinternal AND tgenabled='O';
 FOREACH t IN ARRAY enabled_triggers LOOP
  EXECUTE format('ALTER TABLE public.payroll_novelties DISABLE TRIGGER %I',t);
 END LOOP;
 UPDATE public.payroll_novelties n SET concept_id=c.id,
  quantity=CASE WHEN c.unit='days' THEN n.hours/coalesce(nullif(cfg.daily_hours,0),8) ELSE n.hours END,
  quantity_unit=c.unit
 FROM public.payroll_concepts c LEFT JOIN public.payroll_labor_config cfg ON cfg.company_id=c.company_id
 WHERE n.company_id=c.company_id AND n.novelty_type=c.system_type;
 UPDATE public.payroll_novelties SET quantity=hours,quantity_unit='hours' WHERE quantity IS NULL;
 FOREACH t IN ARRAY enabled_triggers LOOP
  EXECUTE format('ALTER TABLE public.payroll_novelties ENABLE TRIGGER %I',t);
 END LOOP;
END $$;

-- Validate all write paths, including the calendar correction RPC and old clients.
CREATE FUNCTION payroll_private.validate_novelty_concept() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.payroll_concepts; daily numeric; same_concept boolean:=false;
BEGIN
 IF TG_OP='UPDATE' THEN same_concept:=NEW.concept_id IS NOT DISTINCT FROM OLD.concept_id AND NEW.novelty_type=OLD.novelty_type AND NEW.employee_id=OLD.employee_id; END IF;
 IF NEW.concept_id IS NULL THEN
  SELECT * INTO c FROM public.payroll_concepts WHERE company_id=NEW.company_id AND system_type=NEW.novelty_type FOR SHARE;
  NEW.concept_id:=c.id;
 ELSE SELECT * INTO c FROM public.payroll_concepts WHERE id=NEW.concept_id AND company_id=NEW.company_id FOR SHARE; END IF;
 IF NEW.novelty_type='custom' AND (c.id IS NULL OR c.system_type IS NOT NULL) THEN RAISE EXCEPTION 'Concepto personalizado inválido' USING ERRCODE='22023'; END IF;
 IF NEW.concept_id IS NOT NULL AND (c.id IS NULL OR NEW.novelty_type IS DISTINCT FROM coalesce(c.system_type,'custom')) THEN RAISE EXCEPTION 'El concepto no corresponde al tipo de novedad o empresa' USING ERRCODE='22023'; END IF;
 IF c.id IS NOT NULL AND NOT c.is_active AND NOT same_concept THEN RAISE EXCEPTION 'El concepto está inactivo' USING ERRCODE='22023'; END IF;
 IF NEW.quantity IS NOT NULL AND NEW.quantity_unit IS DISTINCT FROM coalesce(c.unit,'hours') THEN RAISE EXCEPTION 'Unidad incompatible con el concepto' USING ERRCODE='22023'; END IF;
 IF TG_OP='UPDATE' AND same_concept AND NEW.quantity IS NOT DISTINCT FROM OLD.quantity AND NEW.hours IS NOT DISTINCT FROM OLD.hours THEN RETURN NEW; END IF;
 SELECT coalesce(nullif(daily_hours,0),8) INTO daily FROM public.payroll_labor_config WHERE company_id=NEW.company_id;
 daily:=coalesce(daily,8);
 IF NEW.quantity IS NULL OR (TG_OP='UPDATE' AND NEW.quantity IS NOT DISTINCT FROM OLD.quantity AND NEW.hours IS DISTINCT FROM OLD.hours) THEN
  NEW.quantity_unit:=coalesce(c.unit,'hours');
  NEW.quantity:=CASE WHEN NEW.quantity_unit='days' THEN NEW.hours/daily ELSE NEW.hours END;
 ELSE
  IF NEW.quantity_unit IS DISTINCT FROM coalesce(c.unit,'hours') THEN RAISE EXCEPTION 'Unidad incompatible con el concepto' USING ERRCODE='22023'; END IF;
  NEW.hours:=CASE WHEN NEW.quantity_unit='days' THEN NEW.quantity*daily ELSE NEW.quantity END;
 END IF;
 IF NEW.quantity < 0 OR NEW.quantity IS NULL OR NEW.quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Cantidad inválida' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION payroll_private.validate_novelty_concept() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_payroll_concept BEFORE INSERT OR UPDATE ON public.payroll_novelties FOR EACH ROW EXECUTE FUNCTION payroll_private.validate_novelty_concept();

-- Protect identity and prevent units/deletions from invalidating historical records.
CREATE FUNCTION payroll_private.protect_concept() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.system_type IS NOT NULL AND EXISTS(SELECT 1 FROM public.companies WHERE id=OLD.company_id) THEN RAISE EXCEPTION 'Los conceptos originales no se pueden eliminar'; END IF;
  RETURN OLD;
 END IF;
 IF NEW.company_id<>OLD.company_id OR NEW.system_type IS DISTINCT FROM OLD.system_type OR NEW.id<>OLD.id THEN RAISE EXCEPTION 'La identidad interna del concepto no se puede cambiar'; END IF;
 IF NEW.unit<>OLD.unit AND EXISTS (SELECT 1 FROM public.payroll_novelties WHERE concept_id=OLD.id) THEN RAISE EXCEPTION 'La unidad no se puede cambiar porque el concepto tiene novedades'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION payroll_private.protect_concept() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_payroll_concept BEFORE UPDATE OR DELETE ON public.payroll_concepts FOR EACH ROW EXECUTE FUNCTION payroll_private.protect_concept();

DROP VIEW report_data.payroll_labor_config;
ALTER TABLE public.payroll_labor_config
 ALTER COLUMN surcharge_hedo TYPE numeric,
 ALTER COLUMN surcharge_heno TYPE numeric,
 ALTER COLUMN surcharge_rn TYPE numeric,
 ALTER COLUMN surcharge_hedf TYPE numeric,
 ALTER COLUMN surcharge_henf TYPE numeric,
 ALTER COLUMN surcharge_rnf TYPE numeric,
 ALTER COLUMN surcharge_dominical TYPE numeric,
 ALTER COLUMN surcharge_festivo TYPE numeric;
CREATE VIEW report_data.payroll_labor_config WITH (security_invoker=true,security_barrier=true) AS
SELECT b.created_at,b.created_by,b.daily_hours,b.display_unit,b.id,b.max_weekly_hours,b.night_end,b.night_start,b.surcharge_dominical,b.surcharge_hedf,b.surcharge_hedo,b.surcharge_henf,b.surcharge_heno,b.surcharge_rn,b.surcharge_rnf,b.updated_at,b.company_id,b.surcharge_festivo
FROM public.payroll_labor_config b WHERE report_private.allowed(b.company_id,'config_laboral','view');
REVOKE ALL ON report_data.payroll_labor_config FROM PUBLIC,anon;
GRANT SELECT ON report_data.payroll_labor_config TO authenticated;

-- Keep older clients' settings writes compatible during the interface rollout.
CREATE FUNCTION payroll_private.sync_config_concepts() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM payroll_private.seed_concepts(NEW.company_id);
 UPDATE public.payroll_concepts c SET percentage=(to_jsonb(NEW)->>v.column_name)::numeric
 FROM (VALUES ('hedo','surcharge_hedo'),('heno','surcharge_heno'),('rn','surcharge_rn'),
 ('hedf','surcharge_hedf'),('henf','surcharge_henf'),('rnf','surcharge_rnf'),
 ('dominical_trabajado','surcharge_dominical'),('festivo_trabajado','surcharge_festivo')) v(kind,column_name)
 WHERE c.company_id=NEW.company_id AND c.system_type=v.kind
 AND c.percentage IS DISTINCT FROM (to_jsonb(NEW)->>v.column_name)::numeric;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION payroll_private.sync_config_concepts() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_payroll_config_concepts AFTER INSERT OR UPDATE ON public.payroll_labor_config
 FOR EACH ROW EXECUTE FUNCTION payroll_private.sync_config_concepts();

CREATE FUNCTION public.save_payroll_settings(p_company_id uuid,p_config jsonb,p_concepts jsonb,p_expected_updated_at timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cfg public.payroll_labor_config; c public.payroll_concepts; item jsonb; k text; ids uuid[]:='{}'; rate numeric;
BEGIN
 IF NOT payroll_private.can(p_company_id,'config_laboral','update') THEN RAISE EXCEPTION 'Sin permiso para administrar conceptos' USING ERRCODE='42501'; END IF;
 PERFORM payroll_private.review_lock();
 SET CONSTRAINTS public.payroll_concepts_identifier_unique DEFERRED;
 SELECT * INTO cfg FROM public.payroll_labor_config WHERE company_id=p_company_id FOR UPDATE;
 IF cfg.id IS NOT NULL AND cfg.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'La configuración cambió. Actualice la página antes de guardar.' USING ERRCODE='40001'; END IF;
 IF cfg.id IS NULL THEN INSERT INTO public.payroll_labor_config(company_id,created_by) VALUES(p_company_id,auth.uid()) RETURNING * INTO cfg; END IF;
 IF jsonb_typeof(p_concepts) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Lista de conceptos inválida'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_config) LOOP
  IF k NOT IN ('max_weekly_hours','daily_hours','display_unit','night_start','night_end') THEN RAISE EXCEPTION 'Campo de configuración inválido: %',k; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(p_concepts) LOOP
  IF (item->>'id')::uuid=ANY(ids) THEN RAISE EXCEPTION 'Concepto repetido'; END IF;
  ids:=array_append(ids,(item->>'id')::uuid);
  SELECT * INTO c FROM public.payroll_concepts WHERE id=(item->>'id')::uuid FOR UPDATE;
  IF c.id IS NOT NULL AND c.company_id<>p_company_id THEN RAISE EXCEPTION 'Concepto de otra empresa' USING ERRCODE='42501'; END IF;
  IF c.id IS NULL AND item->>'system_type' IS NOT NULL THEN RAISE EXCEPTION 'No se puede crear un concepto del sistema'; END IF;
  IF c.id IS NOT NULL AND c.system_type IS DISTINCT FROM item->>'system_type' THEN RAISE EXCEPTION 'Vínculo del sistema inválido'; END IF;
  INSERT INTO public.payroll_concepts(id,company_id,name,identifier,unit,percentage,is_active,system_type,sort_order)
  VALUES((item->>'id')::uuid,p_company_id,btrim(item->>'name'),btrim(item->>'identifier'),item->>'unit',(item->>'percentage')::numeric,(item->>'is_active')::boolean,item->>'system_type',(item->>'sort_order')::integer)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name,identifier=excluded.identifier,unit=excluded.unit,percentage=excluded.percentage,is_active=excluded.is_active,sort_order=excluded.sort_order;
 END LOOP;
 IF EXISTS (SELECT 1 FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type IS NOT NULL AND NOT id=ANY(ids)) THEN RAISE EXCEPTION 'No se pueden eliminar conceptos del sistema'; END IF;
 DELETE FROM public.payroll_concepts WHERE company_id=p_company_id AND NOT id=ANY(ids);
 SET CONSTRAINTS public.payroll_concepts_identifier_unique IMMEDIATE;
 cfg:=jsonb_populate_record(cfg,p_config);
 IF cfg.daily_hours<=0 OR cfg.max_weekly_hours<0 OR cfg.daily_hours::text IN ('NaN','Infinity','-Infinity') OR cfg.max_weekly_hours::text IN ('NaN','Infinity','-Infinity') OR cfg.display_unit NOT IN ('hours','days') THEN RAISE EXCEPTION 'Jornada o unidad inválida'; END IF;
 UPDATE public.payroll_labor_config SET daily_hours=cfg.daily_hours,max_weekly_hours=cfg.max_weekly_hours,display_unit=cfg.display_unit,night_start=cfg.night_start,night_end=cfg.night_end,
 surcharge_hedo=(SELECT percentage FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type='hedo'),
 surcharge_heno=(SELECT percentage FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type='heno'),
 surcharge_rn=(SELECT percentage FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type='rn'),
 surcharge_hedf=(SELECT percentage FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type='hedf'),
 surcharge_henf=(SELECT percentage FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type='henf'),
 surcharge_rnf=(SELECT percentage FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type='rnf'),
 surcharge_dominical=(SELECT percentage FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type='dominical_trabajado'),
 surcharge_festivo=(SELECT percentage FROM public.payroll_concepts WHERE company_id=p_company_id AND system_type='festivo_trabajado'), updated_at=clock_timestamp() WHERE id=cfg.id RETURNING * INTO cfg;
 RETURN to_jsonb(cfg);
END $$;
REVOKE ALL ON FUNCTION public.save_payroll_settings(uuid,jsonb,jsonb,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_payroll_settings(uuid,jsonb,jsonb,timestamptz) TO authenticated;

-- Extend the current correction writer without replacing its calendar/ticket checks.
DO $$ DECLARE definition text; original text; BEGIN
 SELECT pg_get_functiondef('public.payroll_correction_write(uuid,jsonb,uuid,boolean)'::regprocedure) INTO definition;
 original:=definition;
 definition:=replace(definition,'ARRAY[''employee_id'',''novelty_date'',''novelty_type'',''hours'',''notes'',''source'',''start_time'',''end_time'',''reason_id'']', 'ARRAY[''employee_id'',''novelty_date'',''novelty_type'',''hours'',''notes'',''source'',''start_time'',''end_time'',''reason_id'',''concept_id'',''quantity'',''quantity_unit'']');
 definition:=replace(definition,'novelty_type,hours,notes,source,start_time,end_time,reason_id,created_by)', 'novelty_type,hours,notes,source,start_time,end_time,reason_id,created_by,concept_id,quantity,quantity_unit)');
 definition:=replace(definition,'novelty.end_time,novelty.reason_id,auth.uid());','novelty.end_time,novelty.reason_id,auth.uid(),novelty.concept_id,novelty.quantity,novelty.quantity_unit);');
 definition:=replace(definition,'reason_id=novelty.reason_id WHERE id=rid','reason_id=novelty.reason_id,concept_id=novelty.concept_id,quantity=novelty.quantity,quantity_unit=novelty.quantity_unit WHERE id=rid');
 IF definition=original OR position('concept_id=novelty.concept_id' in definition)=0 OR position('created_by,concept_id,quantity,quantity_unit)' in definition)=0 THEN RAISE EXCEPTION 'La función de correcciones no coincide con la versión esperada'; END IF;
 EXECUTE definition;
END $$;
NOTIFY pgrst,'reload schema';

CREATE FUNCTION public.list_payroll_concepts(p_company_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT (payroll_private.can(p_company_id,'config_laboral','view') OR payroll_private.can(p_company_id,'config_laboral','update')
 OR payroll_private.can(p_company_id,'novedades','view') OR payroll_private.can(p_company_id,'novedades','create')
 OR payroll_private.can(p_company_id,'novedades','update') OR payroll_private.can(p_company_id,'pre_liquidacion','view')
 OR payroll_private.can(p_company_id,'analitica_nomina','view')) THEN RAISE EXCEPTION 'Sin permiso para consultar conceptos' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('has_novelties',EXISTS(SELECT 1 FROM public.payroll_novelties n WHERE n.concept_id=c.id)) ORDER BY c.sort_order,c.id),'[]') FROM public.payroll_concepts c WHERE c.company_id=p_company_id);
END $$;
REVOKE ALL ON FUNCTION public.list_payroll_concepts(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_payroll_concepts(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';

-- Make custom concepts distinguishable in the reporting workspace.
CREATE OR REPLACE VIEW report_data.payroll_novelties WITH (security_invoker=true,security_barrier=true) AS SELECT b."approved_at",b."approved_by",b."created_at",b."created_by",b."employee_id",b."end_time",b."hours",b."id",b."novelty_date",b."novelty_type",b."operation_center_id",b."reason_id",b."source",b."start_time",b."status",b."updated_at",b.company_id,b.employee_id AS report_employee_id,concat_ws(' ',e.first_name,e.middle_name,e.last_name,e.second_last_name) AS report_employee_name,w.position_name AS report_position,(SELECT a.name FROM public.areas a WHERE a.id=w.area_id AND a.company_id=b.company_id) AS report_area_name,COALESCE(b.operation_center_id,w.operation_center_id) AS report_center_id,(SELECT oc.name FROM public.operation_centers oc WHERE oc.id=COALESCE(b.operation_center_id,w.operation_center_id) AND oc.company_id=b.company_id) AS report_center_name,b.concept_id,b.quantity,b.quantity_unit,c.name AS concept_name,c.identifier AS concept_identifier FROM public.payroll_novelties b LEFT JOIN public.payroll_concepts c ON c.id=b.concept_id AND c.company_id=b.company_id LEFT JOIN LATERAL (SELECT w.* FROM public.employee_work_info w WHERE w.employee_id=b.employee_id AND w.company_id=b.company_id AND w.valid_from<=b.novelty_date::date AND (w.valid_to IS NULL OR w.valid_to>=b.novelty_date::date) ORDER BY w.is_current DESC,w.valid_from DESC,w.id LIMIT 1) w ON true LEFT JOIN public.employees_v2 e ON e.id=b.employee_id AND e.company_id=b.company_id WHERE report_private.allowed(b.company_id, 'novedades', 'view') AND (b.employee_id IS NULL OR public.has_employee_v2_access(b.employee_id)) AND public.check_center_access(b.company_id,COALESCE(b.operation_center_id,w.operation_center_id));
UPDATE report_private.sources SET fields=fields || '[{"key": "concept_id", "label": "Concepto (ID)", "type": "text"}, {"key": "concept_name", "label": "Nombre del concepto", "type": "text"}, {"key": "concept_identifier", "label": "Identificador del concepto", "type": "text"}, {"key": "quantity", "label": "Cantidad", "type": "number"}, {"key": "quantity_unit", "label": "Unidad de cantidad", "type": "text"}]'::jsonb WHERE key='payroll_novelties';
