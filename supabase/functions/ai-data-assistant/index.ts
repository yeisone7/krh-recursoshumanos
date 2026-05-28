import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type QueryValidation = {
  ok: boolean;
  sql?: string;
  tables?: string[];
  warning?: string;
};

type PreparedSql = {
  sql: string;
  intent: string;
  sourceSummary: string;
  suggestedQuestions: string[];
};

const MAX_QUESTION_LENGTH = 2000;
const MAX_RESULT_LIMIT = 100;
const DEFAULT_RESULT_LIMIT = 50;

const DEFAULT_SUGGESTED_QUESTIONS = [
  "Empleados activos por centro de operacion",
  "Contratos que vencen en los proximos 30 dias",
  "Vacantes abiertas y candidatos por etapa",
];

const DATA_DICTIONARY = [
  {
    module: "Empleados",
    tables: "employees_v2, employee_work_info, operation_centers, areas, positions",
    metrics: "empleados activos, distribucion por centro, area, cargo, antiguedad y edad",
    businessRules: "empleado activo = employees_v2.is_active = true; ubicacion/cargo actual = employee_work_info.is_current = true",
  },
  {
    module: "Contratos",
    tables: "contracts, contract_extensions, employees_v2",
    metrics: "contratos vigentes, vencimientos, salario base, tipos de contrato, aprobaciones",
    businessRules: "contrato vigente = contracts.is_terminated = false; contrato por vencer usa contracts.end_date",
  },
  {
    module: "Seleccion",
    tables: "personnel_requisitions, vacancies, candidates, selection_steps",
    metrics: "vacantes abiertas, candidatos por vacante, candidatos por etapa, avance del proceso",
    businessRules: "vacante abierta = vacancies.status IN ('open','in_process'); etapa vigente = candidates.current_step",
  },
  {
    module: "Retiros",
    tables: "employee_terminations, contracts, employees_v2",
    metrics: "retiros completados, retiros pendientes, tipos y razones de retiro",
    businessRules: "retiro completado = employee_terminations.is_completed = true",
  },
  {
    module: "Capacitaciones",
    tables: "training_courses, training_sessions, training_completions",
    metrics: "cursos activos, sesiones, asistencias/completados, puntaje promedio",
    businessRules: "cumplimiento de capacitacion se mide con training_completions por curso/sesion",
  },
  {
    module: "Dotacion",
    tables: "dotation_deliveries, dotation_inventory, dotation_inventory_movements",
    metrics: "entregas, vencimientos de dotacion, movimientos de inventario",
    businessRules: "entrega vencida usa dotation_deliveries.expiration_date < CURRENT_DATE",
  },
];

const ALLOWED_TABLES = new Set([
  "employees_v2",
  "employee_work_info",
  "employee_contact",
  "employee_family",
  "employee_family_members",
  "employee_bank_info",
  "employee_social_security",
  "employee_certifications",
  "employee_documents",
  "employee_onboarding_tasks",
  "employee_terminations",
  "termination_documents",
  "contracts",
  "contract_extensions",
  "contract_sequences",
  "work_certificates",
  "operation_centers",
  "areas",
  "positions",
  "position_profiles",
  "position_profile_annexes",
  "personnel_requisitions",
  "vacancies",
  "candidates",
  "selection_steps",
  "payroll_novelties",
  "payroll_receipts",
  "overtime_records",
  "employee_incapacities",
  "leave_requests",
  "vacation_requests",
  "employee_loans",
  "loan_refinancing_history",
  "cesantias_deposits",
  "cesantias_interest_payments",
  "training_courses",
  "training_sessions",
  "training_completions",
  "performance_evaluations",
  "evaluation_scores",
  "disciplinary_processes",
  "medical_exams",
  "dotation_deliveries",
  "dotation_inventory",
  "dotation_inventory_movements",
  "shift_types",
  "employee_shifts",
  "work_schedules",
  "shifts",
  "catalog_eps",
  "catalog_afp",
  "catalog_arl",
  "professions",
  "education_levels",
  "identification_types",
  "companies",
]);

