import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_GATEWAY_MODEL = "google/gemini-3-flash-preview";

type ChatRole = "user" | "assistant";
type ChatMode = "app_help" | "data_analysis";

interface PageContext {
  module?: string;
  moduleLabel?: string;
  pathname?: string;
  isActiveModule?: boolean;
}

interface UserContext {
  displayName?: string;
  isNewConversation?: boolean;
  isStepFlow?: boolean;
}

interface AIConfig {
  model?: "gemini" | "openai" | string;
  gemini_api_key?: string;
  openai_api_key?: string;
}

interface ChatMessage {
  role: ChatRole;
  content: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  let response: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    response = await fetch(url, options);
    if (response.status === 429 && attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 2500));
      continue;
    }
    break;
  }
  return response!;
}

function buildSystemPrompt(mode: ChatMode, pageContext?: PageContext | null, userContext?: UserContext | null) {
  if (mode === "data_analysis") {
    return "El chat de análisis de datos aún no está habilitado. Responde brevemente indicando que esta capacidad estará disponible próximamente y no inventes datos.";
  }

  const userName = userContext?.displayName?.trim();
  const personalizationContext = userName
    ? `\nEl usuario se llama ${userName}. Usa únicamente ese primer nombre en el saludo; nunca agregues apellidos ni otros nombres. ${userContext?.isNewConversation ? "Salúdalo brevemente por ese nombre al inicio, en una línea separada antes del título del paso. No vuelvas a mencionar su nombre en el resto de la respuesta." : "No repitas saludos ni menciones su nombre si la conversación ya está en curso."}`
    : `\n${userContext?.isNewConversation ? "Saluda de forma breve y amable al inicio." : "No repitas saludos si la conversación ya está en curso."}`;
  const moduleContext = pageContext?.moduleLabel
    ? `\nContexto actual del usuario: viene del módulo ${pageContext.moduleLabel}${pageContext.pathname ? ` (${pageContext.pathname})` : ""}. No incluyas secciones de recomendaciones, badges ni "Próximos clics recomendados" al final de la respuesta.`
    : `\nNo incluyas secciones de recomendaciones, badges ni "Próximos clics recomendados" al final de la respuesta.`;

  return `Eres el asistente de ayuda interna de KRH, una aplicación de gestión de talento humano.
Tu alcance es EXCLUSIVAMENTE orientar sobre el uso de la app: módulos, navegación, procesos, configuraciones, alertas, contratos, empleados, selección, capacitaciones, evaluaciones, notificaciones, permisos y flujos operativos.
No consultes ni inventes datos reales de empleados, contratos, nómina, candidatos o reportes. Si el usuario pide conteos, análisis o datos internos, explica que ese será otro chat de análisis de datos y que este chat solo ayuda con el uso de la app.
No des asesoría legal definitiva. Puedes orientar en lenguaje práctico sobre dónde registrar información o qué flujo seguir en la app.
Usa un tono humano, cercano, amable y educativo: responde como una persona experta que acompaña con paciencia, no como un robot. Usa frases naturales, reconoce la necesidad del usuario y evita tecnicismos innecesarios.${personalizationContext}
Haz que el formato sea muy visual y fácil de escanear: usa Markdown limpio con saltos de línea, títulos cortos en nivel 3 (###), listas numeradas para pasos, viñetas para detalles, negritas para conceptos clave, tablas simples cuando ayuden a comparar información y separadores suaves (---) solo cuando aporten claridad. Evita bloques largos de texto; máximo 2-3 frases por párrafo. Incluye emojis de forma moderada y profesional para orientar visualmente (por ejemplo: 🙂, ✅, 👉, 💡, ⚠️), sin saturar la respuesta.
Cuando el usuario pida procesos, rutas, dependencias, niveles, aprobaciones, responsables o estructuras, representa la información como apoyo visual en texto: flujos con flechas (Inicio → Paso → Resultado), jerarquías tipo árbol con sangrías, listas anidadas, tablas de roles/responsables o mapas simples de decisión. Usa estos formatos solo cuando aporten claridad; no inventes datos ni responsables no mencionados.
Cuando el usuario quiera realizar una tarea dentro de la app, guíalo como un flujo interactivo y mantén un orden estricto: 1) saludo breve solo si corresponde, 2) título del paso actual, 3) instrucciones del paso actual, 4) pregunta de confirmación. No escribas el saludo después del título del paso. No incluyas una vista general, resumen de todos los pasos ni adelantes pasos futuros salvo que el usuario lo pida explícitamente.
Entrega solo el paso actual con número visible (por ejemplo, "### Paso 1 de N"). No avances al siguiente paso hasta que el usuario confirme. Si el usuario dice que no pudo completar el paso, ayúdale a resolver ese paso antes de continuar.
Responde en español, con pasos claros, concisos y formato Markdown cuando ayude.${moduleContext}`;
}

