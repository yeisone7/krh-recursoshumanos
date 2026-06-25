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
}

interface AIConfig {
  model?: "gemini" | "openai" | string;
  gemini_api_key?: string;
  openai_api_key?: string;
  gemini_model?: string;
  openai_model?: string;
}

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface KnowledgeItem {
  code: string;
  title: string;
  route: string;
  keywords: string[];
  notes: string[];
}

const KNOWLEDGE: KnowledgeItem[] = [
  {
    code: "empleados",
    title: "Empleados",
    route: "/empleados",
    keywords: ["empleado", "empleados", "hoja de vida", "documentos", "registro", "360", "certificacion"],
    notes: [
      "Permite crear y editar empleados, documentos por carpetas, enlaces de auto-registro y Consulta 360.",
      "Filtros: Todos, Activos, Inactivos, Retirados, En Retiro y Nuevos.",
      "No se debe duplicar el numero de documento.",
    ],
  },
  {
    code: "contratos",
    title: "Contratos y retiros",
    route: "/contratos",
    keywords: ["contrato", "contratos", "vigencia", "prorroga", "retiro", "cesantias", "certificacion laboral"],
    notes: [
      "Nuevo Contrato usa tabs General, Ubicacion y Contrato.",
      "La vigencia efectiva considera prorrogas.",
      "Al completar un retiro, el contrato queda Terminado y se bloquean acciones posteriores.",
    ],
  },
  {
    code: "requisiciones",
    title: "Requisiciones",
    route: "/requisiciones",
    keywords: ["requisicion", "solicitud de personal", "vacante", "aprobacion requisicion"],
    notes: [
      "La requisicion se crea por secciones de solicitud, posicion, reemplazo, condiciones, beneficios y solicitante.",
      "La aprobacion depende del flujo configurado.",
    ],
  },
  {
    code: "seleccion",
    title: "Seleccion y vacantes",
    route: "/seleccion",
    keywords: ["seleccion", "vacante", "candidato", "entrevista", "etapa"],
    notes: [
      "Gestiona vacantes, candidatos, etapas, resultados y vinculacion del candidato seleccionado.",
      "Solo vacantes activas permiten agregar candidatos.",
    ],
  },
  {
    code: "capacitaciones",
    title: "Capacitaciones",
    route: "/capacitaciones",
    keywords: ["capacitacion", "curso", "induccion", "entrenamiento", "evaluacion", "iso", "evidencias"],
    notes: [
      "Incluye biblioteca, sesiones, asistencia con firma, evidencias, evaluaciones, enlaces publicos y cumplimiento.",
      "Las evaluaciones se responden una vez por sesion.",
    ],
  },
  {
    code: "seguridad",
    title: "Seguridad y roles",
    route: "/seguridad",
    keywords: ["seguridad", "roles", "permisos", "usuario", "matriz"],
    notes: [
      "Gestiona usuarios, invitaciones, roles, empleados vinculados, empresas y centros permitidos.",
      "La matriz separa permisos base por modulo y permisos especiales.",
    ],
  },
  {
    code: "incapacidades",
    title: "Incapacidades",
    route: "/incapacidades",
    keywords: ["incapacidad", "incapacidades", "diagnostico", "recobro", "documento medico"],
    notes: [
      "Permite registrar incapacidades, pagos, recobros, documentos e historial.",
      "Los documentos dependen de permisos y politicas de almacenamiento.",
    ],
  },
  {
    code: "asistente_ia",
    title: "Asistente IA",
    route: "/asistente-ia",
    keywords: ["asistente", "ia", "chat", "datos", "analisis"],
    notes: [
      "Este chat orienta sobre uso de la app.",
      "El Asistente de Datos IA es diferente y se usa para metricas, conteos, tendencias y consultas internas.",
    ],
  },
  {
    code: "configuracion",
    title: "Configuracion",
    route: "/configuracion",
    keywords: ["configuracion", "api key", "firma", "parametros", "logo", "empresa"],
    notes: [
      "Incluye parametros generales, firmas, logos, alertas y proveedor/modelo de IA.",
      "Las opciones sensibles requieren permisos administrativos.",
    ],
  },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
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
  return "No se pudo responder la pregunta";
}

function buildKnowledge(pageContext: PageContext | null, userMessage: string) {
  const normalizedMessage = normalizeText(userMessage);
  const selected: KnowledgeItem[] = [];

  const addItem = (candidate: KnowledgeItem | undefined) => {
    if (candidate && !selected.some((item) => item.code === candidate.code)) selected.push(candidate);
  };

  for (const item of KNOWLEDGE) {
    if (pageContext?.module === item.code) addItem(item);
    if (pageContext?.pathname && pageContext.pathname.startsWith(item.route)) addItem(item);
    if (item.keywords.some((keyword) => normalizedMessage.includes(normalizeText(keyword)))) addItem(item);
  }

  for (const code of ["empleados", "contratos", "seguridad", "asistente_ia"]) {
    addItem(KNOWLEDGE.find((item) => item.code === code));
  }

  return selected
    .slice(0, 7)
    .map((item) => `- ${item.title} (${item.route}): ${item.notes.join(" ")}`)
    .join("\n");
}

