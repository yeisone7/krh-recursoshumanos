-- Same NFD/diacritic/ASCII normalization used by useTrainingCompliance.ts.
CREATE FUNCTION report_private.course_key(value text) RETURNS text LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT lower(btrim(regexp_replace(regexp_replace(normalize(coalesce(value,''),NFD),U&'[\0300-\036f]','','g'),'[^a-zA-Z0-9]+',' ','g')))
$$;
REVOKE ALL ON FUNCTION report_private.course_key(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION report_private.course_key(text) TO authenticated;
CREATE OR REPLACE VIEW report_data.training_compliance WITH(security_invoker=true,security_barrier=true) AS
 WITH periods AS (
 SELECT company_id,course_id,make_date(year,month,1) period,NULL::uuid center FROM public.training_course_periods
 UNION SELECT company_id,course_id,date_trunc('month',created_at AT TIME ZONE 'America/Bogota')::date,operation_center_id FROM public.training_access_tokens WHERE operation_center_id IS NOT NULL
 ), applicability AS (SELECT DISTINCT e.company_id,e.id employee_id,e.report_employee_name,e.report_center_id,e.report_center_name,c.id course_id,c.name course_name,c.code course_code,p.period FROM report_data.employees_v2 e JOIN public.training_courses c ON c.company_id=e.company_id AND c.is_active AND c.status IN ('publicado','borrador') JOIN periods p ON p.company_id=c.company_id AND p.course_id=c.id AND (p.center IS NULL OR p.center=e.report_center_id) WHERE e.is_active AND e.report_center_id IS NOT NULL)
 SELECT md5(a.employee_id::text||a.course_id::text||a.period::text) id,a.company_id,a.employee_id report_employee_id,a.report_employee_name,a.report_center_id,a.report_center_name,a.course_id,a.course_name,a.period,1::integer required_count,CASE WHEN completed.id IS NOT NULL THEN 1 ELSE 0 END completed_count,CASE WHEN completed.id IS NOT NULL THEN 100 ELSE 0 END::numeric completion_percent,completed.completed_at
 FROM applicability a JOIN public.employees_v2 e ON e.id=a.employee_id AND e.company_id=a.company_id
 LEFT JOIN LATERAL(SELECT tc.id,tc.completed_at FROM public.training_completions tc LEFT JOIN public.training_courses legacy_course ON legacy_course.id=tc.course_id AND legacy_course.company_id=tc.company_id WHERE tc.company_id=a.company_id AND (tc.course_id=a.course_id OR (legacy_course.name<>'' AND a.course_name<>'' AND report_private.course_key(legacy_course.name)=report_private.course_key(a.course_name)) OR (coalesce(legacy_course.code,'')<>'' AND coalesce(a.course_code,'')<>'' AND report_private.course_key(legacy_course.code)=report_private.course_key(a.course_code))) AND (tc.employee_id=a.employee_id OR (regexp_replace(coalesce(tc.operator_cedula,''),'[^0-9]','','g')<>'' AND regexp_replace(tc.operator_cedula,'[^0-9]','','g')=regexp_replace(e.document_number,'[^0-9]','','g'))) ORDER BY tc.completed_at DESC,tc.id LIMIT 1) completed ON true
 WHERE report_private.allowed(a.company_id,'capacitaciones_cumplimiento','view') AND report_private.allowed(a.company_id,'capacitaciones_biblioteca','view') AND report_private.allowed(a.company_id,'capacitaciones_evidencias','view');
UPDATE report_private.sources SET version=3 WHERE key='training_compliance';