const BLOCKED_SQL_PATTERNS = [
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|execute|vacuum|refresh|set|reset)\b/i,
  /\b(pg_sleep|dblink|http_|net\.|storage\.|auth\.|vault\.|extensions\.)/i,
  /\b(information_schema|pg_catalog|pg_stat|pg_user|pg_shadow)\b/i,
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "No se proporcionó token de autorización" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "No autorizado" }, 401);

    const body = await req.json();
    const question = String(body.question ?? "").trim();
    const companyId = String(body.companyId ?? "").trim();
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
    const userName = typeof body.userName === "string" ? body.userName : "Usuario";

    if (!companyId || !isValidUUID(companyId)) return jsonResponse({ error: "Falta companyId válido" }, 400);
    if (!question) return jsonResponse({ error: "La pregunta no puede estar vacía" }, 400);
    if (question.length > MAX_QUESTION_LENGTH) {
      return jsonResponse({ error: `La pregunta supera el máximo de ${MAX_QUESTION_LENGTH} caracteres.` }, 400);
    }

    const access = await validateUserAccess(supabaseClient, user.id, companyId);
    if (!access.companyAllowed) return jsonResponse({ error: "No tienes acceso a la empresa seleccionada." }, 403);
    if (!access.aiAllowed) return jsonResponse({ error: "El Asistente de Datos IA no está habilitado para tu usuario." }, 403);

    const effectiveConvId = await resolveConversationId(supabaseClient, {
      conversationId,
      companyId,
      userId: user.id,
      title: buildConversationTitle(question),
    });

    if (isSocialMessage(question)) {
      const text = socialResponse(question, userName);
      await persistConversationTurn(supabaseClient, {
        conversationId: effectiveConvId,
        companyId,
        userId: user.id,
        question,
        answer: text.explanation,
        metadata: { kind: "social" },
      });
      return jsonResponse({ ...text, type: "text", data: null, metadata: { row_count: 0 }, conversationId: effectiveConvId });
    }

    const apiKey = await getOpenAiApiKey(supabaseClient);
    if (!apiKey) return jsonResponse({ error: "No hay una API key de OpenAI configurada para el asistente." }, 500);

    const history = await getConversationHistory(supabaseClient, effectiveConvId);
    const preparedSql = buildPreparedSql(question, companyId);
    const sql = preparedSql?.sql ?? await generateSql({ apiKey, question, companyId, history });
    const validation = validateSql(sql, companyId);

    if (!validation.ok || !validation.sql) {
      const explanation = validation.warning || "No pude generar una consulta segura para esa pregunta. Intenta reformularla con un módulo, período o métrica más específica.";
      await persistConversationTurn(supabaseClient, {
        conversationId: effectiveConvId,
        companyId,
        userId: user.id,
        question,
        answer: explanation,
        metadata: { blocked_sql: sql, reason: validation.warning },
      });
      return jsonResponse({
        explanation,
        speechText: "No pude generar una consulta segura. Intenta reformular tu pregunta.",
        type: "text",
        data: null,
        metadata: {
          row_count: 0,
          provider: preparedSql ? "template" : "openai",
          warnings: [validation.warning].filter(Boolean),
          suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
        },
        conversationId: effectiveConvId,
      });
    }

    const { data: queryResult, error: queryError } = await supabaseClient.rpc("execute_read_only_query", {
      query_text: validation.sql,
    });

    if (queryError) {
      console.error("[ai-data-assistant] SQL Error:", queryError.message, validation.sql);
      const explanation = "Tuve un problema al consultar los datos. Intenta preguntar de forma más específica, por ejemplo: empleados activos por centro, contratos que vencen este mes o retiros completados por tipo.";
      await persistConversationTurn(supabaseClient, {
        conversationId: effectiveConvId,
        companyId,
        userId: user.id,
        question,
        answer: explanation,
        metadata: { sql: validation.sql, error: queryError.message },
      });
      return jsonResponse({
        explanation,
        speechText: "Tuve un problema técnico al consultar los datos. ¿Podrías preguntar de otra forma?",
        type: "text",
        data: null,
        metadata: {
          row_count: 0,
          sql: validation.sql,
          provider: preparedSql ? "template" : "openai",
          sourceTables: validation.tables,
          sourceSummary: preparedSql?.sourceSummary,
          suggestedQuestions: preparedSql?.suggestedQuestions ?? DEFAULT_SUGGESTED_QUESTIONS,
        },
        conversationId: effectiveConvId,
      });
    }

    const rows = Array.isArray(queryResult) ? queryResult : [];
    const explanation = await explainResults({
      apiKey,
      question,
      rows,
      history,
      sourceSummary: preparedSql?.sourceSummary,
      intent: preparedSql?.intent,
    });

    await persistConversationTurn(supabaseClient, {
      conversationId: effectiveConvId,
      companyId,
      userId: user.id,
      question,
      answer: explanation.explanation,
      metadata: {
        sql: validation.sql,
        result_count: rows.length,
        source_tables: validation.tables,
        suggested_chart: explanation.suggestedChart,
        intent: preparedSql?.intent,
        source_summary: preparedSql?.sourceSummary,
        suggested_questions: preparedSql?.suggestedQuestions,
      },
    });

    return jsonResponse({
      type: inferResponseType(rows, explanation.suggestedChart),
      data: rows,
      explanation: explanation.explanation,
      speechText: explanation.speechText,
      metadata: {
        row_count: rows.length,
        sql: validation.sql,
        provider: preparedSql ? "template" : "openai",
        suggestedChart: explanation.suggestedChart,
        sourceTables: validation.tables,
        sourceSummary: preparedSql?.sourceSummary ?? buildSourceSummary(validation.tables),
        suggestedQuestions: preparedSql?.suggestedQuestions ?? suggestFollowUpQuestions(question, validation.tables),
        intent: preparedSql?.intent,
        cappedAt: MAX_RESULT_LIMIT,
      },
      conversationId: effectiveConvId,
    });
  } catch (err) {
    console.error("[ai-data-assistant] Fatal:", err);
    return jsonResponse({
      explanation: "Ocurrió un error inesperado al procesar la pregunta.",
      speechText: "Ocurrió un error inesperado.",
      type: "text",
      data: null,
      metadata: { row_count: 0 },
    }, 500);
  }
});

