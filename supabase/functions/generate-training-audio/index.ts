import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SCRIPT_MODEL = "google/gemini-2.5-flash-lite";

interface AIConfig {
  openai_api_key?: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, puntosClave, duration, companyId, courseId } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiConfig = await getAIConfig(companyId);

    // TTS requires OpenAI API key
    if (!aiConfig.openai_api_key) {
      return new Response(
        JSON.stringify({ error: "Se requiere una API Key de OpenAI para generar audio. Configúrela en Configuración → IA." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wordCount = duration === "short" ? 150 : duration === "long" ? 750 : 400;
    const keyPoints = (puntosClave || []).slice(0, 5).join(", ");

    // Step 1: Generate narration script via Lovable AI Gateway
    console.log("Generating audio script with:", SCRIPT_MODEL);

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

    // Retry logic
    let scriptResponse: Response | null = null;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      scriptResponse = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: SCRIPT_MODEL,
          messages: [{ role: "user", content: scriptPrompt }],
          temperature: 0.7,
        }),
      });

      if (scriptResponse.status === 429 && attempt < maxRetries - 1) {
        const wait = (attempt + 1) * 5000;
        console.log(`Rate limited (429), retrying in ${wait}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      break;
    }

    if (!scriptResponse || !scriptResponse.ok) {
      if (scriptResponse?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intente de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (scriptResponse?.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Contacte al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await scriptResponse?.text();
      console.error("Script generation error:", scriptResponse?.status, errorText);
      throw new Error(`Script generation failed: ${scriptResponse?.status}`);
    }

    const scriptData = await scriptResponse.json();
    const scriptText = scriptData.choices?.[0]?.message?.content?.trim();

    if (!scriptText) {
      throw new Error("No script text generated");
    }

    console.log(`Script generated: ${scriptText.split(/\s+/).length} words. Generating TTS...`);

    // Step 2: Convert to speech using OpenAI TTS (requires user's own key)
    const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.openai_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: scriptText,
        voice: "nova",
        response_format: "mp3",
      }),
    });

    if (!ttsResponse.ok) {
      if (ttsResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes de OpenAI excedido. Intente de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await ttsResponse.text();
      console.error("TTS error:", ttsResponse.status, errorText);
      throw new Error(`TTS generation failed: ${ttsResponse.status}`);
    }

    // Step 3: Upload audio to storage
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    console.log(`Audio generated: ${audioBytes.length} bytes. Uploading...`);

    if (!courseId) throw new Error("courseId is required to store audio");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `${courseId}/audio_${duration}_${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("training-media")
      .upload(fileName, audioBytes.buffer, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) {
      console.warn("Upload failed:", uploadError);
      throw new Error("Failed to upload audio file");
    }

    const { data: urlData } = supabase.storage.from("training-media").getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ audioUrl: urlData.publicUrl, script: scriptText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-training-audio error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error generating audio" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
