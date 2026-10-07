// Regenerate deliberately after reviewing schema changes. Never discovers fields at runtime.
// Input: a metadata-only `supabase db query` export (table_name, columns).
import fs from 'node:fs';
import { addDerivedSources } from './report-derived-catalog.mjs';
const schema = JSON.parse(
  fs
    .readFileSync(process.argv[2] || 'scratch/report-schema.json', 'utf8')
    .replace(/^\uFEFF/, ''),
).rows;
const byTable = Object.fromEntries(
  schema.map((s) => [s.table_name, s.columns]),
);
const groups = [
  [
    'empleados',
    'employees_v2:Empleados|employee_employment_cycles:Vinculaciones y reingresos|employee_work_info:Historia laboral|employee_contact:Contactos|employee_family:Información familiar|employee_family_members:Familiares|employee_bank_info:Información bancaria|employee_social_security:Seguridad social|employee_certifications:Certificaciones|employee_documents:Documentos|employee_onboarding_tasks:Incorporación|employee_vaccinations:Vacunas',
  ],
  [
    'contratos',
    'contracts:Contratos|contract_extensions:Prórrogas|work_certificates:Certificaciones laborales',
  ],
  [
    'empleados',
    'employee_terminations:Retiros|termination_documents:Documentos de retiro',
  ],
  ['centros', 'operation_centers:Centros de operación'],
  ['catalogos_areas', 'areas:Áreas'],
  [
    'catalogos_cargos',
    'positions:Cargos|position_profiles:Perfiles de cargo|position_profile_annexes:Anexos de perfiles',
  ],
  [
    'requisiciones',
    'personnel_requisitions:Requisiciones|requisition_vacancy_codes:Códigos de vacante',
  ],
  [
    'seleccion',
    'vacancies:Vacantes|candidates:Candidatos|selection_steps:Etapas de selección|candidate_documents:Documentos de candidatos|vacancy_documents:Documentos de vacantes',
  ],
  [
    'catalogos_seleccion_referencias_laborales',
    'selection_labor_references:Referencias laborales',
  ],
  [
    'catalogos_seleccion_referencias_academicas',
    'selection_academic_references:Referencias académicas',
  ],
  ['catalogos_seleccion_lista_rosada', 'selection_pink_list:Lista rosada'],
  [
    'catalogos_seleccion_informacion_vacantes',
    'selection_vacancy_information:Información de vacantes',
  ],
  [
    'catalogos_seleccion_informacion_examenes_medicos',
    'selection_medical_exam_information:Información de exámenes de selección',
  ],
  [
    'jornadas',
    'employee_shift_assignments:Jornadas programadas|employee_time_config:Configuración de tiempo|employee_schedule:Configuración de jornada|schedule_day_reviews:Revisiones de jornada',
  ],
  [
    'reloj_checador',
    'time_clock_days:Asistencia diaria|time_clock_events:Marcaciones|time_clock_correction_requests:Correcciones de marcaciones|time_clock_center_settings:Seguimiento por centro',
  ],
  ['novedades', 'payroll_novelties:Novedades de nómina'],
  ['pre_liquidacion', 'overtime_records:Horas extra'],
  ['analitica_nomina', 'payroll_receipts:Comprobantes de nómina'],
  [
    'cortes_control',
    'payroll_control_cuts:Cortes de control|payroll_control_cut_events:Historial de cortes|payroll_correction_tickets:Permisos de corrección|payroll_correction_events:Correcciones de nómina',
  ],
  ['incapacidades', 'employee_incapacities:Incapacidades'],
  ['permisos', 'leave_requests:Permisos|leave_balances:Saldos de permisos'],
  [
    'vacaciones',
    'vacation_requests:Vacaciones|vacation_balances:Saldos de vacaciones|vacation_balance_movements:Movimientos de vacaciones',
  ],
  [
    'prestamos',
    'employee_loans:Préstamos|employee_loan_payments:Abonos a préstamos|loan_refinancing_history:Refinanciaciones',
  ],
  ['descuentos', 'employee_deductions:Descuentos'],
  [
    'cesantias',
    'cesantias_deposits:Depósitos de cesantías|cesantias_interest_payments:Intereses de cesantías|cesantias_withdrawals:Retiros de cesantías',
  ],
  ['capacitaciones_biblioteca', 'training_courses:Cursos'],
  [
    'capacitaciones',
    'training_sessions:Sesiones de capacitación|training_attendance:Asistencia a capacitación|training_plans:Planes de capacitación|training_plan_items:Actividades del plan',
  ],
  [
    'capacitaciones_evidencias',
    'training_completions:Capacitaciones completadas',
  ],
  [
    'capacitaciones_grupos',
    'training_group_assignments:Grupos de capacitación|training_group_participants:Participantes de grupos',
  ],
  ['analitica_capacitaciones', 'training_course_periods:Periodos de cursos'],
  [
    'evaluaciones',
    'performance_evaluations:Evaluaciones|evaluation_scores:Calificaciones|performance_goals:Objetivos|evaluation_cycles:Ciclos de evaluación',
  ],
  [
    'disciplinarios',
    'disciplinary_processes:Procesos disciplinarios|disciplinary_timeline:Historial disciplinario|disciplinary_evidence:Evidencias disciplinarias',
  ],
  [
    'examenes',
    'medical_exams:Exámenes médicos|exam_delivery_transactions:Órdenes de exámenes|exam_delivery_items:Resultados de exámenes',
  ],
  [
    'dotacion',
    'dotation_deliveries:Entregas de dotación|dotation_inventory:Inventario de dotación|dotation_inventory_movements:Movimientos de dotación|dotation_inventory_transfers:Traslados de dotación',
  ],
  [
    'copasst_elecciones',
    'copasst_elections:Elecciones COPASST|copasst_candidates:Candidatos COPASST|copasst_electorate:Participación COPASST',
  ],
  [
    'cumplimiento_laboral',
    'compliance_obligations:Obligaciones de cumplimiento|compliance_evidences:Evidencias de cumplimiento|labor_disconnection_policies:Desconexión laboral',
  ],
  [
    'pila_ugpp',
    'pila_ugpp_periods:Periodos PILA UGPP|pila_ugpp_employee_validations:Validaciones PILA UGPP',
  ],
  [
    'alertas',
    'notifications:Notificaciones|notification_delivery_logs:Entregas de notificaciones|document_expiry_alerts:Vencimientos de documentos',
  ],
  [
    'automatizaciones',
    'hr_automations:Automatizaciones|hr_automation_runs:Ejecuciones de automatizaciones',
  ],
  ['auditoria', 'audit_logs:Auditoría'],
  [
    'config_laboral',
    'payroll_labor_config:Parámetros laborales|shifts:Turnos|work_schedules:Horarios|shift_cycles:Ciclos de turnos|shift_cycle_days:Días de ciclo',
  ],
  [
    'catalogos',
    'catalog_eps:EPS|catalog_afp:AFP|catalog_arl:ARL|catalog_ccf:CCF|catalog_afc:AFC|catalog_ips:IPS|catalog_banks:Bancos|identification_types:Tipos de identificación|education_levels:Niveles educativos|professions:Profesiones|company_holidays:Festivos|contract_type_config:Tipos de contrato|novelty_reasons:Motivos de novedad|dotation_item_types:Tipos de dotación|exam_catalog:Catálogo de exámenes',
  ],
];
const labels = {
  id: 'Identificador',
  document_number: 'Documento',
  first_name: 'Primer nombre',
  middle_name: 'Segundo nombre',
  last_name: 'Primer apellido',
  second_last_name: 'Segundo apellido',
  status: 'Estado',
  is_active: 'Activo',
  created_at: 'Fecha de creación',
  updated_at: 'Última actualización',
  employee_id: 'Empleado (ID)',
  employment_cycle_id: 'Vinculación (ID)',
  operation_center_id: 'Centro (ID)',
  salary: 'Salario',
  start_date: 'Fecha inicial',
  end_date: 'Fecha final',
  work_date: 'Fecha de trabajo',
  assignment_date: 'Fecha programada',
  hire_date: 'Fecha de ingreso',
  termination_date: 'Fecha de retiro',
  is_current: 'Actual',
  name: 'Nombre',
  total_hours: 'Total horas',
  worked_minutes: 'Minutos trabajados',
  late_minutes: 'Minutos de tardanza',
  quantity_available: 'Existencias',
  minimum_stock: 'Stock mínimo',
  total_days: 'Días',
  total_amount: 'Valor total',
  overall_score: 'Puntaje',
  completed_at: 'Fecha de finalización',
  is_terminated: 'Terminado',
  is_approved: 'Aprobado',
  contract_number: 'Número de contrato',
  contract_type: 'Tipo de contrato',
  position_name: 'Cargo',
  business_days: 'Días hábiles',
  calendar_days: 'Días calendario',
  remaining_balance: 'Saldo',
  net_pay: 'Neto pagado',
  total_earnings: 'Devengados',
  total_deductions: 'Deducciones',
  employee_name: 'Empleado',
  center_name: 'Centro de operación',
  area_name: 'Área',
  current_position: 'Cargo',
  birth_date: 'Fecha de nacimiento',
  gender: 'Género',
  document_type: 'Tipo de documento',
  cost_center: 'Centro de costo',
  expiry_date: 'Vencimiento',
  expiration_date: 'Vencimiento',
  is_completed: 'Completado',
  is_selected: 'Seleccionado',
  current_step: 'Etapa actual',
  quantity: 'Cantidad',
  amount: 'Valor',
  period_label: 'Periodo',
};
const dates = {
  employees_v2: 'created_at',
  contracts: 'end_date',
  employee_work_info: 'hire_date',
  employee_terminations: 'effective_date',
  employee_incapacities: 'start_date',
  leave_requests: 'start_date',
  vacation_requests: 'start_date',
  vacation_balances: 'period_start',
  payroll_receipts: 'period_start',
  payroll_novelties: 'novelty_date',
  overtime_records: 'work_date',
  training_completions: 'completed_at',
  training_attendance: 'attendance_date',
  time_clock_events: 'occurred_at',
  time_clock_days: 'work_date',
  employee_shift_assignments: 'assignment_date',
  schedule_day_reviews: 'work_date',
  medical_exams: 'exam_date',
  exam_delivery_transactions: 'exam_date',
  dotation_deliveries: 'delivery_date',
  candidates: 'application_date',
  vacancies: 'open_date',
  personnel_requisitions: 'fecha_requisicion',
  employee_employment_cycles: 'start_date',
};
const parents = {
  contract_extensions: ['contracts', 'contract_id'],
  termination_documents: ['employee_terminations', 'termination_id'],
  employee_loan_payments: ['employee_loans', 'loan_id'],
  evaluation_scores: ['performance_evaluations', 'evaluation_id'],
  exam_delivery_items: ['exam_delivery_transactions', 'transaction_id'],
  disciplinary_timeline: ['disciplinary_processes', 'process_id'],
  disciplinary_evidence: ['disciplinary_processes', 'process_id'],
};
const denied =
  /(^company_id$|password|username|secret|token|signature|file_url|document_url|_path$|_url$|ip_address|user_agent|latitude|longitude|accuracy_meters|distance_meters|identity_hash|idempotency|receipt_code|^content$|^message$|^description$|^notes$|^observations$|^account_number$|^general_notes$|^facts_description$|^decision_summary$|^appeal_resolution$|^reason$|^error_message$|^spe_email$|_observaciones$)/i;
