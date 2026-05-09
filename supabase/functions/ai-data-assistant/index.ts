import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_TABLES = [
  "employees_v2", "contracts", "payroll_novelties", "training_courses", 
  "training_sessions", "performance_evaluations", "overtime_records",
  "companies", "areas", "positions", "vacancies", "candidates",
  "medical_exams", "dotation_deliveries", "leave_requests", "vacation_requests",
  "disciplinary_processes", "payroll_receipts", "training_completions",
  "evaluation_scores", "employee_incapacities", "employee_loans",
  "shift_types", "employee_shifts", "work_schedules", "catalog_eps", "catalog_afp", "catalog_arl"
];

const FORBIDDEN_COLS = ["password", "token", "key", "secret", "auth", "credential"];

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

    const { question, companyId, conversationId, userName } = await req.json();
    if (!companyId) return jsonResponse({ error: "Falta companyId" }, 400);
    if (!question || question.trim().length === 0) return jsonResponse({ error: "La pregunta no puede estar vacía" }, 400);

    // Verificar si es super admin
    const { data: superAdmin } = await supabaseClient.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle();

    // 2. Verificar permiso (si no es super admin)
    if (!superAdmin) {
      const { data: prefs } = await supabaseClient.from("user_preferences").select("ai_data_assistant_enabled").eq("user_id", user.id).maybeSingle();
      if (!prefs?.ai_data_assistant_enabled) {
        return jsonResponse({ error: "No tienes permiso para usar el Asistente de Datos. Solicita acceso a un administrador." }, 403);
      }
    }

    // 3. Obtener API Key
    const { data: aiConfig } = await supabaseClient.from("system_config").select("config_value").eq("config_key", "ai_config").maybeSingle();
    const apiKey = aiConfig?.config_value?.openai_api_key || Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      console.error("[ai-data-assistant] No se encontró API Key de OpenAI en system_config ni en variables de entorno");
      return jsonResponse({ error: "IA no configurada. Falta la API Key de OpenAI en la configuración del sistema." }, 500);
    }

    // 4. Generar SQL con AI
    const systemPrompt = `Eres un experto en PostgreSQL para un sistema de RRHH multi-tenant (KRH).
Genera EXCLUSIVAMENTE una consulta SQL SELECT que responda la pregunta del usuario.

ESQUEMA DE TABLAS CLAVE:
- employees_v2: (id, first_name, last_name, is_active (boolean), company_id)
- contracts: (id, employee_id, salary, start_date, is_terminated (boolean), company_id)
- training_courses: (id, name, description, category, company_id)
- vacancies: (id, title, status, company_id)
- vacation_requests: (id, employee_id, status ('pending', 'approved', 'rejected'), company_id)

REGLAS:
1. SOLO usa estas tablas: ${ALLOWED_TABLES.join(", ")}.
2. Siempre filtra por company_id = '${companyId}'.
3. Sé flexible: Responde cualquier pregunta sobre empleados, nómina, contratos, capacitaciones (training_courses), vacantes, dotación, ausentismos y evaluaciones.
4. SOLO responde "ERROR: DOMAIN_RESTRICTION" si te preguntan algo totalmente ajeno como clima, noticias mundiales o recetas.
5. Para empleados ACTIVOS, usa "is_active = true". NO uses "status = 'active'".
6. Para contratos VIGENTES, usa "is_terminated = false".
7. Devuelve SOLO el código SQL, sin explicaciones ni markdown.
8. Limita los resultados a 100 filas (LIMIT 100).
9. Si necesitas unir tablas, usa JOIN.

Pregunta del usuario: ${question}`;

    console.log(`[ai-data-assistant] Generando SQL para: "${question.substring(0, 80)}..."`);

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
        temperature: 0,
      }),
    });

    // Validar respuesta de OpenAI
    if (!aiRes.ok) {
      const errorBody = await aiRes.text();
      console.error(`[ai-data-assistant] Error de OpenAI (SQL): ${aiRes.status} - ${errorBody}`);
      
      if (aiRes.status === 401) {
        return jsonResponse({ error: "La API Key de OpenAI es inválida o ha expirado. Actualízala en Configuración > IA." }, 500);
      }
      if (aiRes.status === 429) {
        return jsonResponse({ error: "Se ha excedido el límite de solicitudes de OpenAI. Intenta de nuevo en unos minutos." }, 429);
      }
      if (aiRes.status === 402 || errorBody.includes("insufficient_quota")) {
        return jsonResponse({ error: "La cuenta de OpenAI no tiene saldo suficiente. Recarga tu plan en platform.openai.com." }, 402);
      }
      return jsonResponse({ error: `Error del proveedor de IA (${aiRes.status}). Revisa la configuración.` }, 500);
    }

    const aiData = await aiRes.json();
    
    if (!aiData?.choices?.length || !aiData.choices[0]?.message?.content) {
      console.error("[ai-data-assistant] Respuesta inesperada de OpenAI:", JSON.stringify(aiData).substring(0, 500));
      return jsonResponse({ error: "La IA no generó una respuesta válida. Intenta reformular tu pregunta." }, 500);
    }

    // 5. Validar SQL (Seguridad)
    let sql = aiData.choices[0].message.content.replace(/```sql|```/g, "").trim();
    
    // Limpiar punto y coma al final (causa error en subconsultas RPC)
    if (sql.endsWith(';')) {
      sql = sql.slice(0, -1);
    }

    if (sql.includes("DOMAIN_RESTRICTION")) {
      return jsonResponse({ error: "Lo siento, solo puedo responder preguntas sobre datos operativos de RRHH (empleados, nómina, contratos, capacitaciones, etc.)." }, 400);
    }

    const upperSQL = sql.toUpperCase();
    
    const forbiddenPatterns = [
      /\bINSERT\b/, /\bUPDATE\b/, /\bDELETE\b/, /\bDROP\b/, /\bTRUNCATE\b/, 
      /\bCREATE\b/, /\bALTER\b/, /\bGRANT\b/, /\bREVOKE\b/
    ];
    
    if (forbiddenPatterns.some(regex => regex.test(upperSQL))) {
      const match = forbiddenPatterns.find(regex => regex.test(upperSQL));
      return jsonResponse({ error: `Operación no permitida: ${match?.source}` }, 400);
    }

    if (!upperSQL.includes("SELECT")) return jsonResponse({ error: "Solo se permiten consultas de lectura (SELECT)." }, 400);
    if (!upperSQL.includes(companyId.toUpperCase())) return jsonResponse({ error: "Seguridad: Filtro de empresa faltante en la consulta." }, 400);
    
    if (FORBIDDEN_COLS.some(col => upperSQL.includes(col.toUpperCase()))) {
      return jsonResponse({ error: "Seguridad: Acceso a columnas sensibles denegado." }, 400);
    }

    console.log(`[ai-data-assistant] SQL generado: ${sql.substring(0, 200)}`);

    // 6. Ejecutar SQL
    const { data: queryResult, error: queryError } = await supabaseClient.rpc('execute_read_only_query', { 
      query_text: sql 
    });

    if (queryError) {
      console.error(`[ai-data-assistant] Error en BD: ${queryError.message}`);
      return jsonResponse({ error: `Error en consulta de base de datos: ${queryError.message}`, sql }, 400);
    }

    // 7. Generar Explicación Humanizada
    const personName = userName || "Usuario";
    const humanPrompt = `Eres un asistente de datos de RRHH amable, agradable y muy humano.
Tu objetivo es explicar los resultados de una consulta de datos al usuario de forma cercana.

REGLAS DE PERSONALIDAD:
1. SALUDO OBLIGATORIO: Siempre comienza con "¡Hola ${personName}! 👋" (o un saludo similar muy amable).
2. TONO: No respondas como un robot. Usa un lenguaje natural, profesional pero cálido.
3. FORMATO: Usa Markdown para mejorar la legibilidad (negritas, listas, saltos de línea).
4. EMOJIS: Usa emojis pertinentes para que la respuesta se sienta viva.
5. VISUALIZACIÓN: Si el usuario NO pidió explícitamente una tabla o gráfico, responde SOLO con texto narrativo enriquecido.
6. HUMANIZACIÓN: Si no hay resultados, dilo de forma empática.

Pregunta original: ${question}
Resultados obtenidos de la base de datos: ${JSON.stringify(queryResult?.slice(0, 10))}`;

    const explainRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: humanPrompt }
        ],
      }),
    });

    // Validar respuesta de explicación
    if (!explainRes.ok) {
      const errorBody = await explainRes.text();
      console.error(`[ai-data-assistant] Error de OpenAI (explicación): ${explainRes.status} - ${errorBody}`);
      
      // Aún tenemos los datos, devolvemos con explicación genérica
      return jsonResponse({
        type: determineType(queryResult),
        data: queryResult,
        explanation: `Se encontraron ${queryResult?.length || 0} resultados para tu consulta.`,
        metadata: { row_count: queryResult?.length || 0, sql },
        conversationId: conversationId || crypto.randomUUID()
      });
    }

    const explainData = await explainRes.json();
    
    let explanation = "Se procesó tu consulta exitosamente.";
    if (explainData?.choices?.length && explainData.choices[0]?.message?.content) {
      explanation = explainData.choices[0].message.content;
    }

    // 8. Respuesta final
    return jsonResponse({
      type: determineType(queryResult),
      data: queryResult,
      explanation,
      metadata: { row_count: queryResult?.length || 0, sql },
      conversationId: conversationId || crypto.randomUUID()
    });

  } catch (err) {
    console.error(`[ai-data-assistant] Error no controlado: ${err.message}`, err.stack);
    return jsonResponse({ error: `Error interno: ${err.message}` }, 500);
  }
});

function determineType(queryResult: any[]): string {
  if (Array.isArray(queryResult) && queryResult.length > 0) {
    if (queryResult.length === 1 && Object.keys(queryResult[0]).length === 1) return "kpi";
    if (queryResult.length > 1) return "table";
  }
  return "text";
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
