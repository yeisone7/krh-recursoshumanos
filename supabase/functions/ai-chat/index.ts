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
  gemini_model?: string;
  openai_model?: string;
}

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface AppModuleKnowledge {
  moduleCode: string;
  title: string;
  route?: string;
  keywords: string[];
  actions: string[];
  restrictions: string[];
  usageNotes?: string[];
}

const APP_MODULE_KNOWLEDGE: AppModuleKnowledge[] = [
  {
    moduleCode: "empleados",
    title: "Empleados",
    route: "/empleados",
    keywords: ["empleado", "empleados", "hoja de vida", "documentos", "certificacion", "certificación", "registro", "360"],
    actions: [
      "Crear nuevo empleado y editar datos personales, contacto, familia, laboral, modalidad, seguridad social, banco y nomina.",
      "Subir documentos por carpetas: Hoja de Vida, Certificados Laborales y Academicos, Proceso de Seleccion, Certificados de Residencia, Afiliaciones, Examenes Ocupacionales, Carne de Vacunas, Consulta de Antecedentes, Dotacion, Contratos y Otro si, Certificados Bancarios, Documentos de Retiro, Inducciones y Cursos, Licencia y Cursos.",
      "Generar enlaces de auto-registro con nombre y campos configurables.",
      "Acceder a Consulta 360 del empleado.",
    ],
    restrictions: [
      "No se puede eliminar un empleado con contratos activos.",
      "El numero de documento no se puede duplicar.",
      "Un empleado retirado conserva su historial para consulta y reportes.",
    ],
    usageNotes: [
      "Filtros principales: Todos, Activos, Inactivos, Retirados, En Retiro y Nuevos.",
      "Inactivo es deshabilitacion administrativa; Retirado viene del proceso formal de retiro.",
    ],
  },
  {
    moduleCode: "empleado_360",
    title: "Consulta 360 del Empleado",
    route: "/empleados/:id/360",
    keywords: ["360", "consulta 360", "perfil 360", "documentos 360", "linea de tiempo", "expediente"],
    actions: [
      "Consultar perfil, informacion laboral, contratos, retiros, vacaciones, permisos, incapacidades, capacitaciones, evaluaciones, salud, dotacion, novedades, turnos, documentos, auditoria, linea de tiempo, alertas y calidad del expediente.",
      "Revisar documentos por carpetas desplegables similares a la carga de documentos del empleado.",
      "Abrir o descargar documentos del expediente cuando el usuario tenga acceso.",
    ],
    restrictions: [
      "La vista 360 consolida informacion; los cambios operativos se hacen desde el modulo correspondiente.",
      "La visibilidad depende de los permisos asignados al rol del usuario.",
    ],
  },
  {
    moduleCode: "contratos",
    title: "Contratos",
    route: "/contratos",
    keywords: ["contrato", "contratos", "vigencia", "duracion", "duración", "prorroga", "prórroga", "aprobacion", "aprobación", "retiro", "certificacion laboral"],
    actions: [
      "Crear contrato desde Nuevo Contrato con pestanas General, Ubicacion y Contrato.",
      "Registrar fecha de inicio y duracion en meses; la fecha de finalizacion se calcula como fecha de inicio mas duracion.",
      "Ver en el grid la vigencia con fecha de inicio, duracion del contrato y fecha final efectiva.",
      "Registrar prorrogas, aprobar contratos, generar documento de contrato, iniciar o continuar proceso de retiro y expedir certificacion laboral desde retiro.",
    ],
    restrictions: [
      "Solo debe existir un contrato activo por empleado.",
      "Cuando el retiro queda completado, se bloquean editar contrato, nueva prorroga y generacion de nuevos documentos contractuales.",
      "Los permisos especiales como Aprobar Contratos dependen del rol.",
    ],
    usageNotes: [
      "La vigencia efectiva considera prorrogas; si no hay fecha final, se muestra Indefinido.",
      "El campo de remuneracion base mensual no usa icono de moneda dentro del input para evitar solapamientos.",
    ],
  },
  {
    moduleCode: "retiros",
    title: "Proceso de Retiro",
    route: "/contratos",
    keywords: ["retiro", "terminacion", "terminación", "cesantias", "cesantías", "liquidacion", "liquidación", "folio", "archivo"],
    actions: [
      "Iniciar retiro desde el detalle de un contrato vigente o con retiro pendiente.",
      "Registrar tipo de terminacion, motivo, fechas, checklist documental, folio y numero de archivo.",
      "Generar documentos de retiro y certificacion laboral desde el checklist.",
    ],
    restrictions: [
      "Solo se puede iniciar retiro sobre contratos vigentes o con retiro pendiente.",
      "Al completar retiro, el contrato queda Terminado y se bloquean operaciones contractuales posteriores.",
    ],
  },
  {
    moduleCode: "requisiciones",
    title: "Requisiciones de Personal",
    route: "/requisiciones",
    keywords: ["requisicion", "requisición", "solicitud de personal", "vacante", "aprobacion requisicion"],
    actions: [
      "Crear requisicion desde modal por pestanas: solicitud, posicion, reemplazo, condiciones, beneficios y solicitante.",
      "Aprobar o rechazar requisicion segun flujo configurado.",
      "Ver detalle, linea de tiempo y exportar requisicion en PDF.",
    ],
    restrictions: [
      "Requiere aprobacion segun el flujo configurado.",
      "No se debe modificar una requisicion ya aprobada salvo flujo permitido.",
    ],
    usageNotes: ["Dia de descanso soporta 2 Dias, 4 Dias y 7 Dias."],
  },
  {
    moduleCode: "seleccion",
    title: "Seleccion y Vacantes",
    route: "/seleccion",
    keywords: ["seleccion", "selección", "vacante", "candidato", "entrevista", "etapa"],
    actions: [
      "Crear vacante desde modal responsivo.",
      "Registrar candidatos manualmente o mediante enlace publico.",
      "Avanzar candidatos por etapas, registrar resultados y vincular candidato seleccionado como empleado.",
    ],
    restrictions: [
      "Solo vacantes activas permiten agregar candidatos.",
      "Un candidato solo debe ser seleccionado una vez por vacante.",
    ],
  },
  {
    moduleCode: "capacitaciones",
    title: "Capacitaciones",
    route: "/capacitaciones",
    keywords: ["capacitacion", "capacitación", "curso", "induccion", "inducción", "entrenamiento", "evaluacion capacitacion", "iso"],
    actions: [
      "Crear capacitacion manual o con IA.",
      "Gestionar biblioteca, sesiones, asistencia con firma, evidencias, evaluaciones, enlaces de acceso publico, cumplimiento y analiticas.",
      "Configurar tipo de capacitacion, area, publico objetivo y norma.",
    ],
    restrictions: [
      "El acceso publico requiere enlace generado.",
      "Las evaluaciones solo se pueden responder una vez por sesion.",
    ],
    usageNotes: [
      "Tipos recientes: Induccion, Capacitacion y Entrenamiento Grupal.",
      "Norma ISO 14001 reemplaza ISO 14000.",
    ],
  },
  {
    moduleCode: "seguridad",
    title: "Seguridad y Roles",
    route: "/seguridad",
    keywords: ["seguridad", "roles", "permisos", "usuario", "asignar centros", "aprobar contratos", "matriz"],
    actions: [
      "Gestionar usuarios, invitar usuarios, asignar roles, vincular empleados y activar o desactivar usuarios.",
      "Crear roles con permisos por modulo y permisos especiales independientes por item.",
      "Asignar empresas y centros permitidos a usuarios.",
    ],
    restrictions: [
      "Solo usuarios con permiso de seguridad pueden gestionar usuarios y roles.",
      "El rol Administrador no se debe eliminar ni desactivar.",
      "No se puede eliminar un rol asignado a usuarios activos.",
    ],
    usageNotes: [
      "La matriz de acceso distingue permisos base del modulo y permisos especiales como aprobaciones.",
      "SuperAdmin tiene Empresas, Usuarios y Roles.",
    ],
  },
  {
    moduleCode: "alertas",
    title: "Centro de Alertas y Notificaciones",
    route: "/alertas",
    keywords: ["alertas", "notificaciones", "correo", "vencimientos", "reglas", "centro de notificaciones"],
    actions: [
      "Ver alertas activas, filtrar por tipo y prioridad, marcar como leida y navegar al modulo relacionado.",
      "Configurar reglas de notificacion por rol, evento y canal.",
    ],
    restrictions: [
      "Las alertas se generan automaticamente; no se crean manualmente desde el centro de alertas.",
      "Los destinatarios dependen de reglas, roles y configuracion de empresa.",
    ],
  },
  {
    moduleCode: "dotacion",
    title: "Dotacion",
    route: "/dotacion",
    keywords: ["dotacion", "dotación", "inventario", "profesiograma", "entrega", "acta"],
    actions: [
      "Registrar entrega de dotacion.",
      "Gestionar catalogo de articulos, profesiograma, cumplimiento, inventario y movimientos.",
      "Exportar acta de entrega en PDF.",
    ],
    restrictions: [
      "Solo empleados activos pueden recibir dotacion.",
      "El inventario no puede quedar en negativo.",
    ],
  },
  {
    moduleCode: "examenes",
    title: "Examenes Medicos",
    route: "/examenes",
    keywords: ["examen", "examenes", "médico", "medico", "profesiograma", "orden medica", "apto"],
    actions: [
      "Registrar aplicacion de examenes.",
      "Gestionar catalogo de examenes y profesiograma.",
      "Ver detalle con resultados y generar orden o acta en PDF.",
    ],
    restrictions: [
      "Solo empleados activos.",
      "Los examenes con concepto No Apto generan alertas.",
    ],
  },
  {
    moduleCode: "novedades",
    title: "Novedades de Nomina",
    route: "/novedades",
    keywords: ["novedad", "novedades", "nomina", "nómina", "periodo", "aprobacion novedad"],
    actions: [
      "Registrar, editar o eliminar novedades segun estado.",
      "Filtrar por periodo, empleado y tipo.",
      "Aprobar novedades pendientes cuando el rol lo permite, duplicar novedades recurrentes, imprimir comprobante o exportar a Excel.",
    ],
    restrictions: [
      "No se pueden modificar novedades de periodos cerrados.",
      "Las novedades aprobadas no se deben eliminar.",
    ],
  },
  {
    moduleCode: "asistente_ia",
    title: "Asistente IA",
    route: "/asistente-ia",
    keywords: ["asistente", "ia", "datos", "analisis", "análisis", "chat"],
    actions: [
      "Usar Asistente de Ayuda para orientacion sobre uso de la app.",
      "Usar Analisis de Datos para metricas, conteos, tendencias y consultas internas controladas.",
      "Administrar acceso al asistente desde Configuracion > IA cuando aplique.",
    ],
    restrictions: [
      "El Asistente de Ayuda no reemplaza validaciones legales ni consulta datos internos reales.",
      "El Asistente de Datos requiere permiso por usuario y respeta el contexto de empresa.",
    ],
  },
  {
    moduleCode: "configuracion",
    title: "Configuracion",
    route: "/configuracion",
    keywords: ["configuracion", "configuración", "ia", "api key", "firma", "parametros", "parámetros"],
    actions: [
      "Editar parametros generales.",
      "Configurar firma legal para documentos.",
      "Configurar dias de alerta de procesos de retiro.",
      "Administrar acceso y proveedores del asistente IA.",
    ],
    restrictions: ["Las configuraciones sensibles requieren permisos administrativos."],
  },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function buildAppUsageKnowledge(pageContext?: PageContext | null, userMessage = "") {
  const normalizedMessage = normalizeText(userMessage);
  const selected = new Map<string, AppModuleKnowledge>();

  for (const module of APP_MODULE_KNOWLEDGE) {
    if (pageContext?.module && module.moduleCode === pageContext.module) {
      selected.set(module.moduleCode, module);
      continue;
    }
    if (pageContext?.pathname && module.route && pageContext.pathname.startsWith(module.route.replace("/:id", ""))) {
      selected.set(module.moduleCode, module);
      continue;
    }
    if (module.keywords.some((keyword) => normalizedMessage.includes(normalizeText(keyword)))) {
      selected.set(module.moduleCode, module);
    }
  }

  for (const moduleCode of ["empleados", "contratos", "seguridad", "asistente_ia"]) {
    const module = APP_MODULE_KNOWLEDGE.find((item) => item.moduleCode === moduleCode);
    if (module) selected.set(module.moduleCode, module);
  }

  return [...selected.values()]
    .slice(0, 8)
    .map((module) => {
      const lines = [
        `- ${module.title}${module.route ? ` (${module.route})` : ""}`,
        `  Acciones reales: ${module.actions.join(" | ")}`,
        `  Restricciones reales: ${module.restrictions.join(" | ")}`,
      ];
      if (module.usageNotes?.length) lines.push(`  Notas de uso: ${module.usageNotes.join(" | ")}`);
      return lines.join("\n");
    })
    .join("\n");
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

  return `Eres el asistente de ayuda interna de EmpatiQ, una aplicación de gestión de talento humano.
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

function buildCompleteSystemPrompt(mode: ChatMode, pageContext?: PageContext | null, userContext?: UserContext | null, userMessage = "") {
  if (mode === "data_analysis") {
    return "El chat de analisis de datos no se atiende desde este asistente. Indica que el usuario debe usar el Asistente de Datos IA para metricas, conteos, tendencias o consultas internas. No inventes datos.";
  }

  const userName = userContext?.displayName?.trim();
  const personalizationContext = userName
    ? `\nEl usuario se llama ${userName}. Si la conversacion es nueva, saludalo brevemente usando solo ese primer nombre y con calidez. No repitas saludos si la conversacion ya esta en curso.`
    : `\n${userContext?.isNewConversation ? "Saluda de forma breve, amable y cercana al inicio." : "No repitas saludos si la conversacion ya esta en curso."}`;
  const moduleContext = pageContext?.moduleLabel
    ? `\nContexto actual del usuario: viene del modulo ${pageContext.moduleLabel}${pageContext.pathname ? ` (${pageContext.pathname})` : ""}. Si la pregunta es ambigua, interpreta primero desde ese modulo.`
    : "";
  const appUsageKnowledge = buildAppUsageKnowledge(pageContext, userMessage);

  return `Eres el asistente de ayuda interna de EmpatiQ, una aplicacion de gestion de talento humano.
Tu alcance es orientar sobre el uso de la app, resolver dudas operativas, ayudar a razonar procesos y hacer calculos o analisis con la informacion que el usuario escriba en el chat.
No consultes ni inventes datos reales de empleados, contratos, nomina, candidatos o reportes. Si el usuario pide conteos, tendencias, metricas o listados internos que dependan de la base de datos, explica con naturalidad que debe usar el Asistente de Datos IA.
Si el usuario te entrega numeros, fechas, porcentajes, salarios, duraciones, cantidades o tablas en el mensaje, puedes calcular, comparar, validar consistencia y resumir hallazgos. Muestra la operacion o el criterio de forma breve para que el resultado sea verificable.
No des asesoria legal definitiva. Puedes orientar en lenguaje practico sobre donde registrar informacion, que flujo usar o que validacion revisar dentro de la app.
Usa un tono humano, calido, amable y jovial, como una persona experta que acompana sin sonar robotica. Responde en espanol.${personalizationContext}

FUENTE DE VERDAD SOBRE USO REAL DE LA APP:
- Usa primero la ficha de conocimiento estructurado incluida abajo. Esta ficha representa el comportamiento real de EmpatiQ en esta version.
- Si una pregunta menciona un modulo, ruta, permiso, accion, restriccion o flujo incluido en la ficha, responde con esos nombres y reglas.
- Si algo no aparece en la ficha ni en el contexto de la conversacion, dilo claramente y sugiere revisar el modulo correspondiente o el Manual de Usuario desde el menu de perfil.
- Distingue siempre entre "Asistente de Ayuda" (uso de la app) y "Asistente de Datos IA" (metricas, conteos, tendencias y datos internos).

FICHA DE CONOCIMIENTO RELEVANTE:
${appUsageKnowledge || "- No se detecto modulo especifico; responde con conocimiento general de navegacion y permisos de EmpatiQ."}

ESTILO DE RESPUESTA:
- Prioriza respuestas naturales en parrafos cortos. Evita sonar como plantilla, manual tecnico o checklist salvo que el usuario pida pasos.
- No llenes la respuesta de titulos, tablas o listas por defecto. Usa estructura solo cuando ayude de verdad a entender un proceso, una comparacion o un calculo.
- Si el usuario pregunta como hacer algo, entrega la ruta, el flujo completo, validaciones, permisos necesarios y resultado esperado, pero con lenguaje conversacional.
- Para calculos y analisis, se preciso: identifica supuestos, realiza operaciones paso a paso solo lo necesario y da una conclusion clara.
- Si falta un dato indispensable, pregunta una sola cosa concreta. Si puedes responder con supuestos razonables, dilo y continua.
- No incluyas secciones de "Proximos clics recomendados", badges ni cierres decorativos.
- No uses "Paso 1 de N" ni esperes confirmacion para continuar, a menos que el usuario pida acompanamiento paso a paso.

CONOCIMIENTO ACTUALIZADO DE LA APP:
- SuperAdmin tiene Empresas, Usuarios y Roles. La matriz de acceso permite permisos base por modulo y permisos especiales independientes por item, incluyendo aprobaciones por area y analiticas.
- Los grids de Empresas, Usuarios y Matriz tienen estilo flat con mayor contraste, bordes visibles y menos brillo.
- En SuperAdmin Usuarios se muestran correos reales desde Auth mediante un RPC protegido para admin/superadmin; si no existe correo visible, se muestra "correo no disponible".
- El menu de perfil muestra el nombre del usuario como dato principal y el correo como secundario.
- Usuarios no admin pueden crear contratos, crear requisiciones, retirar empleados y operar dotacion, procesos disciplinarios y examenes medicos si su rol tiene permisos.
- Empleados tiene filtros Todos, Activos, Inactivos, Retirados, En Retiro y Nuevos. Inactivo es deshabilitacion administrativa; Retirado viene del retiro formal.
- Los enlaces de registro de empleados pueden tener nombre, campos configurables y modal con scroll.
- Consulta 360 consolida perfil, laboral, contratos, retiros, vacaciones, permisos, incapacidades, capacitaciones, evaluaciones, salud, dotacion, novedades, turnos, documentos, auditoria, linea de tiempo, alertas y calidad del expediente. Los retiros muestran tipo de terminacion y motivo.
- Contratos tiene Nuevo Contrato con tabs General, Ubicacion y Contrato. La carga fue optimizada. Las plantillas reemplazan placeholders de empresa, empleado, salario, cargo, centro, fechas y duracion.
- Proceso de Retiro incluye tipo de terminacion, motivo, fechas, checklist documental, folio/archivo automatico, firma legal cuando corresponde y certificacion laboral desde el checklist. La autorizacion de retiro de cesantias se genera sin encabezado ni pie. Al completar retiro, el contrato queda Terminado y se bloquean editar, prorrogar y generar documentos.
- Certificaciones laborales se generan desde Empleados o desde Proceso de Retiro, en modo automatico o manual, con opcion de incluir salario, folio y verificacion.
- Requisiciones: Nueva Requisicion es responsiva, con tabs flat y campos alineados. Dia de descanso soporta 2 Dias, 4 Dias y 7 Dias. El detalle tiene tabs mejorados y scroll vertical.
- Seleccion y Vacantes usa el mismo patron responsivo en Nueva Vacante y gestiona vacantes, candidatos, etapas y documentos.
- Dotacion, procesos disciplinarios y examenes medicos respetan permisos por rol para creacion y gestion.
- Novedades fue ajustado para ser responsivo.
- Centro de notificaciones inteligente permite reglas por rol, evento y canal, incluyendo notificaciones en app y correo.
- Asistente de Datos IA es distinto a este chat: sirve para analisis de datos con permisos por usuario y consultas controladas.
- Capacitaciones pueden crearse manualmente o con IA, generar contenido, medios, audio, video o avatar segun configuracion de IA.
- Configuracion IA define proveedor/modelo y API keys. El Manual de Usuario esta disponible desde el menu de perfil.
${moduleContext}`;
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
      temperature: 0.35,
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

function extractProviderError(provider: string, status: number, errorText: string) {
  try {
    const parsed = JSON.parse(errorText);
    const message = parsed?.error?.message || parsed?.message || parsed?.error;
    if (message) return `${provider}: ${message}`;
  } catch (_) {
    // Keep the raw text below when the provider does not return JSON.
  }
  return `${provider}: error ${status}${errorText ? ` - ${errorText.slice(0, 240)}` : ""}`;
}

async function callGeminiDirect(apiKey: string, systemPrompt: string, messages: ChatMessage[], preferredModel?: string) {
  const modelCandidates = [
    preferredModel,
    Deno.env.get("GEMINI_CHAT_MODEL"),
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter((model, index, list): model is string => !!model && list.indexOf(model) === index);

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
      const errorText = await response.text();
      lastError = extractProviderError(`Gemini ${model}`, response.status, errorText);
      console.error("Gemini direct error:", response.status, model, errorText);
      if ([400, 404].includes(response.status)) continue;
      throw new Error(lastError);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim() || "No pude generar una respuesta.";
  }

  throw new Error(lastError || "Gemini no pudo generar una respuesta.");
}

async function callOpenAIDirect(apiKey: string, systemPrompt: string, messages: ChatMessage[], preferredModel?: string) {
  const modelCandidates = [
    preferredModel,
    Deno.env.get("OPENAI_CHAT_MODEL"),
    "gpt-4o-mini",
    "gpt-4o",
  ].filter((model, index, list): model is string => !!model && list.indexOf(model) === index);

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
        ...messages,
      ],
      temperature: 0.35,
    }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastError = extractProviderError(`OpenAI ${model}`, response.status, errorText);
      console.error("OpenAI direct error:", response.status, model, errorText);
      if ([400, 404].includes(response.status)) continue;
      throw new Error(lastError);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta.";
  }

  throw new Error(lastError || "OpenAI no pudo generar una respuesta.");
}

async function generateAssistantAnswer(aiConfig: AIConfig, systemPrompt: string, messages: ChatMessage[]) {
  const providerOrder = [
    aiConfig.model,
    aiConfig.model === "openai" ? "gemini" : "openai",
    "lovable_ai",
  ].filter((provider, index, list): provider is string => !!provider && list.indexOf(provider) === index);

  const failures: string[] = [];

  for (const provider of providerOrder) {
    try {
      if (provider === "openai" && aiConfig.openai_api_key) {
        return {
          provider: "openai",
          answer: await callOpenAIDirect(aiConfig.openai_api_key, systemPrompt, messages, aiConfig.openai_model),
        };
      }

      if (provider === "gemini" && aiConfig.gemini_api_key) {
        return {
          provider: "gemini",
          answer: await callGeminiDirect(aiConfig.gemini_api_key, systemPrompt, messages, aiConfig.gemini_model),
        };
      }

      if (provider === "lovable_ai") {
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableApiKey) {
          failures.push("Lovable AI no tiene clave global configurada");
          continue;
        }
        return {
          provider: "lovable_ai",
          answer: await callGateway(lovableApiKey, systemPrompt, messages),
        };
      }
    } catch (error: any) {
      failures.push(error?.message || `Falló el proveedor ${provider}`);
      console.error("AI provider failed:", provider, error);
    }
  }

  throw new Error(
    failures.length
      ? `No pude conectar con los proveedores de IA configurados. Detalle: ${failures.join(" | ")}`
      : "No hay proveedor de IA configurado. Configura OpenAI o Gemini en Configuracion > IA.",
  );
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
          .map((item: any) => ({ role: item.role as ChatRole, content: item.content.trim().slice(0, 8000) }))
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
    if (!message || message.length > 8000) return jsonResponse({ error: "Escribe una pregunta de maximo 8000 caracteres" }, 400);
    if (mode === "data_analysis") return jsonResponse({ error: "El chat de análisis de datos estará disponible próximamente." }, 403);

    const [{ data: membership }, { data: superAdmin }] = await Promise.all([
      adminClient.from("user_company_assignments").select("id").eq("user_id", user.id).eq("company_id", companyId).maybeSingle(),
      adminClient.from("super_admins").select("id").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!membership && !superAdmin) return jsonResponse({ error: "No tienes acceso a esta empresa" }, 403);

    const activeConversationId = crypto.randomUUID();

    const { data: companyAiConfigRow } = await adminClient
      .from("system_config")
      .select("config_value")
      .eq("company_id", companyId)
      .eq("config_key", "ai_config")
      .maybeSingle();

    let globalAiConfigRow: { config_value?: unknown } | null = null;
    if (!companyAiConfigRow) {
      const { data } = await adminClient
          .from("system_config")
          .select("config_value")
          .is("company_id", null)
          .eq("config_key", "ai_config")
          .maybeSingle();
      globalAiConfigRow = data;
    }

    const aiConfigRow = companyAiConfigRow || globalAiConfigRow;
    const aiConfig = (aiConfigRow?.config_value || {}) as AIConfig;
    const conversationMessages: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];
    const systemPrompt = buildCompleteSystemPrompt(mode, pageContext, { displayName: userDisplayName, isNewConversation: history.length === 0 }, message);

    const { provider, answer } = await generateAssistantAnswer(aiConfig, systemPrompt, conversationMessages);

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