const sources = [];
const sql = [];
for (const [groupModule, entries] of groups)
  for (const item of entries.split('|')) {
    const [table, label] = item.split(':');
    const cols = byTable[table];
    const catalogModules = {
      catalog_eps: 'catalogos_eps',
      catalog_afp: 'catalogos_afp',
      catalog_arl: 'catalogos_arl',
      catalog_ccf: 'catalogos_ccf',
      catalog_afc: 'catalogos_afc',
      catalog_ips: 'catalogos_ips',
      catalog_banks: 'catalogos_bancos',
      identification_types: 'catalogos_tipos_identificacion',
      education_levels: 'catalogos_niveles_educativos',
      professions: 'catalogos_profesiones',
      company_holidays: 'catalogos_festivos',
      contract_type_config: 'catalogos_tipos_contrato',
      novelty_reasons: 'catalogos_motivos_novedad',
      dotation_item_types: 'catalogos_tipos_dotacion',
      exam_catalog: 'examenes',
    };
    const module = catalogModules[table] || groupModule;
    if (!cols) throw new Error(`Missing table ${table}`);
    let employee = cols.employee_id ? 'b.employee_id' : null;
    if (parents[table]) {
      const [p, f] = parents[table];
      employee = `(SELECT p.employee_id FROM public.${p} p WHERE p.id=b.${f} AND p.company_id=b.company_id)`;
    }
    if (table === 'employees_v2') employee = 'b.id';
    if (
      ['candidates', 'copasst_candidates', 'copasst_electorate'].includes(table)
    )
      employee = null;
    let date =
      dates[table] ||
      (['start_date', 'work_date', 'due_date', 'created_at'].find(
        (k) => cols[k],
      ) ??
        null);
    const primitive = Object.entries(cols).filter(
      ([k, t]) =>
        !denied.test(k) && !['jsonb', 'json', 'ARRAY', 'bytea'].includes(t),
    );
    const fields = primitive.map(([key, t]) => ({
      key,
      label: labels[key] || key.replaceAll('_', ' '),
      type: /integer|numeric|double|real|decimal/.test(t)
        ? 'number'
        : t === 'date'
          ? 'date'
          : t.includes('timestamp')
            ? 'datetime'
            : t === 'boolean'
              ? 'boolean'
              : 'text',
      ...(/salary|amount|total_value|net_pay|total_earnings|total_deductions|ibc|contributions|cost/.test(
        key,
      )
        ? { unit: 'COP' }
        : /minutes/.test(key)
          ? { unit: 'minutes' }
          : /hours/.test(key)
            ? { unit: 'hours' }
            : /days/.test(key)
              ? { unit: 'days' }
              : {}),
    }));
    for (const f of fields)
      if (/salary|salari/.test(f.key)) f.permission = 'salarios';
    let center =
      table === 'operation_centers'
        ? 'b.id'
        : cols.operation_center_id
          ? 'b.operation_center_id'
          : null;
    if (
      ['candidates', 'selection_steps', 'candidate_documents'].includes(table)
    )
      center =
        table === 'candidates'
          ? `(SELECT v.operation_center_id FROM public.vacancies v WHERE v.id=b.vacancy_id AND v.company_id=b.company_id)`
          : `(SELECT v.operation_center_id FROM public.candidates c JOIN public.vacancies v ON v.id=c.vacancy_id AND v.company_id=c.company_id WHERE c.id=b.candidate_id AND c.company_id=b.company_id)`;
    if (table === 'vacancy_documents')
      center = `(SELECT v.operation_center_id FROM public.vacancies v WHERE v.id=b.vacancy_id AND v.company_id=b.company_id)`;
    if (table === 'dotation_inventory_movements')
      center = `(SELECT p.operation_center_id FROM public.dotation_inventory p WHERE p.id=b.inventory_item_id AND p.company_id=b.company_id)`;
    const cycle = cols.employment_cycle_id
      ? ' AND (b.employment_cycle_id IS NULL OR w.employment_cycle_id=b.employment_cycle_id)'
      : '';
    const atDate =
      date && table !== 'employees_v2'
        ? ` AND w.valid_from<=b.${date}::date AND (w.valid_to IS NULL OR w.valid_to>=b.${date}::date)`
        : ' AND w.is_current';
    const work = employee
      ? ` LEFT JOIN LATERAL (SELECT w.* FROM public.employee_work_info w WHERE w.employee_id=${employee} AND w.company_id=b.company_id${cycle}${atDate} ORDER BY w.is_current DESC,w.valid_from DESC,w.id LIMIT 1) w ON true LEFT JOIN public.employees_v2 e ON e.id=${employee} AND e.company_id=b.company_id`
      : '';
    center = center
      ? employee
        ? `COALESCE(${center},w.operation_center_id)`
        : center
      : employee
        ? 'w.operation_center_id'
        : null;
    const extras = [`b.company_id`];
    if (table === 'contracts') {
      extras.push(
        `greatest(b.end_date,(SELECT max(x.end_date) FROM public.contract_extensions x WHERE x.contract_id=b.id AND x.company_id=b.company_id)) AS effective_end_date`,
      );
      fields.push({
        key: 'effective_end_date',
        label: 'Vencimiento con prórrogas',
        type: 'date',
      });
      date = 'effective_end_date';
    }
    if (table === 'time_clock_days') {
      extras.push(
        `CASE WHEN b.expected_start IS NULL OR b.expected_end IS NULL THEN 0 ELSE greatest(0,round(extract(epoch FROM (b.expected_end-b.expected_start))/60)-b.scheduled_break_minutes) END AS scheduled_minutes`,
      );
      fields.push({
        key: 'scheduled_minutes',
        label: 'Minutos programados',
        type: 'number',
        unit: 'minutes',
      });
    }
    if (!cols.id) {
      extras.push(`md5(row_to_json(b)::text) AS id`);
      fields.unshift({ key: 'id', label: 'Identificador', type: 'text' });
    }
    if (employee) {
      extras.push(
        `${employee} AS report_employee_id`,
        `concat_ws(' ',e.first_name,e.middle_name,e.last_name,e.second_last_name) AS report_employee_name`,
        `w.position_name AS report_position`,
        `(SELECT a.name FROM public.areas a WHERE a.id=w.area_id AND a.company_id=b.company_id) AS report_area_name`,
      );
      fields.push(
        { key: 'report_employee_name', label: 'Empleado', type: 'text' },
        { key: 'report_position', label: 'Cargo', type: 'text' },
        { key: 'report_area_name', label: 'Área', type: 'text' },
      );
    }
    if (center) {
      extras.push(
        `${center} AS report_center_id`,
        `(SELECT oc.name FROM public.operation_centers oc WHERE oc.id=${center} AND oc.company_id=b.company_id) AS report_center_name`,
      );
      fields.push({
        key: 'report_center_name',
        label: 'Centro de operación',
        type: 'text',
      });
    }
    const shared = !!catalogModules[table];
    const scope = [
      shared
        ? `(b.company_id IS NULL OR report_private.allowed(b.company_id, '${module}', 'view'))`
        : `report_private.allowed(b.company_id, '${module}', 'view')`,
    ];
    if (table === 'personnel_requisitions')
      scope.push(
        `(NOT b.is_confidential OR report_private.allowed(b.company_id,'req_confidential_requisitions','view'))`,
      );
    if (employee)
      scope.push(
        `(${employee} IS NULL OR public.has_employee_v2_access(${employee}))`,
      );
    if (center)
      scope.push(`public.check_center_access(b.company_id,${center})`);
    // All predicates are evaluated as the signed-in caller, in addition to table RLS.
    sql.push(
      `CREATE OR REPLACE VIEW report_data.${table} WITH (security_invoker=true,security_barrier=true) AS SELECT ${primitive
        .map(([k]) => `b."${k}"`)
        .concat(extras)
        .join(
          ',',
        )} FROM public.${table} b${work} WHERE ${scope.join(' AND ')};`,
    );
    sources.push({
      key: table,
      label,
      module,
      fields,
      dateField: date,
      endDateField: [
        'employee_incapacities',
        'leave_requests',
        'vacation_requests',
      ].includes(table)
        ? 'end_date'
        : null,
      employeeField: employee ? 'report_employee_id' : null,
      centerField: center ? 'report_center_id' : null,
      description:
        table === 'employee_work_info'
          ? 'Historial por vinculación. Filtrar is_current=true solo para situación actual.'
          : table === 'employee_shift_assignments'
            ? 'Programación; no acredita asistencia.'
            : table === 'time_clock_days'
              ? 'Asistencia consolidada del reloj; minutos reales y horarios esperados.'
              : table === 'training_completions'
                ? 'Finalizaciones registradas; no equivalen por sí solas al porcentaje de cumplimiento.'
                : `${label}: registros autorizados. ${date ? `Fecha predeterminada: ${date}.` : ''}`,
    });
  }
