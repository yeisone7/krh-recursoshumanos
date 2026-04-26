import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GATEWAY_IMAGE_MODEL = "google/gemini-3-pro-image-preview";

interface AIConfig {
  model?: string;
  gemini_api_key?: string;
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

async function generateImageGeminiDirect(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini direct image error:", response.status, errorText);
    throw new Error(`Gemini image API error: ${response.status}`);
  }
  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image in Gemini response");
}

async function generateImageGateway(apiKey: string, prompt: string): Promise<string> {
  const response = await fetchWithRetry(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GATEWAY_IMAGE_MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw { status: 429, message: "Límite de solicitudes excedido. Configure sus propias API keys en Configuración → IA." };
    }
    if (response.status === 402) {
      throw { status: 402, message: "Créditos insuficientes. Configure sus propias API keys en Configuración → IA." };
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageData) throw new Error("No image generated");
  return imageData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, title, content, puntosClave, courseId, skipUpload, companyId } = await req.json();

    if (!type || !title) {
      return new Response(
        JSON.stringify({ error: "type and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiConfig = await getAIConfig(companyId);
    const keyPoints = (puntosClave || []).slice(0, 5).join(", ");
    const spanishTextRule = "Idioma obligatorio: español latinoamericano. Si la imagen incluye texto, títulos, etiquetas, rótulos, ramas, iconos con palabras o secciones, TODO debe estar escrito únicamente en español, sin palabras en inglés. Revisa ortografía y tildes en español.";
    let prompt = "";

    switch (type) {
      case "imagen":
        prompt = `Genera una imagen profesional, educativa y visualmente atractiva que represente el tema de capacitación empresarial: "${title}". Puntos clave: ${keyPoints}. ${spanishTextRule} Estilo: ilustración corporativa limpia, colores profesionales, sin texto superpuesto salvo que sea estrictamente necesario y en español.`;
        break;
      case "mapa_mental":
        prompt = `Genera una imagen de un mapa mental profesional y visualmente organizado sobre: "${title}". Incluye como ramas principales: ${keyPoints}. ${spanishTextRule} Estilo: diagrama limpio con colores distinguibles, nodos bien espaciados, fondo claro, texto grande y legible en español.`;
        break;
      case "infografia":
        prompt = `Genera una infografía profesional vertical sobre: "${title}". Incluye estos puntos clave: ${keyPoints}. ${spanishTextRule} Estilo: diseño corporativo moderno, iconos representativos, secciones numeradas, colores profesionales, texto claro en español.`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unsupported media type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    let imageData: string;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const provider = aiConfig.model || "gateway";

    // Route based on selected provider in configuration
    if (provider === "gemini" && aiConfig.gemini_api_key) {
      console.log("Generating media via Gemini direct (selected in config):", type);
      try {
        imageData = await generateImageGeminiDirect(aiConfig.gemini_api_key, prompt);
      } catch (geminiErr: any) {
        console.warn("Gemini direct failed, falling back to Gateway:", geminiErr?.message);
        if (!LOVABLE_API_KEY) throw geminiErr;
        imageData = await generateImageGateway(LOVABLE_API_KEY, prompt);
      }
    } else if (provider === "openai" && aiConfig.openai_api_key) {
      // OpenAI selected: use Gateway with Gemini image model (OpenAI doesn't support same image gen format)
      console.log("Generating media via Gateway (OpenAI selected, using Gemini image model):", type);
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured for image generation");
      imageData = await generateImageGateway(LOVABLE_API_KEY, prompt);
    } else {
      // No provider configured or no API key: use Gateway
      if (!LOVABLE_API_KEY) throw new Error("No AI provider configured for images");
      console.log("Generating media via Gateway (default):", type, "model:", GATEWAY_IMAGE_MODEL);
      imageData = await generateImageGateway(LOVABLE_API_KEY, prompt);
    }

    // If skipUpload, return base64 directly (client will apply watermark and upload)
    let storedUrl = imageData;
    if (skipUpload) {
      // Return raw base64 for client-side watermarking
    } else if (courseId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const base64Part = imageData.split(",")[1];
        const binaryStr = atob(base64Part);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const fileName = `${courseId}/${type}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("training-media")
          .upload(fileName, bytes.buffer, { contentType: "image/png", upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("training-media").getPublicUrl(fileName);
          storedUrl = urlData.publicUrl;
        } else {
          console.warn("Upload failed, returning base64:", uploadError);
        }
      } catch (e) {
        console.warn("Storage upload failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ imageUrl: storedUrl, type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-training-media error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Error generating media");
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
