CREATE OR REPLACE FUNCTION report_private.filters(s text,fs jsonb,alias_name text DEFAULT 'b') RETURNS text
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE f jsonb; col jsonb; val text; expr text; out_sql text:=''; op text; typed text; v jsonb;
BEGIN
 IF jsonb_typeof(fs)<>'array' OR jsonb_array_length(fs)>20 THEN RAISE EXCEPTION 'INVALID_PLAN: Filtros inválidos'; END IF;
 FOR f IN SELECT * FROM jsonb_array_elements(fs) LOOP
   col:=report_private.field(s,f->>'field'); op:=f->>'op';
   IF op IS NULL OR op NOT IN ('is_null','not_null','in','contains','eq','neq','gt','gte','lt','lte') THEN RAISE EXCEPTION 'INVALID_PLAN: Operador inválido'; END IF;
   expr:=format('%I.%I',alias_name,f->>'field');
   IF op IN ('is_null','not_null') THEN
     out_sql:=out_sql||format(' AND %s IS %sNULL',expr,CASE WHEN op='not_null' THEN 'NOT ' ELSE '' END); CONTINUE;
   END IF;
   IF jsonb_typeof(f->'values')<>'array' OR jsonb_array_length(f->'values') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_PLAN: Valores de filtro inválidos'; END IF;
   typed:='';
   FOR v IN SELECT * FROM jsonb_array_elements(f->'values') LOOP
     IF jsonb_typeof(v)<>'string' OR length(v#>>'{}')>500 THEN RAISE EXCEPTION 'INVALID_PLAN: Valor inválido'; END IF;
     val:=v#>>'{}';
     IF col->>'type'='number' THEN PERFORM val::numeric; END IF;
     IF col->>'type'='date' THEN PERFORM val::date; END IF;
     IF col->>'type'='datetime' THEN PERFORM val::timestamptz; END IF;
     IF col->>'type'='boolean' AND val NOT IN ('true','false') THEN RAISE EXCEPTION 'INVALID_PLAN: Booleano inválido'; END IF;
     typed:=typed||CASE WHEN typed<>'' THEN ',' ELSE '' END||format('%L',val);
   END LOOP;
   IF op='in' THEN out_sql:=out_sql||format(' AND %s IN (%s)',expr,typed);
   ELSIF op='contains' THEN
     IF col->>'type'<>'text' OR jsonb_array_length(f->'values')<>1 THEN RAISE EXCEPTION 'INVALID_PLAN: Búsqueda inválida'; END IF;
     out_sql:=out_sql||format(' AND strpos(lower(%s::text),lower(%L))>0',expr,f->'values'->>0);
   ELSE
     IF jsonb_array_length(f->'values')<>1 OR op NOT IN ('eq','neq','gt','gte','lt','lte') THEN RAISE EXCEPTION 'INVALID_PLAN: Operador inválido'; END IF;
     out_sql:=out_sql||format(' AND %s %s %s',expr,CASE op WHEN 'eq' THEN '=' WHEN 'neq' THEN '<>' WHEN 'gt' THEN '>' WHEN 'gte' THEN '>=' WHEN 'lt' THEN '<' ELSE '<=' END,typed);
   END IF;
 END LOOP;
 RETURN out_sql;
END $$;

CREATE OR REPLACE FUNCTION report_private.query(c uuid,p jsonb,screen jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' SET timezone='America/Bogota' SET statement_timeout='15s' AS $$
DECLARE s report_private.sources; related_source report_private.sources; f jsonb; meta jsonb; k text; expression text;
 select_sql text:=''; group_sql text:=''; where_sql text; order_sql text:=''; columns_json jsonb:='[]';
 result_rows jsonb; outputs text[]:='{}'; refs text[]:='{}'; total bigint; cast_date text; limiting integer;
BEGIN
 IF auth.uid() IS NULL OR NOT report_private.allowed(c,'asistente_ia','view') THEN RAISE EXCEPTION 'FORBIDDEN: Asistente no autorizado'; END IF;
 IF NOT (p ?& ARRAY['source','columns','dimensions','metrics','filters','related','order','chart','limit','comparePrevious']) OR jsonb_typeof(p->'comparePrevious') IS DISTINCT FROM 'boolean' OR p->>'chart' IS NULL OR p->>'chart' NOT IN ('bar','line','donut','none') THEN RAISE EXCEPTION 'INVALID_PLAN: Plan incompleto'; END IF;
 IF jsonb_typeof(screen) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(screen) sk(key) WHERE sk.key NOT IN ('startDate','endDate','centerIds')) THEN RAISE EXCEPTION 'INVALID_PLAN: Filtros de pantalla inválidos'; END IF;
 IF screen->>'startDate' IS NOT NULL AND screen->>'endDate' IS NOT NULL AND (screen->>'startDate')::date>(screen->>'endDate')::date THEN RAISE EXCEPTION 'INVALID_PLAN: Periodo invertido'; END IF;
 IF screen ? 'centerIds' THEN
  IF jsonb_typeof(screen->'centerIds') IS DISTINCT FROM 'array' OR jsonb_array_length(screen->'centerIds')>200 THEN RAISE EXCEPTION 'INVALID_PLAN: Centros inválidos'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(screen->'centerIds') cid WHERE NOT EXISTS(SELECT 1 FROM public.operation_centers oc WHERE oc.id=cid::uuid AND oc.company_id=c AND public.check_center_access(c,oc.id))) THEN RAISE EXCEPTION 'FORBIDDEN: Centro no autorizado'; END IF;
 END IF;
 IF jsonb_typeof(p)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p) a WHERE a NOT IN ('source','columns','dimensions','metrics','filters','related','order','chart','limit','comparePrevious')) THEN RAISE EXCEPTION 'INVALID_PLAN: Plan inválido'; END IF;
 SELECT * INTO s FROM report_private.sources WHERE key=p->>'source';
 IF s.key IS NULL OR NOT report_private.source_allowed(c,s.key,'view') THEN RAISE EXCEPTION 'FORBIDDEN: Fuente no autorizada'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(s.fields) sf WHERE sf ? 'permission' AND strpos(p::text,'"'||(sf->>'key')||'"')>0 AND NOT report_private.allowed(c,sf->>'permission','view')) THEN RAISE EXCEPTION 'FORBIDDEN: Campo restringido en esta empresa'; END IF;
 refs:=array_append(refs,s.key);
 IF s.key='training_compliance' AND (screen->>'startDate' IS NULL OR screen->>'endDate' IS NULL) AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p->'filters') pf(value) WHERE pf.value->>'field'='period') THEN RAISE EXCEPTION 'CLARIFICATION: Define un periodo de capacitación'; END IF;
 IF jsonb_typeof(p->'columns')<>'array' OR jsonb_array_length(p->'columns')>30 OR jsonb_typeof(p->'metrics')<>'array' OR jsonb_array_length(p->'metrics')>12 OR jsonb_typeof(p->'dimensions')<>'array' OR jsonb_array_length(p->'dimensions')>5 OR jsonb_typeof(p->'related')<>'array' OR jsonb_array_length(p->'related')>5 OR jsonb_typeof(p->'order')<>'array' OR jsonb_array_length(p->'order')>5 THEN RAISE EXCEPTION 'INVALID_PLAN: Estructura inválida'; END IF;
 IF jsonb_array_length(p->'metrics')>0 AND jsonb_array_length(p->'columns')>0 THEN RAISE EXCEPTION 'INVALID_PLAN: Mezcla de detalle y agregación'; END IF;
 IF jsonb_array_length(p->'metrics')=0 AND jsonb_array_length(p->'dimensions')>0 THEN RAISE EXCEPTION 'INVALID_PLAN: Agrupación sin métricas'; END IF;
 FOR f IN SELECT * FROM jsonb_array_elements(p->'columns') LOOP
   k:=f#>>'{}';meta:=report_private.field(s.key,k);
   select_sql:=select_sql||CASE WHEN select_sql<>'' THEN ',' ELSE '' END||format('b.%I',k);
   columns_json:=columns_json||jsonb_build_array(meta);outputs:=array_append(outputs,k);
 END LOOP;
 FOR f IN SELECT * FROM jsonb_array_elements(p->'dimensions') LOOP
   k:=f->>'field';meta:=report_private.field(s.key,k);expression:=format('b.%I',k);
   IF f->>'grain' IS NULL OR f->>'grain' NOT IN ('value','day','month','year') THEN RAISE EXCEPTION 'INVALID_PLAN: Periodo inválido'; END IF;
   IF f->>'grain'<>'value' THEN
     IF meta->>'type' NOT IN ('date','datetime') THEN RAISE EXCEPTION 'INVALID_PLAN: Fecha requerida'; END IF;
     expression:=format('date_trunc(%L,%s)::date',f->>'grain',expression);meta:=jsonb_set(meta,'{type}','"date"');
   END IF;
   select_sql:=select_sql||CASE WHEN select_sql<>'' THEN ',' ELSE '' END||format('%s AS %I',expression,k);
   group_sql:=group_sql||CASE WHEN group_sql<>'' THEN ',' ELSE '' END||expression;
   columns_json:=columns_json||jsonb_build_array(meta);outputs:=array_append(outputs,k);
 END LOOP;
 FOR f IN SELECT * FROM jsonb_array_elements(p->'metrics') LOOP
   k:=f->>'key';
   IF k IS NULL OR f->>'op' IS NULL OR k!~'^[a-z][a-z0-9_]{0,49}$' OR f->>'op' NOT IN ('count','distinct','sum','avg','min','max') THEN RAISE EXCEPTION 'INVALID_PLAN: Métrica inválida'; END IF;
   IF f->>'field'='*' THEN
     IF f->>'op'<>'count' THEN RAISE EXCEPTION 'INVALID_PLAN: Campo requerido'; END IF;
     expression:='count(*)';meta:=jsonb_build_object('label','Registros','type','number');
   ELSE
     meta:=report_private.field(s.key,f->>'field');
     IF f->>'op' IN ('sum','avg') AND meta->>'type'<>'number' THEN RAISE EXCEPTION 'INVALID_PLAN: Número requerido'; END IF;
     expression:=CASE WHEN f->>'op'='distinct' THEN format('count(DISTINCT b.%I)',f->>'field') ELSE format('%s(b.%I)',f->>'op',f->>'field') END;
     meta:=meta||jsonb_build_object('label',CASE f->>'op' WHEN 'sum' THEN 'Total · ' WHEN 'avg' THEN 'Promedio · ' WHEN 'min' THEN 'Mínimo · ' WHEN 'max' THEN 'Máximo · ' ELSE 'Cantidad · ' END||(meta->>'label'));
     IF f->>'op' IN ('count','distinct') THEN meta:=(meta-'unit')||jsonb_build_object('type','number'); END IF;
   END IF;
   select_sql:=select_sql||CASE WHEN select_sql<>'' THEN ',' ELSE '' END||format('%s AS %I',expression,k);
   columns_json:=columns_json||jsonb_build_array(meta||jsonb_build_object('key',k));outputs:=array_append(outputs,k);
 END LOOP;
 IF select_sql='' OR cardinality(outputs)<>(SELECT count(DISTINCT x) FROM unnest(outputs) x) THEN RAISE EXCEPTION 'INVALID_PLAN: Columnas vacías o duplicadas'; END IF;
 where_sql:=format(CASE WHEN s.key IN ('catalog_eps','catalog_afp','catalog_arl','catalog_ccf','catalog_afc','catalog_ips','catalog_banks','identification_types','education_levels','professions','company_holidays','contract_type_config','novelty_reasons','dotation_item_types','exam_catalog') THEN '(b.company_id=%L::uuid OR b.company_id IS NULL)' ELSE 'b.company_id=%L::uuid' END,c)||report_private.filters(s.key,p->'filters');
 IF screen->>'startDate' IS NOT NULL OR screen->>'endDate' IS NOT NULL THEN
   IF s.date_field IS NULL THEN RAISE EXCEPTION 'CLARIFICATION: Esta fuente no tiene fecha; elimina el filtro de periodo'; END IF;
   IF screen->>'startDate' IS NOT NULL THEN
     PERFORM (screen->>'startDate')::date;
     where_sql:=where_sql||format(' AND b.%I::date >= %L::date',coalesce(s.end_date_field,s.date_field),screen->>'startDate');
   END IF;
   IF screen->>'endDate' IS NOT NULL THEN
     PERFORM (screen->>'endDate')::date;
     where_sql:=where_sql||format(' AND b.%I::date <= %L::date',s.date_field,screen->>'endDate');
   END IF;
 END IF;
 IF jsonb_array_length(coalesce(screen->'centerIds','[]'))>0 THEN
   IF s.center_field IS NULL THEN RAISE EXCEPTION 'CLARIFICATION: Esta fuente es general; elimina el filtro de centros'; END IF;
   where_sql:=where_sql||format(' AND b.%I IN (SELECT value::uuid FROM jsonb_array_elements_text(%L::jsonb))',s.center_field,(screen->'centerIds')::text);
 END IF;
 FOR f IN SELECT * FROM jsonb_array_elements(p->'related') LOOP
   SELECT * INTO related_source FROM report_private.sources WHERE key=f->>'source';
   IF related_source.key IS NULL OR s.employee_field IS NULL OR related_source.employee_field IS NULL OR NOT report_private.source_allowed(c,related_source.key,'view') THEN RAISE EXCEPTION 'FORBIDDEN: Cruce no autorizado'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(related_source.fields) sf WHERE sf ? 'permission' AND strpos(f::text,'"'||(sf->>'key')||'"')>0 AND NOT report_private.allowed(c,sf->>'permission','view')) THEN RAISE EXCEPTION 'FORBIDDEN: Campo restringido en el cruce'; END IF;
   IF f->>'mode' IS NULL OR f->>'mode' NOT IN ('exists','not_exists') THEN RAISE EXCEPTION 'INVALID_PLAN: Cruce inválido'; END IF;
   refs:=array_append(refs,related_source.key);
   where_sql:=where_sql||format(' AND %s EXISTS(SELECT 1 FROM report_data.%I r WHERE r.company_id=%L::uuid AND r.%I=b.%I %s)',CASE WHEN f->>'mode'='not_exists' THEN 'NOT' ELSE '' END,related_source.key,c,related_source.employee_field,s.employee_field,report_private.filters(related_source.key,f->'filters','r'));
 END LOOP;
 FOR f IN SELECT * FROM jsonb_array_elements(p->'order') LOOP
   IF f->>'field' IS NULL OR f->>'direction' IS NULL OR NOT (f->>'field'=ANY(outputs)) OR f->>'direction' NOT IN ('asc','desc') THEN RAISE EXCEPTION 'INVALID_PLAN: Orden inválido'; END IF;
   order_sql:=order_sql||CASE WHEN order_sql<>'' THEN ',' ELSE '' END||format('%I %s NULLS LAST',f->>'field',f->>'direction');
 END LOOP;
 -- A complete deterministic result is stored once; pagination/export never rerun offset queries.
 IF order_sql='' THEN order_sql:=format('%I',outputs[1]); END IF;
 IF p->>'limit' IS NOT NULL THEN limiting:=(p->>'limit')::integer; IF limiting NOT BETWEEN 1 AND 50000 THEN RAISE EXCEPTION 'INVALID_PLAN: Límite inválido'; END IF; END IF;
 EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(q)),''[]''::jsonb) FROM (SELECT %s FROM report_data.%I b WHERE %s %s ORDER BY %s LIMIT %s) q',select_sql,s.key,where_sql,CASE WHEN group_sql<>'' THEN ' GROUP BY '||group_sql ELSE '' END,order_sql,coalesce(limiting,50001)) INTO result_rows;
 total:=jsonb_array_length(result_rows);
 IF total>50000 OR pg_column_size(result_rows)>16777216 THEN RAISE EXCEPTION 'RESULT_TOO_LARGE: Más de 50.000 filas o 16 MB. Acota el periodo o utiliza una agrupación'; END IF;
 RETURN jsonb_build_object('columns',columns_json,'rows',result_rows,'totalRows',total,'sourceKeys',refs);
