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

type ClarificationResponse = {
  explanation: string;
  speechText: string;
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
    businessRules: "vacante abierta = vacancies.status IN ('open','in_process','pending_placed'); etapa vigente = candidates.current_step",
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

const COLUMN_SCHEMA: Record<string, Set<string>> = {
  employees_v2: new Set(["id", "company_id", "first_name", "middle_name", "last_name", "second_last_name", "document_number", "document_type", "birth_date", "gender", "is_active", "created_at", "updated_at"]),
  employee_work_info: new Set(["id", "company_id", "employee_id", "operation_center_id", "area_id", "position_id", "position_name", "hire_date", "is_current", "valid_from", "valid_to", "termination_date", "work_city", "cost_center"]),
  operation_centers: new Set(["id", "company_id", "name", "code", "city", "department", "is_active", "main_client", "manager_name", "created_at", "updated_at"]),
  areas: new Set(["id", "company_id", "name", "code", "is_active", "parent_id", "manager_id", "created_at", "updated_at"]),
  positions: new Set(["id", "company_id", "name", "code", "is_active", "area_id", "created_at", "updated_at"]),
  contracts: new Set(["id", "company_id", "employee_id", "contract_number", "contract_type", "salary", "salary_type", "start_date", "end_date", "is_terminated", "is_approved", "termination_date", "termination_reason", "created_at", "updated_at"]),
  employee_terminations: new Set(["id", "company_id", "employee_id", "contract_id", "termination_type", "termination_date", "effective_date", "resignation_date", "reason", "is_completed", "completed_at", "created_at", "updated_at"]),
  personnel_requisitions: new Set(["id", "company_id", "operation_center_id", "cargo_solicitado", "solicitante_nombre", "estado_requisicion", "fecha_requisicion", "fecha_ingreso_estimada", "cantidad_vacantes_requeridas", "motivo_solicitud", "created_at", "updated_at"]),
  vacancies: new Set(["id", "company_id", "position_title", "status", "open_date", "target_close_date", "actual_close_date", "operation_center_id", "positions_count", "priority", "requisition_id", "created_at", "updated_at"]),
  candidates: new Set(["id", "company_id", "vacancy_id", "first_name", "last_name", "status", "current_step", "application_date", "is_selected", "final_score", "source", "created_at", "updated_at"]),
  selection_steps: new Set(["id", "company_id", "candidate_id", "step_type", "step_order", "status", "scheduled_date", "completed_date", "score", "result", "created_at", "updated_at"]),
  employee_incapacities: new Set(["id", "company_id", "employee_id", "diagnosis", "cie10_code", "origin", "start_date", "end_date", "total_days", "total_amount", "recovery_status", "created_at", "updated_at"]),
  leave_requests: new Set(["id", "company_id", "employee_id", "leave_type", "status", "start_date", "end_date", "total_days", "total_hours", "reason", "requested_at", "created_at", "updated_at"]),
  vacation_requests: new Set(["id", "company_id", "employee_id", "request_type", "status", "start_date", "end_date", "business_days", "calendar_days", "remaining_days", "created_at", "updated_at"]),
  training_courses: new Set(["id", "company_id", "name", "category", "status", "is_active", "is_mandatory", "duration_hours", "target_audience", "audience", "validity_months", "created_at", "updated_at"]),
  training_sessions: new Set(["id", "company_id", "course_id", "status", "start_date", "end_date", "instructor_name", "location", "max_participants", "created_at", "updated_at"]),
  training_completions: new Set(["id", "company_id", "course_id", "employee_id", "completed_at", "operator_name", "operator_cedula", "quiz_score", "created_at"]),
  employee_documents: new Set(["id", "company_id", "employee_id", "document_type", "document_name", "file_name", "expiry_date", "is_valid", "upload_date", "created_at", "updated_at"]),
  medical_exams: new Set(["id", "company_id", "employee_id", "exam_type", "exam_date", "expiration_date", "provider", "doctor_name", "concept", "result", "created_at", "updated_at"]),
  dotation_deliveries: new Set(["id", "company_id", "employee_id", "item_name", "item_type", "quantity", "delivery_date", "expiration_date", "size", "created_at", "updated_at"]),
  dotation_inventory: new Set(["id", "company_id", "item_name", "item_type", "current_stock", "minimum_stock", "size", "created_at", "updated_at"]),
  dotation_inventory_movements: new Set(["id", "company_id", "inventory_id", "movement_type", "quantity", "movement_date", "created_at", "updated_at"]),
  performance_evaluations: new Set(["id", "company_id", "employee_id", "cycle_id", "evaluation_type", "status", "overall_score", "overall_rating", "submitted_at", "reviewed_at", "created_at", "updated_at"]),
  evaluation_scores: new Set(["id", "company_id", "evaluation_id", "criteria_id", "score", "comments", "created_at"]),
  payroll_novelties: new Set(["id", "company_id", "employee_id", "novelty_type", "amount", "period", "status", "created_at", "updated_at"]),
  overtime_records: new Set(["id", "company_id", "employee_id", "overtime_type", "status", "work_date", "total_hours", "total_value", "payroll_period", "created_at", "updated_at"]),
};

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
    const feedback = typeof body.feedback === "object" && body.feedback ? body.feedback : null;

    if (!companyId || !isValidUUID(companyId)) return jsonResponse({ error: "Falta companyId válido" }, 400);
    if (!question && !feedback) return jsonResponse({ error: "La pregunta no puede estar vacía" }, 400);
    if (question && question.length > MAX_QUESTION_LENGTH) {
      return jsonResponse({ error: `La pregunta supera el máximo de ${MAX_QUESTION_LENGTH} caracteres.` }, 400);
    }

    const access = await validateUserAccess(supabaseClient, user.id, companyId);
    if (!access.companyAllowed) return jsonResponse({ error: "No tienes acceso a la empresa seleccionada." }, 403);
    if (!access.aiAllowed) return jsonResponse({ error: "El Asistente de Datos IA no está habilitado para tu usuario." }, 403);

    if (feedback) {
      if (!conversationId || !isValidUUID(conversationId)) return jsonResponse({ error: "Falta conversationId valido para registrar feedback." }, 400);
      const rating = String(feedback.rating ?? "");
      if (rating !== "positive" && rating !== "negative") return jsonResponse({ error: "Feedback invalido." }, 400);
      await persistAssistantFeedback(supabaseClient, {
        conversationId,
        companyId,
        userId: user.id,
        rating,
        comment: typeof feedback.comment === "string" ? feedback.comment.slice(0, 500) : null,
      });
      return jsonResponse({ ok: true });
    }

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

    const clarification = buildClarificationResponse(question);
    if (clarification) {
      await persistConversationTurn(supabaseClient, {
        conversationId: effectiveConvId,
        companyId,
        userId: user.id,
        question,
        answer: clarification.explanation,
        metadata: { kind: "clarification", suggested_questions: clarification.suggestedQuestions },
      });
      return jsonResponse({
        explanation: clarification.explanation,
        speechText: clarification.speechText,
        type: "text",
        data: null,
        metadata: {
          row_count: 0,
          provider: "clarification",
          suggestedQuestions: clarification.suggestedQuestions,
          intent: "needs_clarification",
        },
        conversationId: effectiveConvId,
      });
    }

    const apiKey = await getOpenAiApiKey(supabaseClient);
    if (!apiKey) return jsonResponse({ error: "No hay una API key de OpenAI configurada para el asistente." }, 500);

    const history = await getConversationHistory(supabaseClient, effectiveConvId);
    const preparedSql = buildPreparedSql(question, companyId);
    const sql = preparedSql?.sql ?? await generateSql({ apiKey, question, companyId, history });
    const validation = validateSql(sql, companyId);

    if (!validation.ok || !validation.sql) {
      const explanation = buildBlockedQueryExplanation(validation.warning);
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

async function persistAssistantFeedback(
  supabaseClient: any,
  params: {
    conversationId: string;
    companyId: string;
    userId: string;
    rating: "positive" | "negative";
    comment: string | null;
  },
) {
  const { data: message, error: readError } = await supabaseClient
    .from("ai_chat_messages")
    .select("id, metadata")
    .eq("conversation_id", params.conversationId)
    .eq("company_id", params.companyId)
    .eq("user_id", params.userId)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;
  if (!message?.id) throw new Error("No se encontro mensaje del asistente para registrar feedback.");

  const metadata = typeof message.metadata === "object" && message.metadata ? message.metadata : {};
  const { error: updateError } = await supabaseClient
    .from("ai_chat_messages")
    .update({
      metadata: {
        ...metadata,
        feedback: {
          rating: params.rating,
          comment: params.comment,
          submitted_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", message.id)
    .eq("user_id", params.userId);

  if (updateError) throw updateError;
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

  if (hasAny(q, ["listado", "listar", "detalle"]) && hasAll(q, ["empleado", "activo"])) {
    return {
      intent: "active_employees_detail",
      sourceSummary: "Fuente: employees_v2, employee_work_info, operation_centers y areas. Filtro: empresa actual, empleados activos e informacion laboral vigente.",
      suggestedQuestions: [
        "Empleados activos por centro de operacion",
        "Empleados activos por area",
        "Empleados activos por cargo",
      ],
      sql: `
SELECT
  CONCAT(e.first_name, ' ', e.last_name) AS empleado,
  e.document_number AS documento,
  COALESCE(oc.name, 'Sin centro') AS centro_operacion,
  COALESCE(a.name, 'Sin area') AS area,
  COALESCE(w.position_name, 'Sin cargo') AS cargo_actual
FROM employees_v2 e
LEFT JOIN employee_work_info w
  ON w.employee_id = e.id
  AND w.company_id = '${companyId}'
  AND w.is_current = true
LEFT JOIN operation_centers oc
  ON oc.id = w.operation_center_id
  AND oc.company_id = '${companyId}'
LEFT JOIN areas a
  ON a.id = w.area_id
  AND a.company_id = '${companyId}'
WHERE e.company_id = '${companyId}'
  AND e.is_active = true
ORDER BY empleado ASC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAll(q, ["vacante", "abierta", "candidato", "etapa"])) {
    return {
      intent: "vacancies_open_candidates_by_stage",
      sourceSummary: "Fuente: vacancies y candidates. Filtro: empresa actual y vacantes en estado open/in_process/pending_placed. Etapa: candidates.current_step.",
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
  AND v.status IN ('open', 'in_process', 'pending_placed')
GROUP BY v.position_title, COALESCE(ca.current_step::text, 'sin_etapa')
ORDER BY v.position_title ASC, cantidad_candidatos DESC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["vacante", "vacantes"]) && hasAny(q, ["abierta", "abiertas"]) && hasAny(q, ["centro", "operacion", "operación"])) {
    return {
      intent: "open_vacancies_by_operation_center",
      sourceSummary: "Fuente: vacancies y operation_centers. Filtro: empresa actual y vacantes open/in_process/pending_placed.",
      suggestedQuestions: [
        "Vacantes abiertas y candidatos por etapa",
        "Vacantes abiertas por mas de 30 dias",
        "Candidatos seleccionados por vacante",
      ],
      sql: `
SELECT
  COALESCE(oc.name, 'Sin centro') AS centro_operacion,
  COUNT(v.id)::int AS vacantes_abiertas,
  SUM(v.positions_count)::int AS cupos_requeridos
FROM vacancies v
LEFT JOIN operation_centers oc
  ON oc.id = v.operation_center_id
  AND oc.company_id = '${companyId}'
WHERE v.company_id = '${companyId}'
  AND v.status IN ('open', 'in_process', 'pending_placed')
GROUP BY COALESCE(oc.name, 'Sin centro')
ORDER BY vacantes_abiertas DESC, cupos_requeridos DESC
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

  if (hasAny(q, ["capacitacion", "capacitaciones", "curso", "cursos"]) && hasAny(q, ["tomados", "tomadas", "mas", "ranking"])) {
    return {
      intent: "most_completed_training_courses",
      sourceSummary: "Fuente: training_courses y training_completions. Filtro: empresa actual; ranking por completados.",
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
LIMIT 10`,
    };
  }

  if (hasAny(q, ["rotacion", "retiros"]) && hasAny(q, ["mensual", "mes", "meses", "comparar", "comparativo"])) {
    return {
      intent: "monthly_turnover_approximation",
      sourceSummary: "Fuente: employee_terminations y employees_v2. Filtro: empresa actual; tasa aproximada con retiros completados sobre empleados activos actuales mas retiros del mes.",
      suggestedQuestions: [
        "Retiros completados por tipo",
        "Retiros completados por mes",
        "Top centros con mas retiros completados",
      ],
      sql: `
WITH monthly_terminations AS (
  SELECT
    date_trunc('month', et.effective_date)::date AS mes,
    COUNT(*)::int AS retiros
  FROM employee_terminations et
  WHERE et.company_id = '${companyId}'
    AND et.is_completed = true
    AND et.effective_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
  GROUP BY date_trunc('month', et.effective_date)::date
),
active_headcount AS (
  SELECT COUNT(*)::numeric AS empleados_activos
  FROM employees_v2 e
  WHERE e.company_id = '${companyId}'
    AND e.is_active = true
)
SELECT
  mt.mes,
  mt.retiros,
  ah.empleados_activos::int AS empleados_activos_actuales,
  ROUND((mt.retiros::numeric / NULLIF(ah.empleados_activos + mt.retiros, 0)) * 100, 2) AS tasa_rotacion_aproximada
FROM monthly_terminations mt
CROSS JOIN active_headcount ah
ORDER BY mt.mes DESC
LIMIT 12`,
    };
  }

  if (hasAny(q, ["incapacidad", "incapacidades", "ausentismo"]) && hasAny(q, ["diagnostico", "diagnóstico", "centro"])) {
    return {
      intent: "incapacities_by_diagnosis_center",
      sourceSummary: "Fuente: employee_incapacities, employees_v2, employee_work_info y operation_centers. Filtro: empresa actual e incapacidades registradas.",
      suggestedQuestions: [
        "Incapacidades por origen",
        "Dias de incapacidad por centro",
        "Incapacidades con reintegro requerido",
      ],
      sql: `
SELECT
  COALESCE(oc.name, 'Sin centro') AS centro_operacion,
  ei.diagnosis AS diagnostico,
  COUNT(*)::int AS incapacidades,
  SUM(ei.total_days)::int AS dias_totales
FROM employee_incapacities ei
JOIN employees_v2 e
  ON e.id = ei.employee_id
  AND e.company_id = '${companyId}'
LEFT JOIN employee_work_info w
  ON w.employee_id = e.id
  AND w.company_id = '${companyId}'
  AND w.is_current = true
LEFT JOIN operation_centers oc
  ON oc.id = w.operation_center_id
  AND oc.company_id = '${companyId}'
WHERE ei.company_id = '${companyId}'
GROUP BY COALESCE(oc.name, 'Sin centro'), ei.diagnosis
ORDER BY dias_totales DESC, incapacidades DESC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["contrato", "contratos"]) && hasAny(q, ["vencido", "vencidos"])) {
    return {
      intent: "expired_active_contracts",
      sourceSummary: "Fuente: contracts y employees_v2. Filtro: empresa actual, contratos no terminados con fecha final anterior a hoy.",
      suggestedQuestions: [
        "Contratos que vencen en los proximos 30 dias",
        "Contratos vigentes por tipo",
        "Contratos pendientes por aprobar",
      ],
      sql: `
SELECT
  CONCAT(e.first_name, ' ', e.last_name) AS empleado,
  c.contract_type AS tipo_contrato,
  c.start_date AS fecha_inicio,
  c.end_date AS fecha_fin,
  (CURRENT_DATE - c.end_date)::int AS dias_vencido
FROM contracts c
JOIN employees_v2 e
  ON e.id = c.employee_id
  AND e.company_id = '${companyId}'
WHERE c.company_id = '${companyId}'
  AND COALESCE(c.is_terminated, false) = false
  AND c.end_date IS NOT NULL
  AND c.end_date < CURRENT_DATE
ORDER BY c.end_date ASC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["dotacion", "dotaciones"]) && hasAny(q, ["vencida", "vencidas", "vencido", "vencidos", "proxima", "proximas", "proximo", "proximos"])) {
    return {
      intent: "dotation_expiring_or_expired",
      sourceSummary: "Fuente: dotation_deliveries y employees_v2. Filtro: empresa actual, dotaciones vencidas o con vencimiento en los proximos 30 dias.",
      suggestedQuestions: [
        "Dotaciones vencidas por empleado",
        "Dotaciones proximas a vencer por tipo",
        "Entregas de dotacion por centro",
      ],
      sql: `
SELECT
  CONCAT(e.first_name, ' ', e.last_name) AS empleado,
  dd.item_name AS elemento,
  dd.item_type::text AS tipo_elemento,
  dd.delivery_date AS fecha_entrega,
  dd.expiration_date AS fecha_vencimiento,
  CASE WHEN dd.expiration_date < CURRENT_DATE THEN 'vencida' ELSE 'proxima_a_vencer' END AS estado
FROM dotation_deliveries dd
JOIN employees_v2 e
  ON e.id = dd.employee_id
  AND e.company_id = '${companyId}'
WHERE dd.company_id = '${companyId}'
  AND dd.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY dd.expiration_date ASC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["documento", "documentos"]) && hasAny(q, ["vencido", "vencidos", "vencida", "vencidas", "faltante", "faltantes"])) {
    return {
      intent: "employee_documents_expired_or_invalid",
      sourceSummary: "Fuente: employee_documents y employees_v2. Filtro: empresa actual, documentos vencidos o marcados como no validos.",
      suggestedQuestions: [
        "Documentos vencidos por empleado",
        "Documentos no validos por tipo",
        "Documentos proximos a vencer",
      ],
      sql: `
SELECT
  CONCAT(e.first_name, ' ', e.last_name) AS empleado,
  ed.document_type::text AS tipo_documento,
  COALESCE(ed.document_name, ed.file_name, 'Sin nombre') AS documento,
  ed.expiry_date AS fecha_vencimiento,
  ed.is_valid AS valido
FROM employee_documents ed
JOIN employees_v2 e
  ON e.id = ed.employee_id
  AND e.company_id = '${companyId}'
WHERE ed.company_id = '${companyId}'
  AND (ed.is_valid = false OR (ed.expiry_date IS NOT NULL AND ed.expiry_date < CURRENT_DATE))
ORDER BY ed.expiry_date ASC NULLS LAST
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["examen", "examenes", "médico", "medico", "medicos"]) && hasAny(q, ["vencen", "vencer", "vencido", "vencidos", "proximo", "proximos"])) {
    return {
      intent: "medical_exams_expiring",
      sourceSummary: "Fuente: medical_exams, employees_v2, employee_work_info y operation_centers. Filtro: empresa actual, examenes con vencimiento en los proximos 30 dias o vencidos.",
      suggestedQuestions: [
        "Examenes medicos vencidos por centro",
        "Examenes medicos proximos a vencer",
        "Conceptos medicos por resultado",
      ],
      sql: `
SELECT
  COALESCE(oc.name, 'Sin centro') AS centro_operacion,
  CONCAT(e.first_name, ' ', e.last_name) AS empleado,
  me.exam_type::text AS tipo_examen,
  me.expiration_date AS fecha_vencimiento,
  me.result::text AS resultado
FROM medical_exams me
JOIN employees_v2 e
  ON e.id = me.employee_id
  AND e.company_id = '${companyId}'
LEFT JOIN employee_work_info w
  ON w.employee_id = e.id
  AND w.company_id = '${companyId}'
  AND w.is_current = true
LEFT JOIN operation_centers oc
  ON oc.id = w.operation_center_id
  AND oc.company_id = '${companyId}'
WHERE me.company_id = '${companyId}'
  AND me.expiration_date IS NOT NULL
  AND me.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY me.expiration_date ASC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["requisicion", "requisiciones"]) && hasAny(q, ["pendiente", "pendientes", "estado", "aprobacion", "aprobación"])) {
    return {
      intent: "requisitions_by_status",
      sourceSummary: "Fuente: personnel_requisitions y operation_centers. Filtro: empresa actual; agrupa requisiciones por estado y centro.",
      suggestedQuestions: [
        "Requisiciones pendientes de aprobacion por centro",
        "Requisiciones aprobadas este mes",
        "Requisiciones por cargo solicitado",
      ],
      sql: `
SELECT
  COALESCE(oc.name, 'Sin centro') AS centro_operacion,
  pr.estado_requisicion::text AS estado,
  COUNT(*)::int AS requisiciones
FROM personnel_requisitions pr
LEFT JOIN operation_centers oc
  ON oc.id = pr.operation_center_id
  AND oc.company_id = '${companyId}'
WHERE pr.company_id = '${companyId}'
GROUP BY COALESCE(oc.name, 'Sin centro'), pr.estado_requisicion::text
ORDER BY requisiciones DESC, centro_operacion ASC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["vacante", "vacantes"]) && hasAny(q, ["dias", "antigua", "antiguas", "abierta", "abiertas"])) {
    return {
      intent: "open_vacancies_age_ranking",
      sourceSummary: "Fuente: vacancies y operation_centers. Filtro: empresa actual y vacantes open/in_process/pending_placed; calcula dias abiertas.",
      suggestedQuestions: [
        "Vacantes abiertas y candidatos por etapa",
        "Vacantes abiertas por centro de operacion",
        "Vacantes abiertas por mas de 30 dias",
      ],
      sql: `
SELECT
  v.position_title AS vacante,
  COALESCE(oc.name, 'Sin centro') AS centro_operacion,
  v.status::text AS estado,
  v.open_date AS fecha_apertura,
  (CURRENT_DATE - v.open_date)::int AS dias_abierta
FROM vacancies v
LEFT JOIN operation_centers oc
  ON oc.id = v.operation_center_id
  AND oc.company_id = '${companyId}'
WHERE v.company_id = '${companyId}'
  AND v.status IN ('open', 'in_process', 'pending_placed')
ORDER BY dias_abierta DESC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["salario", "salarios", "nomina", "nómina", "costo"]) && hasAny(q, ["centro", "operacion", "operación"])) {
    return {
      intent: "salary_cost_by_operation_center",
      sourceSummary: "Fuente: contracts, employees_v2, employee_work_info y operation_centers. Filtro: empresa actual, empleados activos y contratos no terminados.",
      suggestedQuestions: [
        "Costo total de salarios base por centro de operacion",
        "Salario promedio por cargo",
        "Contratos vigentes por tipo",
      ],
      sql: `
SELECT
  COALESCE(oc.name, 'Sin centro') AS centro_operacion,
  COUNT(DISTINCT e.id)::int AS empleados,
  SUM(c.salary)::numeric AS salario_base_total,
  ROUND(AVG(c.salary)::numeric, 2) AS salario_base_promedio
FROM contracts c
JOIN employees_v2 e
  ON e.id = c.employee_id
  AND e.company_id = '${companyId}'
  AND e.is_active = true
LEFT JOIN employee_work_info w
  ON w.employee_id = e.id
  AND w.company_id = '${companyId}'
  AND w.is_current = true
LEFT JOIN operation_centers oc
  ON oc.id = w.operation_center_id
  AND oc.company_id = '${companyId}'
WHERE c.company_id = '${companyId}'
  AND COALESCE(c.is_terminated, false) = false
GROUP BY COALESCE(oc.name, 'Sin centro')
ORDER BY salario_base_total DESC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["salario", "salarios", "salarial"]) && hasAny(q, ["hombres", "mujeres", "genero", "género", "sexo"])) {
    return {
      intent: "salary_average_by_gender",
      sourceSummary: "Fuente: contracts y employees_v2. Filtro: empresa actual, empleados activos y contratos no terminados; genero segun employees_v2.gender.",
      suggestedQuestions: [
        "Promedio salarial comparando hombres vs mujeres",
        "Costo total de salarios base por centro de operacion",
        "Salario promedio por cargo",
      ],
      sql: `
SELECT
  COALESCE(e.gender::text, 'sin_genero') AS genero,
  COUNT(DISTINCT e.id)::int AS empleados,
  ROUND(AVG(c.salary)::numeric, 2) AS salario_promedio,
  MIN(c.salary)::numeric AS salario_minimo,
  MAX(c.salary)::numeric AS salario_maximo
FROM contracts c
JOIN employees_v2 e
  ON e.id = c.employee_id
  AND e.company_id = '${companyId}'
  AND e.is_active = true
WHERE c.company_id = '${companyId}'
  AND COALESCE(c.is_terminated, false) = false
GROUP BY COALESCE(e.gender::text, 'sin_genero')
ORDER BY salario_promedio DESC
LIMIT ${DEFAULT_RESULT_LIMIT}`,
    };
  }

  if (hasAny(q, ["desempeno", "desempeño", "evaluacion", "evaluaciones"]) && hasAny(q, ["cargo", "ranking", "promedio", "mejor"])) {
    return {
      intent: "performance_score_by_position",
      sourceSummary: "Fuente: performance_evaluations, employees_v2 y employee_work_info. Filtro: empresa actual y evaluaciones con puntaje general.",
      suggestedQuestions: [
        "Ranking de cargos por desempeno promedio",
        "Evaluaciones pendientes por estado",
        "Promedio de desempeno por centro",
      ],
      sql: `
SELECT
  COALESCE(w.position_name, 'Sin cargo') AS cargo,
  COUNT(pe.id)::int AS evaluaciones,
  ROUND(AVG(pe.overall_score)::numeric, 2) AS desempeno_promedio
FROM performance_evaluations pe
JOIN employees_v2 e
  ON e.id = pe.employee_id
  AND e.company_id = '${companyId}'
LEFT JOIN employee_work_info w
  ON w.employee_id = e.id
  AND w.company_id = '${companyId}'
  AND w.is_current = true
WHERE pe.company_id = '${companyId}'
  AND pe.overall_score IS NOT NULL
GROUP BY COALESCE(w.position_name, 'Sin cargo')
ORDER BY desempeno_promedio DESC, evaluaciones DESC
LIMIT 5`,
    };
  }

  if (hasAny(q, ["vacaciones", "permiso", "permisos"]) && hasAny(q, ["actualmente", "curso", "hoy"])) {
    return {
      intent: "employees_currently_absent",
      sourceSummary: "Fuente: vacation_requests, leave_requests y employees_v2. Filtro: empresa actual, solicitudes aprobadas/en curso que cubren la fecha actual.",
      suggestedQuestions: [
        "Empleados actualmente en vacaciones o permiso",
        "Permisos aprobados por tipo",
        "Vacaciones en curso por centro",
      ],
      sql: `
WITH current_vacations AS (
  SELECT
    vr.company_id,
    vr.employee_id,
    'vacaciones' AS tipo_ausencia,
    vr.status::text AS estado,
    vr.start_date,
    vr.end_date
  FROM vacation_requests vr
  WHERE vr.company_id = '${companyId}'
    AND vr.status IN ('aprobado', 'en_curso')
    AND CURRENT_DATE BETWEEN vr.start_date AND vr.end_date
),
current_leaves AS (
  SELECT
    lr.company_id,
    lr.employee_id,
    lr.leave_type::text AS tipo_ausencia,
    lr.status::text AS estado,
    lr.start_date,
    lr.end_date
  FROM leave_requests lr
  WHERE lr.company_id = '${companyId}'
    AND lr.status = 'aprobado'
    AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
)
SELECT
  CONCAT(e.first_name, ' ', e.last_name) AS empleado,
  absences.tipo_ausencia,
  absences.estado,
  absences.start_date AS fecha_inicio,
  absences.end_date AS fecha_fin
FROM (
  SELECT * FROM current_vacations
  UNION ALL
  SELECT * FROM current_leaves
) absences
JOIN employees_v2 e
  ON e.id = absences.employee_id
  AND e.company_id = '${companyId}'
ORDER BY absences.end_date ASC
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

function buildClarificationResponse(question: string): ClarificationResponse | null {
  const q = normalizeQuestion(question);
  const hasDomain = hasAny(q, [
    "empleado",
    "contrato",
    "vacante",
    "candidato",
    "retiro",
    "incapacidad",
    "ausentismo",
    "dotacion",
    "capacitacion",
    "documento",
    "examen",
    "requisicion",
    "nomina",
    "salario",
    "evaluacion",
  ]);

  if (!hasDomain && hasAny(q, ["vencido", "vencidos", "vencen", "pendiente", "pendientes", "proximo", "proximos", "estado"])) {
    const suggestedQuestions = [
      "Contratos vencidos no terminados",
      "Documentos vencidos por empleado",
      "Dotaciones proximas a vencer",
    ];
    return {
      explanation: "Necesito acotar un poco la consulta para no mezclar metricas. ¿Te refieres a contratos, documentos, dotacion, examenes, capacitaciones o requisiciones?",
      speechText: "Necesito acotar la consulta. ¿Te refieres a contratos, documentos, dotacion, examenes o capacitaciones?",
      suggestedQuestions,
    };
  }

  if (q.length < 10 && hasAny(q, ["cuantos", "mostrar", "muestrame", "listar", "total"])) {
    return {
      explanation: "La pregunta esta muy abierta. Indica el modulo y la metrica que quieres revisar, por ejemplo empleados activos, contratos por vencer o vacantes abiertas.",
      speechText: "La pregunta esta muy abierta. Indica el modulo y la metrica que quieres revisar.",
      suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
    };
  }

  return null;
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

- Vacantes abiertas: vacancies.status IN ('open', 'in_process', 'pending_placed').
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

  const columnWarning = validateReferencedColumns(sql);
  if (columnWarning) return { ok: false, warning: columnWarning };

  sql = enforceLimit(sql);
  return { ok: true, sql, tables: Array.from(new Set(tables)) };
}

function validateReferencedColumns(sql: string) {
  const aliasMap = extractTableAliases(sql);
  const re = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql)) !== null) {
    const alias = match[1].toLowerCase();
    const column = match[2].toLowerCase();
    const table = aliasMap.get(alias);
    if (!table) continue;
    const columns = COLUMN_SCHEMA[table];
    if (columns && !columns.has(column)) {
      return `La consulta referencia una columna no reconocida: ${alias}.${column} en ${table}.`;
    }
  }
  return null;
}

function extractTableAliases(sql: string) {
  const aliasMap = new Map<string, string>();
  const cteNames = extractCteNames(sql);
  const reserved = new Set(["on", "where", "left", "right", "inner", "full", "cross", "join", "group", "order", "limit"]);
  const re = /\b(?:from|join)\s+((?:public\.)?(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*))(?:\s+(?:as\s+)?([a-zA-Z_][a-zA-Z0-9_]*))?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql)) !== null) {
    const table = match[1].replace(/^public\./i, "").replace(/"/g, "").toLowerCase();
    if (cteNames.has(table)) continue;
    const alias = (match[2] || table).toLowerCase();
    if (!reserved.has(alias)) aliasMap.set(alias, table);
    aliasMap.set(table, table);
  }
  return aliasMap;
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