addDerivedSources(sources, sql);
fs.mkdirSync('supabase/functions/_shared/reporting', { recursive: true });
fs.writeFileSync(
  'supabase/functions/_shared/reporting/catalog.json',
  JSON.stringify(sources, null, 2) + '\n',
);
fs.writeFileSync(
  'scratch/report-catalog-seed.sql',
  sql.join('\n') +
    '\nINSERT INTO report_private.sources(key,label,module,fields,date_field,end_date_field,employee_field,center_field,description) VALUES\n' +
    sources
      .map(
        (s) =>
          `('${s.key}','${s.label.replaceAll("'", "''")}','${s.module}','${JSON.stringify(s.fields).replaceAll("'", "''")}'::jsonb,${s.dateField ? `'${s.dateField}'` : 'NULL'},${s.endDateField ? `'${s.endDateField}'` : 'NULL'},${s.employeeField ? `'${s.employeeField}'` : 'NULL'},${s.centerField ? `'${s.centerField}'` : 'NULL'},'${s.description.replaceAll("'", "''")}')`,
      )
      .join(',\n') +
    ';\nGRANT SELECT ON ALL TABLES IN SCHEMA report_data TO authenticated;\n',
);
console.log(
  `${sources.length} sources generated; review SQL before including it in a migration.`,
);
