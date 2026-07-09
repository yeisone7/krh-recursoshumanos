import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SCRIPT_MODEL = "google/gemini-1.5-flash";
const TRAINING_AI_ALLOWED_PERMISSIONS = [
  { module: "capacitaciones_ia", action: "view" },
  { module: "capacitaciones_ia", action: "create" },
  { module: "capacitaciones_ia", action: "update" },
  { module: "capacitaciones", action: "view" },
  { module: "capacitaciones", action: "create" },
  { module: "capacitaciones", action: "update" },
  { module: "capacitaciones_manual", action: "view" },
  { module: "capacitaciones_manual", action: "create" },
  { module: "capacitaciones_manual", action: "update" },
  { module: "capacitaciones_biblioteca", action: "view" },
  { module: "capacitaciones_biblioteca", action: "create" },
  { module: "capacitaciones_biblioteca", action: "update" },
];
const ADMIN_ROLE_NAMES = ["administrador", "admin", "super admin", "superadmin"];

interface AIConfig {
  model?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
  openai_model?: string;
  openai_tts_model?: string;
  openai_tts_voice?: string;
  gemini_model?: string;
  gemini_tts_model?: string;
  gemini_tts_voice?: string;
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
  const { data: companyAdminRole } = await adminClient
    .from("user_custom_roles")
    .select("id, custom_roles!inner(name,is_active,company_id)")
    .eq("user_id", userId)
    .eq("custom_roles.company_id", companyId)
    .eq("custom_roles.is_active", true);

  const isCompanyAdminRole = (companyAdminRole || []).some((row: any) =>
    ADMIN_ROLE_NAMES.includes(String(row.custom_roles?.name || "").trim().toLowerCase())
  );

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

  if (!isSystemRole && !isLegacyAdmin && !isCompanyAdminRole) {
    const { data: assignment } = await adminClient
      .from("user_company_assignments")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!assignment || !hasPermission) {
      throw { status: 403, message: "No tienes permiso para generar audio de capacitación en esta empresa." };
    }
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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
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

async function generateOpenAITTS(apiKey: string, scriptText: string, preferredModel?: string, preferredVoice?: string): Promise<Uint8Array> {
  const modelCandidates = uniqueStrings([
    preferredModel,
    Deno.env.get("OPENAI_TTS_MODEL"),
    "gpt-4o-mini-tts",
    "tts-1-hd",
    "tts-1",
  ]);
  const voice = preferredVoice || Deno.env.get("OPENAI_TTS_VOICE") || "coral";
  let lastError = "";

  for (const model of modelCandidates) {
    const body: Record<string, unknown> = {
      model,
      input: scriptText,
      voice,
      response_format: "mp3",
    };

    if (model === "gpt-4o-mini-tts") {
      body.instructions = "Narra en espanol latinoamericano con tono profesional, claro y amable para una capacitacion empresarial.";
    }

    const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!ttsResponse.ok) {
      lastError = extractProviderError(`OpenAI TTS ${model}`, ttsResponse.status, await ttsResponse.text());
      console.error("TTS error:", lastError);
      if ([400, 403, 404].includes(ttsResponse.status)) continue;
      throw { status: ttsResponse.status, message: lastError };
    }

    return new Uint8Array(await ttsResponse.arrayBuffer());
  }

  throw { status: 502, message: lastError || "OpenAI no pudo generar el audio." };
}

function createWavFromPcm(pcmBytes: Uint8Array, sampleRate = 24000, channels = 1, bitsPerSample = 16): Uint8Array {
  const headerSize = 44;
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true);
  view.setUint16(32, channels * bitsPerSample / 8, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, headerSize).set(pcmBytes);

  return new Uint8Array(buffer);
}

