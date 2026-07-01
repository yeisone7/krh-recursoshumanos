import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_GATEWAY_MODEL = "google/gemini-3-flash-preview";
const TRAINING_AI_ALLOWED_PERMISSIONS = [
  { module: "capacitaciones_ia", action: "view" },
  { module: "capacitaciones_ia", action: "create" },
  { module: "capacitaciones", action: "create" },
  { module: "capacitaciones_manual", action: "create" },
  { module: "capacitaciones_biblioteca", action: "create" },
];

interface AIConfig {
  model?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
  gemini_model?: string;
  openai_model?: string;
}

async function requireTrainingPermission(req: Request, companyId: string | undefined) {
  if (!companyId) throw { status: 400, message: "companyId is required" };

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) throw { status: 401, message: "No autorizado" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userError } = await authClient.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) throw { status: 401, message: "No autorizado" };

  const { data: systemRole } = await adminClient
    .from("user_custom_roles")
    .select("id, custom_roles!inner(is_system,is_active)")
    .eq("user_id", userId)
    .eq("custom_roles.is_system", true)
    .eq("custom_roles.is_active", true)
    .limit(1);

  const isSystemRole = Boolean(systemRole?.length);
  const { data: legacyAdminRole } = await adminClient
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);

  const isLegacyAdmin = Boolean(legacyAdminRole?.length);
  const permissionChecks = await Promise.all(
    TRAINING_AI_ALLOWED_PERMISSIONS.map((permission) =>
      adminClient.rpc("check_user_permission", {
        _user_id: userId,
        _module_code: permission.module,
        _action: permission.action,
      })
    )
  );
  const hasPermission = permissionChecks.some(({ data }) => data === true);

  if (!isSystemRole && !isLegacyAdmin) {
    const { data: assignment } = await adminClient
      .from("user_company_assignments")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!assignment || !hasPermission) {
      throw { status: 403, message: "No tienes permiso para generar capacitaciones en esta empresa." };
    }
  }
}

async function getAIConfig(companyId: string | undefined): Promise<AIConfig> {
  if (!companyId) return {};
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: configRow } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("company_id", companyId)
      .eq("config_key", "ai_config")
      .maybeSingle();
    return (configRow?.config_value as AIConfig) || {};
  } catch (e) {
    console.warn("Could not read AI config:", e);
    return {};
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const result: string[] = [];
  for (const value of values) {
    const cleanValue = typeof value === "string" ? value.trim() : "";
    if (cleanValue && !result.includes(cleanValue)) result.push(cleanValue);
  }
  return result;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof error === "string" && error.trim()) return error;
  return "No se pudo generar la capacitacion";
}

function extractProviderError(provider: string, status: number, errorText: string) {
  try {
    const parsed = JSON.parse(errorText);
    const message = parsed?.error?.message || parsed?.message || parsed?.error;
    if (message) return `${provider}: ${message}`;
  } catch (_) {
    // Keep raw text when the provider does not return JSON.
  }
  return `${provider}: error ${status}${errorText ? ` - ${errorText.slice(0, 240)}` : ""}`;
}

function parseJsonContent(rawContent: string, provider: string) {
  const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  if (!cleaned) throw new Error(`${provider} no devolvio contenido`);
  return JSON.parse(cleaned);
}