function buildSystemPrompt(pageContext: PageContext | null, userDisplayName: string, isNewConversation: boolean, message: string) {
  const userName = userDisplayName.trim().split(/\s+/)[0] || "";
  const greetingRule = userName && isNewConversation
    ? `Saluda brevemente al usuario por su primer nombre: ${userName}.`
    : "No repitas saludos si la conversacion ya esta en curso.";
  const moduleContext = pageContext?.moduleLabel
    ? `El usuario esta en el modulo ${pageContext.moduleLabel}${pageContext.pathname ? ` (${pageContext.pathname})` : ""}.`
    : "No hay un modulo especifico activo.";

  return `Eres el asistente de ayuda interna de EmpatiQ, una aplicacion de talento humano.
Tu alcance es orientar sobre el uso de la app, flujos, modulos, permisos, documentos, configuraciones y calculos sencillos que el usuario escriba en el chat.
No consultes ni inventes datos reales de empleados, contratos, nomina, candidatos o reportes. Para metricas, conteos, tendencias o datos internos, indica que debe usar el Asistente de Datos IA.
No des asesoria legal definitiva. Orienta de forma practica sobre donde registrar informacion o que flujo revisar.
Responde en espanol, con tono humano, claro y cercano. ${greetingRule}
${moduleContext}

Conocimiento relevante de la app:
${buildKnowledge(pageContext, message)}

Reglas de formato:
- Usa parrafos cortos y listas solo cuando ayuden.
- Si el usuario pregunta como hacer algo, incluye ruta, flujo, validaciones, permisos y resultado esperado.
- Si falta un dato indispensable, pregunta una sola cosa concreta.
- No incluyas secciones de "Proximos clics recomendados", badges ni cierres decorativos.
- No inventes nombres de botones, permisos o datos que no aparezcan en el contexto.`;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2) {
  let response: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    response = await fetch(url, options);
    if (response.status === 429 && attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 2500));
      continue;
    }
    break;
  }
  return response!;
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

async function callGateway(apiKey: string, systemPrompt: string, messages: ChatMessage[]) {
  const response = await fetchWithRetry(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DEFAULT_GATEWAY_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.35,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw { status: 429, message: "Limite de solicitudes de IA excedido. Intenta nuevamente en unos momentos." };
    if (response.status === 402) throw { status: 402, message: "Creditos de IA insuficientes. Revisa el saldo de Lovable AI o configura una API Key propia en Configuracion > IA." };
    throw new Error(extractProviderError("Lovable AI", response.status, await response.text()));
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta.";
}

async function callGemini(apiKey: string, systemPrompt: string, messages: ChatMessage[], preferredModel?: string) {
  const modelCandidates = uniqueStrings([preferredModel, Deno.env.get("GEMINI_CHAT_MODEL"), "gemini-2.0-flash", "gemini-1.5-flash"]);
  let lastError = "";

  for (const model of modelCandidates) {
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.35 },
      }),
    });

    if (!response.ok) {
      lastError = extractProviderError(`Gemini ${model}`, response.status, await response.text());
      if ([400, 404].includes(response.status)) continue;
      throw new Error(lastError);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim() || "No pude generar una respuesta.";
  }

  throw new Error(lastError || "Gemini no pudo generar una respuesta.");
}

async function callOpenAI(apiKey: string, systemPrompt: string, messages: ChatMessage[], preferredModel?: string) {
  const modelCandidates = uniqueStrings([preferredModel, Deno.env.get("OPENAI_CHAT_MODEL"), "gpt-4o-mini", "gpt-4o"]);
  let lastError = "";

  for (const model of modelCandidates) {
    const response = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.35,
      }),
    });

    if (!response.ok) {
      lastError = extractProviderError(`OpenAI ${model}`, response.status, await response.text());
      if ([400, 404].includes(response.status)) continue;
      throw new Error(lastError);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta.";
  }

  throw new Error(lastError || "OpenAI no pudo generar una respuesta.");
}

