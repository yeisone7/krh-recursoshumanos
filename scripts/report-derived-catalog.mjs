// Derived metrics mirror useTrainingCompliance and payrollDynamicQuery's approved
// absence intervals. These definitions are reviewed/versioned, never model SQL.
export function addDerivedSources(sources, sql) {
  const field = (key, label, type = 'text', unit) => ({
    key,
    label,
    type,
    ...(unit ? { unit } : {}),
  });
  const common = [
    field('id', 'Identificador'),
    field('report_employee_name', 'Empleado'),
    field('report_center_name', 'Centro de operación'),
  ];
  const add = (key, label, module, fields, dateField, description) =>
    sources.push({
      key,
      label,
      module,
      fields: [...common, ...fields],
      dateField,
      endDateField: null,
      employeeField: 'report_employee_id',
      centerField: 'report_center_id',
      description,
    });
  sql.push(`CREATE VIEW report_data.absence_days WITH(security_invoker=true,security_barrier=true) AS
 WITH intervals AS (
 SELECT company_id,employee_id,start_date,end_date,'Incapacidad'::text category FROM public.employee_incapacities
 UNION ALL SELECT company_id,employee_id,start_date,end_date,'Permiso' FROM public.leave_requests WHERE status::text IN ('aprobada','aprobado','pagado','en_curso','completado','interrumpido') AND duration_type::text <> 'horas'
 UNION ALL SELECT company_id,employee_id,start_date,least(end_date,coalesce(interruption_date-1,end_date)),'Vacaciones' FROM public.vacation_requests WHERE status::text IN ('aprobada','aprobado','pagado','en_curso','completado','interrumpido') AND request_type::text NOT IN ('compensacion','acumulacion')
 UNION ALL SELECT company_id,employee_id,resume_start_date,resume_end_date,'Vacaciones' FROM public.vacation_requests WHERE status::text IN ('aprobada','aprobado','pagado','en_curso','completado','interrumpido') AND request_type::text NOT IN ('compensacion','acumulacion') AND resume_start_date IS NOT NULL
 ), days AS (SELECT DISTINCT a.company_id,a.employee_id,d::date absence_date FROM intervals a CROSS JOIN LATERAL generate_series(a.start_date::timestamp,a.end_date::timestamp,interval '1 day') d)
 SELECT md5(d.employee_id::text||d.absence_date::text) id,d.company_id,d.employee_id report_employee_id,concat_ws(' ',e.first_name,e.last_name) report_employee_name,w.operation_center_id report_center_id,oc.name report_center_name,d.absence_date,1::integer absent_days
 FROM days d JOIN public.employees_v2 e ON e.id=d.employee_id AND e.company_id=d.company_id
 LEFT JOIN LATERAL(SELECT wi.operation_center_id FROM public.employee_work_info wi WHERE wi.employee_id=d.employee_id AND wi.company_id=d.company_id AND wi.valid_from<=d.absence_date AND (wi.valid_to IS NULL OR wi.valid_to>=d.absence_date) ORDER BY wi.valid_from DESC,wi.id LIMIT 1) w ON true
 LEFT JOIN public.operation_centers oc ON oc.id=w.operation_center_id AND oc.company_id=d.company_id
 WHERE report_private.allowed(d.company_id,'analitica_incapacidades','view') AND report_private.allowed(d.company_id,'incapacidades','view') AND report_private.allowed(d.company_id,'permisos','view') AND report_private.allowed(d.company_id,'vacaciones','view') AND public.has_employee_v2_access(d.employee_id) AND public.check_center_access(d.company_id,w.operation_center_id);`);
  add(
    'absence_days',
    'Ausentismo diario sin duplicados',
    'analitica_incapacidades',
    [
      field('absence_date', 'Fecha de ausencia', 'date'),
      field('absent_days', 'Días de ausencia', 'number', 'days'),
    ],
    'absence_date',
    'Días calendario únicos por persona de incapacidades, permisos de día aprobados y vacaciones disfrutadas. Excluye permisos por horas, compensaciones y acumulaciones; respeta interrupciones y reanudaciones. Agrupar fecha por mes y sumar absent_days. No es tasa de ausentismo ni días de nómina: solicita definición y denominador si se pide una tasa.',
  );
  sql.push(`CREATE VIEW report_data.training_compliance WITH(security_invoker=true,security_barrier=true) AS
 WITH periods AS (
 SELECT company_id,course_id,make_date(year,month,1) period,NULL::uuid center FROM public.training_course_periods
 UNION SELECT company_id,course_id,date_trunc('month',created_at AT TIME ZONE 'America/Bogota')::date,operation_center_id FROM public.training_access_tokens WHERE operation_center_id IS NOT NULL
 ), applicability AS (SELECT DISTINCT e.company_id,e.id employee_id,e.report_employee_name,e.report_center_id,e.report_center_name,c.id course_id,c.name course_name,c.code course_code,p.period FROM report_data.employees_v2 e JOIN public.training_courses c ON c.company_id=e.company_id AND c.is_active AND c.status IN ('publicado','borrador') JOIN periods p ON p.company_id=c.company_id AND p.course_id=c.id AND (p.center IS NULL OR p.center=e.report_center_id) WHERE e.is_active AND e.report_center_id IS NOT NULL)
 SELECT md5(a.employee_id::text||a.course_id::text||a.period::text) id,a.company_id,a.employee_id report_employee_id,a.report_employee_name,a.report_center_id,a.report_center_name,a.course_id,a.course_name,a.period,1::integer required_count,CASE WHEN completed.id IS NOT NULL THEN 1 ELSE 0 END completed_count,CASE WHEN completed.id IS NOT NULL THEN 100 ELSE 0 END::numeric completion_percent,completed.completed_at
 FROM applicability a JOIN public.employees_v2 e ON e.id=a.employee_id AND e.company_id=a.company_id
 LEFT JOIN LATERAL(SELECT tc.id,tc.completed_at FROM public.training_completions tc LEFT JOIN public.training_courses legacy_course ON legacy_course.id=tc.course_id AND legacy_course.company_id=tc.company_id WHERE tc.company_id=a.company_id AND (tc.course_id=a.course_id OR (legacy_course.name<>'' AND a.course_name<>'' AND report_private.course_key(legacy_course.name)=report_private.course_key(a.course_name)) OR (coalesce(legacy_course.code,'')<>'' AND coalesce(a.course_code,'')<>'' AND report_private.course_key(legacy_course.code)=report_private.course_key(a.course_code))) AND (tc.employee_id=a.employee_id OR (regexp_replace(coalesce(tc.operator_cedula,''),'[^0-9]','','g')<>'' AND regexp_replace(tc.operator_cedula,'[^0-9]','','g')=regexp_replace(e.document_number,'[^0-9]','','g'))) ORDER BY tc.completed_at DESC,tc.id LIMIT 1) completed ON true
 WHERE report_private.allowed(a.company_id,'capacitaciones_cumplimiento','view') AND report_private.allowed(a.company_id,'capacitaciones_biblioteca','view') AND report_private.allowed(a.company_id,'capacitaciones_evidencias','view');`);
  add(
    'training_compliance',
    'Cumplimiento de capacitación por periodo',
    'capacitaciones_cumplimiento',
    [
      field('course_id', 'Curso (ID)'),
      field('course_name', 'Curso'),
      field('period', 'Periodo', 'date'),
      field('required_count', 'Asignaciones requeridas', 'number'),
      field('completed_count', 'Asignaciones completadas', 'number'),
      field('completion_percent', 'Cumplimiento', 'number', 'percent'),
      field('completed_at', 'Última finalización', 'datetime'),
    ],
    'period',
    'Una fila por empleado activo, curso aplicable y mes, centro actual. Reproduce cumplimiento: cursos activos publicado/borrador, periodo configurado o enlace del centro creado ese mes, completado por empleado o documento en cualquier fecha. Requiere seleccionar un mes. AVG(completion_percent) es cumplimiento; SUM(required_count/completed_count) son denominador/numerador. No es una fotografía histórica de la plantilla.',
  );
}