function buildToolSchema() {
  return {
    type: "function",
    function: {
      name: "generate_training_content",
      description: "Genera el contenido estructurado de una capacitación empresarial",
      parameters: {
        type: "object",
        properties: {
          introduccion: { type: "string", description: "Párrafo introductorio de 3-5 líneas" },
          objetivos: { type: "array", items: { type: "string" }, description: "Lista de 3+ objetivos" },
          contenido: { type: "string", description: "Contenido principal en Markdown, mínimo 500 palabras" },
          puntosClave: { type: "array", items: { type: "string" }, description: "5+ puntos clave" },
          evaluacion: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pregunta: { type: "string" },
                respuestaCorrecta: { type: "string" },
                opciones: { type: "array", items: { type: "string" } },
              },
              required: ["pregunta", "respuestaCorrecta", "opciones"],
            },
            description: "5+ preguntas de evaluación",
          },
        },
        required: ["introduccion", "objetivos", "contenido", "puntosClave", "evaluacion"],
        additionalProperties: false,
      },
    },
  };
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let response: Response | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    response = await fetch(url, options);
    if (response.status === 429 && attempt < retries - 1) {
      const wait = (attempt + 1) * 5000;
      console.log(`Rate limited (429), retrying in ${wait}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    break;
  }
  return response!;
}

async function callGeminiDirect(apiKey: string, systemPrompt: string, userPrompt: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nResponde ÚNICAMENTE con un JSON válido con las llaves: introduccion, objetivos, contenido, puntosClave, evaluacion. Sin texto adicional fuera del JSON.` }] },
      ],
      generationConfig: { temperature: 0.7 },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini direct error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

async function callOpenAIDirect(apiKey: string, systemPrompt: string, userPrompt: string): Promise<any> {
  const tool = buildToolSchema();
  const response = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "generate_training_content" } },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI direct error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  throw new Error("No tool call in OpenAI response");
}