END $$;

CREATE OR REPLACE FUNCTION public.get_ai_report(p_company_id uuid,p_id uuid,p_offset integer DEFAULT 0,p_size integer DEFAULT 50,p_export boolean DEFAULT false,p_order text DEFAULT NULL,p_desc boolean DEFAULT false,p_search text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE run report_private.runs; source record; slice_data jsonb; indicators jsonb:='[]'; col jsonb; val numeric; total bigint; exported boolean:=true; series_data jsonb; sorted_sql text;
BEGIN
 IF NOT report_private.allowed(p_company_id,'asistente_ia','view') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO run FROM report_private.runs WHERE id=p_id AND company_id=p_company_id AND user_id=auth.uid();
 IF run.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND: Reporte no disponible'; END IF;
 IF run.fingerprint<>report_private.fingerprint(p_company_id) THEN RAISE EXCEPTION 'STALE_ACCESS: Tus permisos cambiaron. Ejecuta de nuevo el reporte'; END IF;
 FOR source IN SELECT s.* FROM report_private.sources s WHERE s.key IN (SELECT jsonb_array_elements_text(run.result->'sourceKeys')) LOOP
   IF NOT report_private.source_allowed(p_company_id,source.key,'view') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
   exported:=exported AND report_private.allowed(p_company_id,source.module,'export');
   exported:=exported AND report_private.source_allowed(p_company_id,source.key,'export');
   -- Restricted field permissions also apply to export, including filters/aggregates.
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(source.fields) f WHERE f ? 'permission' AND strpos(run.plan::text,f->>'key')>0 AND NOT report_private.allowed(p_company_id,f->>'permission','export')) THEN exported:=false; END IF;
 END LOOP;
 IF p_export AND NOT exported THEN RAISE EXCEPTION 'EXPORT_FORBIDDEN: No tienes permiso para exportar estas fuentes'; END IF;
 IF p_offset IS NULL OR p_size IS NULL OR p_export IS NULL OR p_desc IS NULL OR p_search IS NULL OR p_offset<0 OR p_size NOT BETWEEN 1 AND 1000 OR length(p_search)>200 THEN RAISE EXCEPTION 'INVALID_PAGE'; END IF;
 IF p_order IS NOT NULL THEN
   SELECT e INTO col FROM jsonb_array_elements(run.result->'columns') e WHERE e->>'key'=p_order;
   IF col IS NULL THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
 END IF;
 sorted_sql:=CASE WHEN p_order IS NULL THEN 'ordinality' WHEN col->>'type'='number' THEN format('(v->>%L)::numeric %s NULLS LAST,ordinality',p_order,CASE WHEN p_desc THEN 'DESC' ELSE 'ASC' END) ELSE format('v->>%L %s NULLS LAST,ordinality',p_order,CASE WHEN p_desc THEN 'DESC' ELSE 'ASC' END) END;
 SELECT count(*) INTO total FROM jsonb_array_elements(run.result->'rows') v WHERE p_search='' OR strpos(lower(v::text),lower(p_search))>0;
 EXECUTE format('SELECT coalesce(jsonb_agg(v),''[]''::jsonb) FROM (SELECT v FROM jsonb_array_elements($1) WITH ORDINALITY e(v,ordinality) WHERE $2='''' OR strpos(lower(v::text),lower($2))>0 ORDER BY %s OFFSET $3 LIMIT $4) page',sorted_sql) INTO slice_data USING run.result->'rows',p_search,p_offset,p_size;
 FOR col IN SELECT * FROM jsonb_array_elements(run.result->'columns') LOOP
   IF col->>'type'='number' AND EXISTS(SELECT 1 FROM jsonb_array_elements(run.plan->'metrics') m WHERE m->>'key'=col->>'key') THEN
     -- Only additive aggregates are summed across groups; averages are never averaged again.
     IF EXISTS(SELECT 1 FROM jsonb_array_elements(run.plan->'metrics') m WHERE m->>'key'=col->>'key' AND m->>'op' IN ('sum','count')) OR (run.result->>'totalRows')::integer=1 THEN
       SELECT sum((r->>(col->>'key'))::numeric) INTO val FROM jsonb_array_elements(run.result->'rows') r;
       indicators:=indicators||jsonb_build_array(jsonb_build_object('label',col->>'label','value',coalesce(val,0),'unit',col->>'unit'));
     END IF;
   END IF;
 END LOOP;
 SELECT coalesce(jsonb_agg(v),'[]') INTO series_data FROM (SELECT v FROM jsonb_array_elements(run.result->'rows') v LIMIT 60) s;
 RETURN jsonb_build_object('version',2,'id',run.id,'title',run.title,'question',run.question,'createdAt',run.created_at,'provider',run.provider,'plan',run.plan,'filters',run.filters,'effectiveFilters',report_private.describe_filters(p_company_id,run.plan,run.filters),'context',run.context,
 'sources',(SELECT jsonb_agg(jsonb_build_object('key',s.key,'label',s.label)) FROM report_private.sources s WHERE s.key IN (SELECT jsonb_array_elements_text(run.result->'sourceKeys'))),
 'columns',run.result->'columns','rows',slice_data,'totalRows',total,'unfilteredRows',run.result->'totalRows','offset',p_offset,'pageSize',p_size,
 'summary',format('Se encontraron %s %s. %s Los indicadores corresponden al conjunto completo del reporte.',run.result->>'totalRows',CASE WHEN jsonb_array_length(run.plan->'metrics')>0 THEN 'grupos' ELSE 'registros' END,coalesce((SELECT string_agg((i->>'label')||': '||(i->>'value')||coalesce(' '||(i->>'unit'),'')||'.',' ') FROM jsonb_array_elements(indicators) i),'')),
 'indicators',indicators,'series',series_data,'seriesTruncated',(run.result->>'totalRows')::integer>60,'canExport',exported,'comparison',run.result->'comparison');
END $$;