async function generateGeminiTTS(
  apiKey: string,
  scriptText: string,
  preferredModel?: string,
  preferredVoice?: string
): Promise<{ bytes: Uint8Array; contentType: string; extension: string }> {
  const modelCandidates = uniqueStrings([
    preferredModel,
    Deno.env.get("GEMINI_TTS_MODEL"),
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts",
  ]);
  const voice = preferredVoice || Deno.env.get("GEMINI_TTS_VOICE") || "Kore";
  let lastError = "";

  for (const model of modelCandidates) {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        input: `Narra en espanol latinoamericano, con tono profesional, claro y amable para una capacitacion empresarial: ${scriptText}`,
        response_format: { type: "audio" },
        generation_config: {
          speech_config: [{ voice }],
        },
      }),
    });

    if (!response.ok) {
      lastError = extractProviderError(`Gemini TTS ${model}`, response.status, await response.text());
      console.error("Gemini TTS error:", lastError);
      if ([400, 403, 404].includes(response.status)) continue;
      throw { status: response.status, message: lastError };
    }

    const data = await response.json();
    const outputAudio = data.output_audio || data.outputAudio;
    const base64Audio = outputAudio?.data;
    if (base64Audio) {
      const binary = atob(base64Audio);
      const pcmBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) pcmBytes[i] = binary.charCodeAt(i);

      const mimeType = outputAudio.mime_type || outputAudio.mimeType || "audio/pcm";
      if (mimeType.includes("wav") || mimeType.includes("mpeg") || mimeType.includes("mp3")) {
        return {
          bytes: pcmBytes,
          contentType: mimeType.includes("mpeg") || mimeType.includes("mp3") ? "audio/mpeg" : "audio/wav",
          extension: mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3" : "wav",
        };
      }

      return {
        bytes: createWavFromPcm(pcmBytes),
        contentType: "audio/wav",
        extension: "wav",
      };
    }

    lastError = `Gemini TTS ${model}: no devolvio audio`;
  }

  throw { status: 502, message: lastError || "Gemini no pudo generar el audio." };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, puntosClave, duration, companyId, courseId } = await req.json();
    await requireTrainingPermission(req, companyId);

    if (!title) return jsonResponse({ error: "title is required" }, 400);

    const aiConfig = await getAIConfig(companyId);
    const provider = aiConfig.model || "openai";

    const wordCount = duration === "short" ? 150 : duration === "long" ? 750 : 400;
    const keyPoints = (puntosClave || []).slice(0, 5).join(", ");

    const scriptPrompt = `Eres un narrador profesional de capacitaciones empresariales. Genera un guion de narración en español para ser convertido a audio (text-to-speech).
Tema: "${title}"
Contenido de referencia: ${content?.substring(0, 2000) || "No disponible"}
Puntos clave: ${keyPoints || "No especificados"}
Requisitos:
- Aproximadamente ${wordCount} palabras
- Tono profesional pero amigable, como un podcast educativo
- Sin encabezados ni formato, solo texto corrido para narrar
- Incluir una introducción breve, desarrollo de puntos clave y cierre
- NO incluir indicaciones como "[Música]", "[Pausa]", etc.
Responde SOLO con el texto del guion, sin comillas ni formato adicional.`;

    let scriptText = "";

    // Step 1: Generate narration script via Direct API or Gateway
    try {
      if (provider === "openai" && aiConfig.openai_api_key) {
        console.log("Generating audio script via OpenAI direct...");
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${aiConfig.openai_api_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiConfig.openai_model || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
            messages: [{ role: "user", content: scriptPrompt }],
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`OpenAI script error: ${errBody.error?.message || res.status}`);
        }
        const data = await res.json();
        scriptText = data.choices?.[0]?.message?.content?.trim();
      } else if (provider === "gemini" && aiConfig.gemini_api_key) {
        console.log("Generating audio script via Gemini direct...");
        const scriptModel = aiConfig.gemini_model || Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${scriptModel}:generateContent?key=${aiConfig.gemini_api_key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: scriptPrompt }] }],
          }),
        });
        if (!res.ok) throw new Error(`Gemini script error: ${res.status}`);
        const data = await res.json();
        scriptText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      } else {
        console.log("Generating audio script via Gateway (fallback)...");
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("No hay API Keys configuradas ni acceso al Gateway.");
        const res = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: SCRIPT_MODEL,
            messages: [{ role: "user", content: scriptPrompt }],
          }),
        });
        if (!res.ok) throw new Error(`Gateway script error: ${res.status}`);
        const data = await res.json();
        scriptText = data.choices?.[0]?.message?.content?.trim();
      }
    } catch (err: any) {
      console.error("Script generation failed:", err);
      return jsonResponse({ error: `Fallo al generar el guion: ${err.message}` }, err?.status || 502);
    }

    if (!scriptText) throw new Error("No se pudo generar el texto del guion.");

    console.log("Script generated successfully. Word count:", scriptText.split(" ").length);

    if (!scriptText) {
      throw new Error("No script text generated");
    }

    console.log(`Script generated: ${scriptText.split(/\s+/).length} words. Generating TTS...`);

    let audioResult: { bytes: Uint8Array; contentType: string; extension: string };

    if (provider === "gemini") {
      if (!aiConfig.gemini_api_key) {
        throw { status: 400, message: "No hay API Key de Gemini configurada para generar audio." };
      }
      audioResult = await generateGeminiTTS(
        aiConfig.gemini_api_key,
        scriptText,
        aiConfig.gemini_tts_model,
        aiConfig.gemini_tts_voice
      );
    } else {
      if (!aiConfig.openai_api_key) {
        throw { status: 400, message: "No hay API Key de OpenAI configurada para generar audio." };
      }
      const audioBytes = await generateOpenAITTS(
        aiConfig.openai_api_key,
        scriptText,
        aiConfig.openai_tts_model,
        aiConfig.openai_tts_voice
      );
      audioResult = {
        bytes: audioBytes,
        contentType: "audio/mpeg",
        extension: "mp3",
      };
    }

    console.log(`Audio generated: ${audioResult.bytes.length} bytes. Uploading...`);

    if (!courseId) throw new Error("courseId is required to store audio");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `${courseId}/audio_${duration}_${Date.now()}.${audioResult.extension}`;
    const { error: uploadError } = await supabase.storage
      .from("training-media")
      .upload(fileName, audioResult.bytes.buffer, { contentType: audioResult.contentType });

    if (uploadError) {
      console.warn("Upload failed:", uploadError);
      throw new Error("Failed to upload audio file");
    }

    const { data: urlData } = supabase.storage.from("training-media").getPublicUrl(fileName);

    return jsonResponse({ audioUrl: urlData.publicUrl, script: scriptText });
  } catch (error: any) {
    console.error("generate-training-audio error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Error generating audio");
    return jsonResponse({ error: message }, status);
  }
});