async function validateUserAccess(supabaseClient: any, userId: string, companyId: string) {
  const [{ data: superAdmin }, { data: prefs }, { data: companyAssignment }] = await Promise.all([
    supabaseClient.from("super_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabaseClient.from("user_preferences").select("ai_data_assistant_enabled").eq("user_id", userId).maybeSingle(),
    supabaseClient.from("user_company_assignments").select("id").eq("user_id", userId).eq("company_id", companyId).maybeSingle(),
  ]);

  const isSuperAdmin = !!superAdmin;
  return {
    companyAllowed: isSuperAdmin || !!companyAssignment,
    aiAllowed: isSuperAdmin || prefs?.ai_data_assistant_enabled === true,
  };
}

async function resolveConversationId(
  supabaseClient: any,
  params: { conversationId: string | null; companyId: string; userId: string; title: string },
) {
  if (params.conversationId && isValidUUID(params.conversationId)) {
    const { data: existing } = await supabaseClient
      .from("ai_chat_conversations")
      .select("id")
      .eq("id", params.conversationId)
      .eq("company_id", params.companyId)
      .eq("user_id", params.userId)
      .eq("mode", "data_analysis")
      .maybeSingle();

    if (existing?.id) return existing.id;
  }

  const id = crypto.randomUUID();
  const { error } = await supabaseClient.from("ai_chat_conversations").insert({
    id,
    company_id: params.companyId,
    user_id: params.userId,
    mode: "data_analysis",
    title: params.title,
    last_message_at: new Date().toISOString(),
  });
  if (error) throw error;
  return id;
}

async function persistConversationTurn(
  supabaseClient: any,
  params: {
    conversationId: string;
    companyId: string;
    userId: string;
    question: string;
    answer: string;
    metadata: Record<string, unknown>;
  },
) {
  await supabaseClient
    .from("ai_chat_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId)
    .eq("user_id", params.userId);

  const { error } = await supabaseClient.from("ai_chat_messages").insert([
    {
      conversation_id: params.conversationId,
      company_id: params.companyId,
      user_id: params.userId,
      role: "user",
      content: params.question,
    },
    {
      conversation_id: params.conversationId,
      company_id: params.companyId,
      user_id: params.userId,
      role: "assistant",
      content: params.answer,
      ai_provider: "openai",
      metadata: params.metadata,
    },
  ]);
  if (error) console.error("[ai-data-assistant] persist error:", error.message);
}

async function getConversationHistory(supabaseClient: any, conversationId: string) {
  const { data } = await supabaseClient
    .from("ai_chat_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(8);

  return (data ?? [])
    .filter((m: any) => m.role === "user" || m.role === "assistant")
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 1200) }));
}