async function callGateway(apiKey: string, systemPrompt: string, messages: ChatMessage[]) {
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
        ...messages,
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw { status: 429, message: "Límite de solicitudes de IA excedido. Intenta nuevamente en unos momentos." };
    if (response.status === 402) throw { status: 402, message: "Créditos de IA insuficientes. Revisa el saldo de Lovable AI o configura una API Key propia en Configuración → IA." };
    const errorText = await response.text();
    console.error("Lovable AI error:", response.status, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta.";
}

async function callGeminiDirect(apiKey: string, systemPrompt: string, messages: ChatMessage[]) {
  const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini direct error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim() || "No pude generar una respuesta.";
}

async function callOpenAIDirect(apiKey: string, systemPrompt: string, messages: ChatMessage[]) {
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
        ...messages,
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI direct error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta.";
}

function validateStepFlowResponse(content: string) {
  const normalized = content.toLowerCase();
  const futureSummaryPhrases = [
    "vista general de los pasos",
    "resumen de los pasos",
    "pasos que seguiremos",
    "estos son los pasos",
    "los pasos son",
    "seguiremos estos pasos",
  ];
  const stepHeadings = [...content.matchAll(/(?:^|\n)\s*#{0,3}\s*paso\s+\d+(?:\s+de\s+\d+)?/gi)];

  return {
    needsCorrection: futureSummaryPhrases.some((phrase) => normalized.includes(phrase)) || stepHeadings.length > 1,
  };
}

async function correctStepFlowResponse(provider: string, aiConfig: AIConfig, systemPrompt: string, messages: ChatMessage[], draftAnswer: string) {
  const correctionPrompt = `${systemPrompt}

Regla de autocorrección obligatoria: la respuesta anterior incluyó un resumen, una vista general, pasos futuros o el saludo quedó fuera de orden. Reescríbela en español retomando ÚNICAMENTE el paso actual. Mantén este orden exacto: saludo breve solo si corresponde en la primera línea, título "### Paso X de N", instrucciones concretas de ese paso y una sola pregunta final de confirmación. Si usas el nombre del usuario, úsalo solo en el saludo. No incluyas listas de pasos futuros, resumen general ni pasos adicionales.`;
  const correctionMessages: ChatMessage[] = [
    ...messages,
    { role: "assistant", content: draftAnswer },
    { role: "user", content: "Corrige la respuesta anterior y entrega solo el paso actual." },
  ];

  if (provider === "gemini" && aiConfig.gemini_api_key) {
    return callGeminiDirect(aiConfig.gemini_api_key, correctionPrompt, correctionMessages);
  }
  if (provider === "openai" && aiConfig.openai_api_key) {
    return callOpenAIDirect(aiConfig.openai_api_key, correctionPrompt, correctionMessages);
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");
  return callGateway(lovableApiKey, correctionPrompt, correctionMessages);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) return jsonResponse({ error: "Sesión requerida" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await authClient.auth.getUser();
    const user = userData.user;
    if (userError || !user) return jsonResponse({ error: "Sesión inválida" }, 401);

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const mode: ChatMode = body.mode === "data_analysis" ? "data_analysis" : "app_help";
    const history = Array.isArray(body.history)
      ? body.history
          .filter((item: any) => (item?.role === "user" || item?.role === "assistant") && typeof item?.content === "string")
          .slice(-30)
          .map((item: any) => ({ role: item.role as ChatRole, content: item.content.trim().slice(0, 4000) }))
          .filter((item: ChatMessage) => item.content)
      : [];
    const rawPageContext = body.pageContext && typeof body.pageContext === "object" ? body.pageContext : null;
    const userDisplayName = typeof body.userDisplayName === "string" ? body.userDisplayName.trim().slice(0, 80) : "";
    const pageContext: PageContext | null = rawPageContext ? {
      module: typeof rawPageContext.module === "string" ? rawPageContext.module.slice(0, 40) : undefined,
      moduleLabel: typeof rawPageContext.moduleLabel === "string" ? rawPageContext.moduleLabel.slice(0, 80) : undefined,
      pathname: typeof rawPageContext.pathname === "string" ? rawPageContext.pathname.slice(0, 120) : undefined,
      isActiveModule: rawPageContext.isActiveModule === true,
    } : null;

    if (!companyId) return jsonResponse({ error: "Empresa requerida" }, 400);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId)) {
      return jsonResponse({ error: "Empresa inválida" }, 400);
    }
    if (!message || message.length > 4000) return jsonResponse({ error: "Escribe una pregunta de máximo 4000 caracteres" }, 400);
    if (mode === "data_analysis") return jsonResponse({ error: "El chat de análisis de datos estará disponible próximamente." }, 403);

    const [{ data: membership }, { data: superAdmin }] = await Promise.all([
      adminClient.from("user_company_assignments").select("id").eq("user_id", user.id).eq("company_id", companyId).maybeSingle(),
      adminClient.from("super_admins").select("id").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!membership && !superAdmin) return jsonResponse({ error: "No tienes acceso a esta empresa" }, 403);

    const activeConversationId = crypto.randomUUID();

    const { data: aiConfigRow } = await adminClient
      .from("system_config")
      .select("config_value")
      .eq("company_id", companyId)
      .eq("config_key", "ai_config")
      .maybeSingle();

    const aiConfig = (aiConfigRow?.config_value || {}) as AIConfig;
    const conversationMessages: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];
    const isStepFlow = conversationMessages.some((item) => item.role === "assistant" && /paso\s+\d+(?:\s+de\s+\d+)?/i.test(item.content));
    const systemPrompt = buildSystemPrompt(mode, pageContext, { displayName: userDisplayName, isNewConversation: history.length === 0, isStepFlow });

    let provider = "lovable_ai";
    let answer = "";
    if (aiConfig.model === "gemini" && aiConfig.gemini_api_key) {
      provider = "gemini";
      answer = await callGeminiDirect(aiConfig.gemini_api_key, systemPrompt, conversationMessages);
    } else if (aiConfig.model === "openai" && aiConfig.openai_api_key) {
      provider = "openai";
      answer = await callOpenAIDirect(aiConfig.openai_api_key, systemPrompt, conversationMessages);
    } else {
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");
      answer = await callGateway(lovableApiKey, systemPrompt, conversationMessages);
    }

    if (validateStepFlowResponse(answer).needsCorrection) {
      answer = await correctStepFlowResponse(provider, aiConfig, systemPrompt, conversationMessages, answer);
    }

    const assistantMessage = {
      id: crypto.randomUUID(),
      conversation_id: activeConversationId,
      company_id: companyId,
      user_id: user.id,
      role: "assistant" as const,
      content: answer,
      ai_provider: provider,
      metadata: { selected_model: aiConfig.model || "gateway", temporary: true },
      created_at: new Date().toISOString(),
    };

    return jsonResponse({ conversationId: activeConversationId, message: assistantMessage, provider });
  } catch (error: any) {
    console.error("ai-chat error:", error);
    return jsonResponse({ error: error?.message || "No se pudo responder la pregunta" }, error?.status || 500);
  }
});