async function callGateway(apiKey: string, systemPrompt: string, userPrompt: string): Promise<any> {
  const tool = buildToolSchema();
  const response = await fetchWithRetry(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_GATEWAY_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "generate_training_content" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw { status: 429, message: "Límite de solicitudes excedido. Intente de nuevo en unos momentos. Puede configurar sus propias API keys en Configuración → IA." };
    }
    if (response.status === 402) {
      throw { status: 402, message: "Créditos insuficientes. Configure sus propias API keys en Configuración → IA para usar su propia cuenta." };
    }
    const errorText = await response.text();
    console.error("Gateway error:", response.status, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  // Fallback: parse from content
  const rawContent = aiResponse.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("No content returned from AI");
  const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

async function callGeminiTraining(apiKey: string, systemPrompt: string, userPrompt: string, preferredModel?: string): Promise<any> {
  const modelCandidates = uniqueStrings([
    preferredModel,
    Deno.env.get("GEMINI_TRAINING_MODEL"),
    Deno.env.get("GEMINI_CHAT_MODEL"),
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ]);
  let lastError = "";

  for (const model of modelCandidates) {
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nResponde UNICAMENTE con un JSON valido con las llaves: introduccion, objetivos, contenido, puntosClave, evaluacion. Sin texto adicional fuera del JSON.` }] },
        ],
        generationConfig: { temperature: 0.7 },
      }),
    });

    if (!response.ok) {
      lastError = extractProviderError(`Gemini ${model}`, response.status, await response.text());
      console.error("Gemini training error:", lastError);
      if ([400, 404].includes(response.status)) continue;
      throw new Error(lastError);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    return parseJsonContent(text, `Gemini ${model}`);
  }

  throw new Error(lastError || "Gemini no pudo generar contenido.");
}

async function callOpenAITraining(apiKey: string, systemPrompt: string, userPrompt: string, preferredModel?: string): Promise<any> {
  const tool = buildToolSchema();
  const modelCandidates = uniqueStrings([
    preferredModel,
    Deno.env.get("OPENAI_TRAINING_MODEL"),
    Deno.env.get("OPENAI_CHAT_MODEL"),
    "gpt-4o-mini",
    "gpt-4o",
  ]);
  let lastError = "";

  for (const model of modelCandidates) {
    const response = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        tools: [tool],
        tool_choice: { type: "function", function: { name: "generate_training_content" } },
      }),
    });

    if (!response.ok) {
      lastError = extractProviderError(`OpenAI ${model}`, response.status, await response.text());
      console.error("OpenAI training error:", lastError);
      if ([400, 404].includes(response.status)) continue;
      throw new Error(lastError);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    if (message?.content) return parseJsonContent(message.content, `OpenAI ${model}`);
  }

  throw new Error(lastError || "OpenAI no pudo generar contenido.");
}

async function callGatewayTraining(apiKey: string, systemPrompt: string, userPrompt: string): Promise<any> {
  try {
    return await callGateway(apiKey, systemPrompt, userPrompt);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function generateTrainingWithAI(aiConfig: AIConfig, systemPrompt: string, userPrompt: string): Promise<any> {
  const providerOrder = uniqueStrings([
    aiConfig.model === "lovable_ai" ? "gateway" : aiConfig.model,
    aiConfig.model === "openai" ? "gemini" : "openai",
    aiConfig.model === "gemini" ? "openai" : "gemini",
    "gateway",
  ]);
  const failures: string[] = [];

  for (const provider of providerOrder) {
    try {
      if (provider === "openai" && aiConfig.openai_api_key) {
        console.log("Using OpenAI direct API");
        return await callOpenAITraining(aiConfig.openai_api_key, systemPrompt, userPrompt, aiConfig.openai_model);
      }
      if (provider === "gemini" && aiConfig.gemini_api_key) {
        console.log("Using Gemini direct API");
        return await callGeminiTraining(aiConfig.gemini_api_key, systemPrompt, userPrompt, aiConfig.gemini_model);
      }
      if (provider === "gateway") {
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableApiKey) {
          failures.push("Lovable AI no tiene clave global configurada");
          continue;
        }
        console.log("Using Lovable AI Gateway with model:", DEFAULT_GATEWAY_MODEL);
        return await callGatewayTraining(lovableApiKey, systemPrompt, userPrompt);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      failures.push(message);
      console.error("AI provider failed:", provider, message);
    }
  }

  throw {
    status: 502,
    message: failures.length
      ? `No pude conectar con los proveedores de IA configurados. Detalle: ${failures.join(" | ")}`
      : "No hay proveedor de IA configurado. Configura OpenAI o Gemini en Configuracion > IA.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, area, audience, level, objective, legalFramework, riskLevel, duration, language, pdfText, additionalContext, companyId } = await req.json();
    await requireTrainingPermission(req, companyId);

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiConfig = await getAIConfig(companyId);

    const systemPrompt = `Eres un experto en capacitación empresarial colombiana, especializado en seguridad industrial, HSEQ, calidad y desarrollo organizacional. Genera contenido de capacitación estructurado y profesional en español.`;

    const userPrompt = `Genera una capacitación completa con los siguientes parámetros:

- Título: ${title}
- Tipo: ${type || 'General'}
- Área: ${area || 'General'}
- Público objetivo: ${audience || 'Todo el personal'}
- Nivel: ${level || 'Básico'}
- Objetivo: ${objective || 'Capacitar al personal en el tema indicado'}
- Marco legal/Norma: ${legalFramework || 'N/A'}
- Nivel de riesgo: ${riskLevel || 'Medio'}
- Duración estimada: ${duration || '30'} minutos
- Idioma: ${language || 'Español'}

${pdfText ? `\nContenido de referencia extraído de PDF:\n${pdfText.substring(0, 8000)}\n` : ''}
${additionalContext ? `\nContexto adicional proporcionado:\n${additionalContext}\n` : ''}

Genera el contenido de la capacitación usando la función generate_training_content. La evaluación debe tener mínimo 5 preguntas. La primera opción (índice 0) SIEMPRE debe ser la respuesta correcta y debe coincidir con respuestaCorrecta. El contenido principal debe ser en formato Markdown con títulos ##, listas, negritas. Mínimo 500 palabras.`;

    const parsed = await generateTrainingWithAI(aiConfig, systemPrompt, userPrompt);

    if (!parsed.introduccion || !parsed.objetivos || !parsed.contenido || !parsed.puntosClave || !parsed.evaluacion) {
      throw new Error("AI response missing required fields");
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-training error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Error generating training content");
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