async function getOpenAiApiKey(supabaseClient: any) {
  const { data: aiConfig } = await supabaseClient
    .from("system_config")
    .select("config_value")
    .eq("config_key", "ai_config")
    .maybeSingle();

  return aiConfig?.config_value?.openai_api_key || Deno.env.get("OPENAI_API_KEY") || "";
}

function buildPreparedSql(question: string, companyId: string): PreparedSql | null {
  const q = normalizeQuestion(question);

  if (hasAll(q, ["vacante", "abierta", "candidato", "etapa"])) {
    return {
      intent: "vacancies_open_candidates_by_stage",
      sourceSummary: "Fuente: vacancies y candidates. Filtro: empresa actual y vacantes en estado open/in_process. Etapa: candidates.current_step.",
      suggestedQuestions: [
        "Vacantes abiertas por centro de operacion",
        "Candidatos seleccionados por vacante",
        "Candidatos por estado del proceso de seleccion",
      ],
      sql: `
SELECT
  v.position_title AS vacante,
  COALESCE(ca.current_step::text, 'sin_etapa') AS etapa,
  COUNT(DISTINCT ca.id)::int AS cantidad_candidatos
FROM vacancies v
LEFT JOIN candidates ca
  ON ca.vacancy_id = v.id
  AND ca.company_id = '${companyId}'
WHERE v.company_id = '${companyId}'
  AND v.status IN ('open', 'in_process')
GROUP BY v.position_title, COALESCE(ca.current_step::text, 'sin_etapa')
ORDER BY v.position_title ASC, cantidad_candidatos DESC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAll(q, ["empleado", "activo", "centro"])) {
    return {
      intent: "active_employees_by_operation_center",
      sourceSummary: "Fuente: employees_v2, employee_work_info y operation_centers. Filtro: empresa actual, empleados activos e informacion laboral vigente.",
      suggestedQuestions: [
        "Empleados activos por area",
        "Empleados activos por cargo",
        "Empleados activos sin centro asignado",
      ],
      sql: `
SELECT
  COALESCE(oc.name, 'Sin centro') AS centro_operacion,
  COUNT(DISTINCT e.id)::int AS empleados_activos
FROM employees_v2 e
LEFT JOIN employee_work_info w
  ON w.employee_id = e.id
  AND w.company_id = '${companyId}'
  AND w.is_current = true
LEFT JOIN operation_centers oc
  ON oc.id = w.operation_center_id
  AND oc.company_id = '${companyId}'
WHERE e.company_id = '${companyId}'
  AND e.is_active = true
GROUP BY COALESCE(oc.name, 'Sin centro')
ORDER BY empleados_activos DESC, centro_operacion ASC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["contrato", "contratos"]) && hasAny(q, ["vencen", "vencer", "vencimiento", "proximos", "proximo"])) {
    return {
      intent: "contracts_expiring_next_30_days",
      sourceSummary: "Fuente: contracts y employees_v2. Filtro: empresa actual, contratos no terminados con fecha final dentro de los proximos 30 dias.",
      suggestedQuestions: [
        "Contratos vencidos no terminados",
        "Contratos vigentes por tipo",
        "Contratos pendientes por aprobar",
      ],
      sql: `
SELECT
  CONCAT(e.first_name, ' ', e.last_name) AS empleado,
  c.contract_type AS tipo_contrato,
  c.start_date AS fecha_inicio,
  c.end_date AS fecha_fin,
  (c.end_date - CURRENT_DATE)::int AS dias_para_vencer
FROM contracts c
JOIN employees_v2 e
  ON e.id = c.employee_id
  AND e.company_id = '${companyId}'
WHERE c.company_id = '${companyId}'
  AND COALESCE(c.is_terminated, false) = false
  AND c.end_date IS NOT NULL
  AND c.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
ORDER BY c.end_date ASC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["retiro", "retiros", "retirado", "terminacion", "terminaciones"]) && hasAny(q, ["tipo", "razon", "motivo"])) {
    return {
      intent: "completed_terminations_by_type",
      sourceSummary: "Fuente: employee_terminations. Filtro: empresa actual y procesos de retiro completados.",
      suggestedQuestions: [
        "Retiros pendientes por fecha efectiva",
        "Retiros completados por mes",
        "Detalle de retiros completados recientes",
      ],
      sql: `
SELECT
  et.termination_type::text AS tipo_retiro,
  COUNT(*)::int AS cantidad_retiros
FROM employee_terminations et
WHERE et.company_id = '${companyId}'
  AND et.is_completed = true
GROUP BY et.termination_type::text
ORDER BY cantidad_retiros DESC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["capacitacion", "capacitaciones", "curso", "cursos"]) && hasAny(q, ["cumplimiento", "completados", "asistencia", "asistentes"])) {
    return {
      intent: "training_completions_by_course",
      sourceSummary: "Fuente: training_courses y training_completions. Filtro: empresa actual; cuenta registros completados por curso.",
      suggestedQuestions: [
        "Cursos activos sin completados",
        "Puntaje promedio por curso",
        "Capacitaciones completadas este mes",
      ],
      sql: `
SELECT
  tc.name AS capacitacion,
  COUNT(tcomp.id)::int AS completados,
  ROUND(AVG(tcomp.quiz_score)::numeric, 2) AS puntaje_promedio
FROM training_courses tc
LEFT JOIN training_completions tcomp
  ON tcomp.course_id = tc.id
  AND tcomp.company_id = '${companyId}'
WHERE tc.company_id = '${companyId}'
GROUP BY tc.name
ORDER BY completados DESC, capacitacion ASC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  return null;
}

function buildDataDictionaryPrompt() {
  return DATA_DICTIONARY
    .map((entry) => `- ${entry.module}: tablas=${entry.tables}; metricas=${entry.metrics}; reglas=${entry.businessRules}.`)
    .join("\n");
}

function normalizeQuestion(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAll(value: string, terms: string[]) {
  return terms.every((term) => value.includes(term));
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

async function generateSql(params: { apiKey: string; question: string; companyId: string; history: any[] }) {
  const systemPrompt = `Eres un analista senior de datos de RRHH para EmpatiQ. Genera una consulta SQL PostgreSQL de SOLO LECTURA.

REGLAS OBLIGATORIAS:
- Responde exclusivamente con SQL, sin markdown.
- Usa solamente SELECT o WITH ... SELECT.
- Usa siempre alias de tablas.
- Usa LIMIT ${DEFAULT_RESULT_LIMIT} salvo que el usuario pida menos. Nunca uses LIMIT mayor a ${MAX_RESULT_LIMIT}.
- Todas las consultas deben quedar filtradas por la empresa '${params.companyId}'.
- Si una tabla tiene company_id, filtra esa tabla por company_id = '${params.companyId}'.
- Si partes desde empleados, usa employees_v2 e y filtra e.company_id = '${params.companyId}'.
- No consultes tokens, secretos, perfiles de usuario, autenticación, storage ni tablas fuera del dominio RRHH.

TABLAS PERMITIDAS:
${Array.from(ALLOWED_TABLES).sort().join(", ")}

DICCIONARIO DE DATOS DEL NEGOCIO:
${buildDataDictionaryPrompt()}

RELACIONES FRECUENTES:
- employees_v2 e -> employee_work_info w: e.id = w.employee_id
- employee_work_info w -> areas a: w.area_id = a.id
- employee_work_info w -> positions p: w.position_id = p.id
- employee_work_info w -> operation_centers oc: w.operation_center_id = oc.id
- employees_v2 e -> contracts c: e.id = c.employee_id
- employees_v2 e -> employee_terminations et: e.id = et.employee_id
- contracts c -> employee_terminations et: c.id = et.contract_id
- personnel_requisitions r -> operation_centers oc: r.operation_center_id = oc.id
- vacancies v -> candidates ca: v.id = ca.vacancy_id
- candidates ca -> selection_steps ss: ca.id = ss.candidate_id

REGLAS DE NEGOCIO:
- Empleado activo: employees_v2.is_active = true.
- Contrato vigente: contracts.is_terminated = false.
- Retirado: existe employee_terminations.is_completed = true o contrato terminado.
- En retiro: employee_terminations.is_completed = false.
- Edad: EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.birth_date)).
- Antigüedad: AGE(CURRENT_DATE, fecha de ingreso disponible).
- Salario base actual: contratos no terminados del empleado.
- Género: 'M' masculino, 'F' femenino.

- Vacantes abiertas: vacancies.status IN ('open', 'in_process').
- Etapa actual de candidato: usa candidates.current_step cuando solo necesites la etapa vigente. Si necesitas detalle de pasos, usa selection_steps.step_type, selection_steps.step_order y selection_steps.status.
- Para vacantes y candidatos usa siempre las tablas reales vacancies, candidates y selection_steps. No inventes vistas o tablas como open_vacancies, candidates_per_stage, active_vacancies ni candidate_stages; si necesitas organizar la consulta, esos nombres pueden ser CTEs, no tablas reales.
- Campos clave de vacancies: id, company_id, position_title, status, open_date, target_close_date, operation_center_id, positions_count.
- Campos clave de candidates: id, company_id, vacancy_id, first_name, last_name, status, current_step, application_date, is_selected.
- Campos clave de selection_steps: id, company_id, candidate_id, step_type, step_order, status, completed_date, scheduled_date, score, result.

Si la pregunta no se puede responder con estas tablas, genera una consulta segura que devuelva cero filas con una columna mensaje.`;

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...params.history,
        { role: "user", content: params.question },
      ],
      temperature: 0,
    }),
  });

  if (!aiRes.ok) throw new Error(`OpenAI SQL generation failed: ${aiRes.status}`);
  const aiData = await aiRes.json();
  return String(aiData.choices?.[0]?.message?.content ?? "").replace(/```sql|```/gi, "").trim();
}

async function explainResults(params: {
  apiKey: string;
  question: string;
  rows: Record<string, unknown>[];
  history: any[];
  sourceSummary?: string;
  intent?: string;
}) {
  const prompt = `Eres un analista de RRHH. Explica resultados con criterio ejecutivo y prudente.
Devuelve JSON válido con:
- explanation: Markdown breve en español. Incluye hallazgos, advertencias si hay pocos datos y siguiente lectura sugerida.
- speechText: una versión de voz de máximo 220 caracteres.
- suggestedChart: "bar", "pie" o null.
Si recibes fuente/filtros, mencionalos brevemente al final bajo "Fuente".
No inventes datos fuera de los resultados.`;

  const explainRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        ...params.history.slice(-4),
        {
          role: "user",
          content: JSON.stringify({
            question: params.question,
            rowCount: params.rows.length,
            sampleRows: params.rows.slice(0, 15),
            intent: params.intent,
            sourceSummary: params.sourceSummary,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!explainRes.ok) {
    return {
      explanation: defaultExplanation(params.rows),
      speechText: params.rows.length ? `Encontré ${params.rows.length} registros para tu consulta.` : "No encontré registros para tu consulta.",
      suggestedChart: inferChart(params.rows),
    };
  }

  try {
    const explainData = await explainRes.json();
    const parsed = JSON.parse(explainData.choices?.[0]?.message?.content ?? "{}");
    return {
      explanation: String(parsed.explanation || defaultExplanation(params.rows)),
      speechText: String(parsed.speechText || ""),
      suggestedChart: parsed.suggestedChart === "bar" || parsed.suggestedChart === "pie" ? parsed.suggestedChart : inferChart(params.rows),
    };
  } catch {
    return {
      explanation: defaultExplanation(params.rows),
      speechText: params.rows.length ? `Encontré ${params.rows.length} registros para tu consulta.` : "No encontré registros para tu consulta.",
      suggestedChart: inferChart(params.rows),
    };
  }
}

function validateSql(rawSql: string, companyId: string): QueryValidation {
  let sql = String(rawSql || "")
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (!sql) return { ok: false, warning: "La IA no generó una consulta SQL." };
  if (sql.endsWith(";")) sql = sql.slice(0, -1).trim();
  if (sql.includes(";")) return { ok: false, warning: "La consulta contiene múltiples sentencias y fue bloqueada." };
  if (!/^(select|with)\b/i.test(sql)) return { ok: false, warning: "Solo se permiten consultas SELECT." };
  if (BLOCKED_SQL_PATTERNS.some((pattern) => pattern.test(sql))) {
    return { ok: false, warning: "La consulta incluye operaciones o esquemas no permitidos." };
  }
  if (!sql.includes(companyId)) {
    return { ok: false, warning: "La consulta no incluye el filtro de empresa requerido." };
  }

  const tables = extractReferencedTables(sql);
  if (tables.length === 0) return { ok: false, warning: "No se detectaron tablas consultadas." };

  const unauthorized = tables.filter((table) => !ALLOWED_TABLES.has(table));
  if (unauthorized.length > 0) {
    return { ok: false, warning: `La consulta intenta acceder a tablas no permitidas: ${unauthorized.join(", ")}.` };
  }

  sql = enforceLimit(sql);
  return { ok: true, sql, tables: Array.from(new Set(tables)) };
}

function extractReferencedTables(sql: string) {
  const tables = new Set<string>();
  const cteNames = extractCteNames(sql);
  const re = /\b(?:from|join)\s+((?:public\.)?(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*))/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql)) !== null) {
    const table = match[1].replace(/^public\./i, "").replace(/"/g, "").toLowerCase();
    if (table !== "select" && !cteNames.has(table)) tables.add(table);
  }
  return Array.from(tables);
}

function extractCteNames(sql: string) {
  const names = new Set<string>();
  if (!/^\s*with\b/i.test(sql)) return names;

  const re = /(?:\bwith|,)\s+("?[a-zA-Z_][a-zA-Z0-9_]*"?)\s+as\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql)) !== null) {
    names.add(match[1].replace(/"/g, "").toLowerCase());
  }

  return names;
}

function enforceLimit(sql: string) {
  const limitMatch = sql.match(/\blimit\s+(\d+)\b/i);
  if (!limitMatch) return `${sql} LIMIT ${DEFAULT_RESULT_LIMIT}`;

  const requested = Number(limitMatch[1]);
  if (Number.isFinite(requested) && requested > MAX_RESULT_LIMIT) {
    return sql.replace(/\blimit\s+\d+\b/i, `LIMIT ${MAX_RESULT_LIMIT}`);
  }
  return sql;
}

function inferResponseType(rows: Record<string, unknown>[], chart: string | null) {
  if (chart && rows.length > 1) return "chart";
  if (rows.length === 1 && Object.keys(rows[0] ?? {}).length <= 3) return "kpi";
  if (rows.length > 0) return "table";
  return "text";
}

function inferChart(rows: Record<string, unknown>[]) {
  if (rows.length < 2 || rows.length > 20) return null;
  const first = rows[0] ?? {};
  const hasLabel = Object.values(first).some((value) => typeof value === "string");
  const hasNumber = Object.values(first).some((value) => typeof value === "number");
  return hasLabel && hasNumber ? (rows.length <= 8 ? "pie" : "bar") : null;
}

function defaultExplanation(rows: Record<string, unknown>[]) {
  if (!rows.length) return "No encontré registros que coincidan con la consulta.";
  return `Encontré ${rows.length} registro${rows.length === 1 ? "" : "s"} para la consulta. Revisa la tabla para ver el detalle.`;
}

function buildSourceSummary(tables: string[] = []) {
  if (!tables.length) return "Fuente: tablas autorizadas de RRHH. Filtro: empresa actual.";
  return `Fuente: ${tables.slice(0, 5).join(", ")}. Filtro: empresa actual y reglas de solo lectura.`;
}

function suggestFollowUpQuestions(question: string, tables: string[] = []) {
  const q = normalizeQuestion(question);

  if (tables.includes("vacancies") || tables.includes("candidates") || q.includes("vacante")) {
    return [
      "Vacantes abiertas por centro de operacion",
      "Candidatos por estado del proceso",
      "Candidatos seleccionados por vacante",
    ];
  }

  if (tables.includes("contracts") || q.includes("contrato")) {
    return [
      "Contratos vigentes por tipo",
      "Contratos que vencen en los proximos 30 dias",
      "Contratos pendientes por aprobar",
    ];
  }

  if (tables.includes("employees_v2") || q.includes("empleado")) {
    return [
      "Empleados activos por centro de operacion",
      "Empleados activos por area",
      "Empleados activos por cargo",
    ];
  }

  return DEFAULT_SUGGESTED_QUESTIONS;
}

function buildBlockedQueryExplanation(warning?: string) {
  const detail = warning ? `Detalle tecnico: ${warning}` : "No pude generar una consulta segura con las tablas autorizadas.";
  return `${detail}\n\nPuedes intentar con una pregunta mas especifica, por ejemplo: ${DEFAULT_SUGGESTED_QUESTIONS.join("; ")}.`;
}

function buildConversationTitle(question: string) {
  return question.replace(/\s+/g, " ").slice(0, 80) || "Nueva conversación";
}

function isSocialMessage(question: string) {
  const normalized = question.toLowerCase().trim();
  return /^(hola|gracias|muchas gracias|buenos dias|buenos días|buenas tardes|buenas noches|saludos|chau|adios|adiós|ok|entendido|listo|perfecto)$/.test(normalized);
}

function socialResponse(question: string, userName: string) {
  const normalized = question.toLowerCase();
  if (normalized.includes("gracias")) {
    return {
      explanation: "¡Con gusto! Cuando quieras, puedo ayudarte a analizar empleados, contratos, retiros, nómina, selección, dotación o exámenes médicos.",
      speechText: "Con gusto. Puedo ayudarte con más análisis de datos cuando quieras.",
    };
  }
  return {
    explanation: `Hola ${userName}. Soy tu asistente de análisis de datos de EmpatiQ. Puedes preguntarme por métricas, tendencias, listados o comparativos de RRHH.`,
    speechText: `Hola ${userName}. ¿Qué datos de recursos humanos quieres analizar?`,
  };
}

function isValidUUID(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
