import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_TABLES = [
  "employees_v2", "contracts", "payroll_novelties", "training_courses", 
  "training_sessions", "performance_evaluations", "overtime_records",
  "companies", "areas", "positions", "vacancies", "candidates",
  "medical_exams", "dotation_deliveries", "leave_requests", "vacation_requests",
  "disciplinary_processes", "payroll_receipts", "training_completions",
  "evaluation_scores", "employee_incapacities", "employee_loans",
  "shift_types", "employee_shifts", "work_schedules", "catalog_eps", "catalog_afp", "catalog_arl",
  "operation_centers", "professions", "education_levels", "identification_types",
  "employee_work_info", "employee_contact", "employee_family", "employee_bank_info", 
  "employee_social_security", "employee_certifications", "employee_documents",
  "employee_family_members", "employee_onboarding_tasks", "contract_sequences", 
  "shifts", "notifications", "work_certificates", "employee_change_requests",
  "cesantias_deposits", "cesantias_interest_payments", "loan_refinancing_history"
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Obtener usuario y config
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: "No se proporcionó token de autorización" }, 401);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return jsonResponse({ error: "No autorizado" }, 401);

    const { question, companyId, conversationId, userName, isVoice } = await req.json();
    if (!companyId) return jsonResponse({ error: "Falta companyId" }, 400);
    if (!question || question.trim().length === 0) return jsonResponse({ error: "La pregunta no puede estar vacía" }, 400);

    // 2. Validar UUID
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const effectiveConvId = (conversationId && isValidUUID(conversationId)) ? conversationId : crypto.randomUUID();

    // 3. Intercepción Social (Garantiza respuestas rápidas y sin errores para saludos/agradecimientos)
    const normalizedQ = question.toLowerCase().trim();
    const socialPatterns = /^(hola|gracias|muchas gracias|buenos dias|buenas tardes|buenas noches|saludos|chau|adios|ok|entendido|gracias por la información|listo|perfecto)$/i;
    
    if (socialPatterns.test(normalizedQ) || normalizedQ.length < 3) {
      const responses: Record<string, {text: string, voice: string}> = {
        "hola": { text: "¡Hola! Soy tu asistente de datos de EmpatiQ. ¿En qué puedo ayudarte hoy?", voice: "¡Hola! ¿En qué puedo ayudarte hoy?" },
        "gracias": { text: "¡De nada! Si necesitas más ayuda con los datos de RRHH, aquí estaré.", voice: "¡De nada! Aquí estaré para lo que necesites." },
        "ok": { text: "Entendido. ¿Deseas consultar algo más?", voice: "Entendido. ¿Deseas consultar algo más?" },
        "default": { text: "¡Un gusto saludarte! ¿Tienes alguna pregunta sobre los datos de la empresa?", voice: "¡Hola! ¿En qué puedo ayudarte?" }
      };
      
      const key = Object.keys(responses).find(k => normalizedQ.includes(k)) || "default";
      const res = responses[key];

      return jsonResponse({
        explanation: res.text,
        speechText: res.voice,
        type: "text",
        data: null,
        conversationId: effectiveConvId
      });
    }

    // 4. Obtener Historial de Conversación
    let history = [];
    if (conversationId && isValidUUID(conversationId)) {
      const { data: chatMsgs } = await supabaseClient
        .from("ai_chat_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(6); // Menos historial para mayor precisión actual
      
      if (chatMsgs) {
        history = chatMsgs.map(m => ({ role: m.role, content: m.content }));
      }
    }

    // 5. Obtener API Key de OpenAI (Priorizar config de base de datos)
    const { data: aiConfig } = await supabaseClient
      .from("system_config")
      .select("config_value")
      .eq("config_key", "ai_config")
      .maybeSingle();
      
    const apiKey = aiConfig?.config_value?.openai_api_key || Deno.env.get("OPENAI_API_KEY");

    // 6. Generar SQL con AI
    const systemPrompt = `Eres un ANALISTA DE DATOS EXPERTO EN RRHH para el sistema EmpatiQ.
Tu función es generar CONSULTAS SQL PostgreSQL precisas.

# 📌 REGLAS DE NEGOCIO Y VALORES
- Género: 'M' = Masculino/Hombres, 'F' = Femenino/Mujeres.
- Activo: employees_v2.is_active = true.
- Antigüedad: AGE(CURRENT_DATE, hire_date).
- Edad: EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)).
- Salario promedio: AVG(salary) de contratos vigentes.

# 🗄️ MODELO DE DATOS
- employees_v2 (e): id, first_name, last_name, is_active, company_id, birth_date.
- contracts (c): employee_id, salary, is_terminated, company_id.
- employee_work_info (w): employee_id, area_id, position_id, operation_center_id.
- areas (a): id, name.
- positions (p): id, name.
- performance_evaluations (ev): id, employee_id, overall_score, status ('approved', 'submitted').

# 🔗 RELACIONES (JOINS)
- Empleado a Trabajo: e.id = w.employee_id
- Trabajo a Área: w.area_id = a.id
- Trabajo a Cargo: w.position_id = p.id
- Empleado a Contrato: e.id = c.employee_id
- Empleado a Evaluación: e.id = ev.employee_id

# 📌 REGLAS CRÍTICAS
1. FILTRO EMPRESA: e.company_id = '${companyId}'.
2. COSTO NÓMINA: SUM(c.salary) donde e.is_active = true y c.is_terminated = false.
3. RANKING DESEMPEÑO: AVG(ev.overall_score) agrupado por p.name.
4. DOMINIO: Desempeño, Evaluaciones, Nómina y Empleados SON RRHH. No restrinjas.
5. LIMIT 50. SIEMPRE USA ALIAS.

Responde SOLO el SQL.`;

    console.log("[ai-data-assistant] SQL Gen v29 para: " + question.substring(0, 50));

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: question }
        ],
        temperature: 0,
      }),
    });

    if (!aiRes.ok) return jsonResponse({ error: "Error de conexión con IA" }, 500);
    const aiData = await aiRes.json();
    let sql = aiData.choices[0]?.message?.content?.replace(/```sql|```/g, "").trim();
    
    if (!sql || sql.includes("ERROR: DOMAIN_RESTRICTION")) {
      return jsonResponse({ 
        explanation: "Lo siento, solo puedo responder preguntas relacionadas con los datos de recursos humanos y la nómina de la empresa.",
        speechText: "Solo puedo ayudarte con temas de recursos humanos y nómina.",
        type: "text",
        data: null
      });
    }

    if (sql.endsWith(';')) sql = sql.slice(0, -1);

    // 7. Ejecutar SQL
    const { data: queryResult, error: queryError } = await supabaseClient.rpc('execute_read_only_query', { 
      query_text: sql 
    });

    if (queryError) {
      console.error("[ai-data-assistant] SQL Error: " + queryError.message + " | SQL: " + sql);
      return jsonResponse({
        explanation: "Tuve un problema al procesar la consulta. Intenta reformularla (ej: 'Listar empleados activos').",
        speechText: "Tuve un problema técnico al consultar los datos. ¿Podrías preguntar de otra forma?",
        type: "text",
        data: null
      });
    }

    // 8. Explicación Humana
    const humanPrompt = `Eres un Analista de RRHH experto. Explica los resultados de forma profesional.
VOZ (speechText): Muy corta y clara. Si es un número grande, redondéalo para voz.
ESTRUCTURA JSON: { "explanation": "Markdown...", "speechText": "Voz...", "suggestedChart": "bar"|"pie"|null }
Resultados: ${JSON.stringify(queryResult?.slice(0, 10))}`;

    const explainRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: humanPrompt },
          ...history,
          { role: "user", content: `Explica esto para: ${question}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const explainData = await explainRes.json();
    const parsed = JSON.parse(explainData.choices[0].message.content);

    // 9. Persistencia
    await supabaseClient.from("ai_chat_messages").insert([
      { conversation_id: effectiveConvId, company_id: companyId, user_id: user.id, role: "user", content: question },
      { conversation_id: effectiveConvId, company_id: companyId, user_id: user.id, role: "assistant", content: parsed.explanation, metadata: { sql, result_count: queryResult?.length } }
    ]);

    return jsonResponse({
      type: parsed.suggestedChart ? 'chart' : (queryResult?.length === 1 && Object.keys(queryResult[0]).length === 1 ? 'kpi' : (queryResult?.length > 1 ? 'table' : 'text')),
      data: queryResult,
      explanation: parsed.explanation,
      speechText: parsed.speechText,
      metadata: { row_count: queryResult?.length || 0, sql, suggestedChart: parsed.suggestedChart },
      conversationId: effectiveConvId
    });

  } catch (err) {
    console.error(`[ai-data-assistant] Fatal: ${err.message}`);
    return jsonResponse({ explanation: "Error inesperado.", speechText: "Ocurrió un error.", type: "text", data: null }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