async function generateAnswer(aiConfig: AIConfig, systemPrompt: string, messages: ChatMessage[]) {
  const providerOrder = uniqueStrings([aiConfig.model, aiConfig.model === "openai" ? "gemini" : "openai", "lovable_ai"]);
  const failures: string[] = [];

  for (const provider of providerOrder) {
    try {
      if (provider === "openai" && aiConfig.openai_api_key) {
        return { provider: "openai", answer: await callOpenAI(aiConfig.openai_api_key, systemPrompt, messages, aiConfig.openai_model) };
      }
      if (provider === "gemini" && aiConfig.gemini_api_key) {
        return { provider: "gemini", answer: await callGemini(aiConfig.gemini_api_key, systemPrompt, messages, aiConfig.gemini_model) };
      }
      if (provider === "lovable_ai") {
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableApiKey) {
          failures.push("Lovable AI no tiene clave global configurada");
          continue;
        }
        return { provider: "lovable_ai", answer: await callGateway(lovableApiKey, systemPrompt, messages) };
      }
    } catch (error) {
      failures.push(getErrorMessage(error));
      console.error("AI provider failed:", provider, error);
    }
  }

  throw new Error(
    failures.length
      ? `No pude conectar con los proveedores de IA configurados. Detalle: ${failures.join(" | ")}`
      : "No hay proveedor de IA configurado. Configura OpenAI o Gemini en Configuracion > IA.",
  );
}

function sanitizeHistory(rawHistory: unknown) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .filter((item) => {
      const candidate = item as { role?: unknown; content?: unknown };
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    })
    .slice(-30)
    .map((item) => {
      const candidate = item as { role: ChatRole; content: string };
      return { role: candidate.role, content: candidate.content.trim().slice(0, 8000) };
    })
    .filter((item) => item.content);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let stage = "start";
  try {
    stage = "read_environment";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) return jsonResponse({ error: "Sesion requerida" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    stage = "authenticate_user";
    const userResult = await authClient.auth.getUser();
    const user = userResult.data.user;
    if (userResult.error || !user) return jsonResponse({ error: "Sesion invalida" }, 401);

    stage = "parse_request";
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const mode: ChatMode = body.mode === "data_analysis" ? "data_analysis" : "app_help";
    const rawPageContext = body.pageContext && typeof body.pageContext === "object" ? body.pageContext as Record<string, unknown> : null;
    const pageContext: PageContext | null = rawPageContext
      ? {
          module: typeof rawPageContext.module === "string" ? rawPageContext.module.slice(0, 40) : undefined,
          moduleLabel: typeof rawPageContext.moduleLabel === "string" ? rawPageContext.moduleLabel.slice(0, 80) : undefined,
          pathname: typeof rawPageContext.pathname === "string" ? rawPageContext.pathname.slice(0, 120) : undefined,
        }
      : null;
    const userDisplayName = typeof body.userDisplayName === "string" ? body.userDisplayName.trim().slice(0, 80) : "";
    const history = sanitizeHistory(body.history);

    if (!companyId) return jsonResponse({ error: "Empresa requerida" }, 400);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId)) {
      return jsonResponse({ error: "Empresa invalida" }, 400);
    }
    if (!message || message.length > 8000) return jsonResponse({ error: "Escribe una pregunta de maximo 8000 caracteres" }, 400);
    if (mode === "data_analysis") return jsonResponse({ error: "El chat de analisis de datos estara disponible proximamente." }, 403);

    stage = "check_company_access";
    const membershipResult = await adminClient
      .from("user_company_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();
    const superAdminResult = await adminClient
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membershipResult.data && !superAdminResult.data) {
      return jsonResponse({ error: "No tienes acceso a esta empresa" }, 403);
    }

    stage = "load_ai_config";
    const companyConfigResult = await adminClient
      .from("system_config")
      .select("config_value")
      .eq("company_id", companyId)
      .eq("config_key", "ai_config")
      .maybeSingle();

    let globalConfigRow: { config_value?: unknown } | null = null;
    if (!companyConfigResult.data) {
      const globalConfigResult = await adminClient
        .from("system_config")
        .select("config_value")
        .is("company_id", null)
        .eq("config_key", "ai_config")
        .maybeSingle();
      globalConfigRow = globalConfigResult.data;
    }

    const aiConfigRow = companyConfigResult.data || globalConfigRow;
    const aiConfig = (aiConfigRow?.config_value || {}) as AIConfig;
    const conversationMessages: ChatMessage[] = [...history, { role: "user", content: message }];

    stage = "build_prompt";
    const systemPrompt = buildSystemPrompt(pageContext, userDisplayName, history.length === 0, message);

    stage = "generate_answer";
    const generation = await generateAnswer(aiConfig, systemPrompt, conversationMessages);

    const assistantMessage = {
      id: crypto.randomUUID(),
      conversation_id: crypto.randomUUID(),
      company_id: companyId,
      user_id: user.id,
      role: "assistant" as const,
      content: generation.answer,
      ai_provider: generation.provider,
      metadata: { selected_model: aiConfig.model || "gateway", temporary: true },
      created_at: new Date().toISOString(),
    };

    return jsonResponse({ conversationId: assistantMessage.conversation_id, message: assistantMessage, provider: generation.provider });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("ai-chat error:", { stage, message, error });
    const status = typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500;
    return jsonResponse({ error: message, stage }, status);
  }
});
