import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIConfig {
  model?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
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

function getImageEndpoint(aiConfig: AIConfig): {
  url: string;
  headers: Record<string, string>;
  model: string;
  isDirectGemini: boolean;
} {
  // Image generation always uses Gemini models
  // Check if user has their own Gemini API key
  if (aiConfig.gemini_api_key) {
    const model = "gemini-2.0-flash-exp-image-generation";
    console.log("Using direct Google Gemini API for images with user key, model:", model);
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiConfig.gemini_api_key}`,
      headers: { "Content-Type": "application/json" },
      model,
      isDirectGemini: true,
    };
  }

  // Fallback to Lovable gateway
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("No API key configured");

  const useProModel = aiConfig.model === "openai";
  const model = useProModel
    ? "google/gemini-3-pro-image-preview"
    : "google/gemini-2.5-flash-image";
  console.log("Using Lovable gateway for images, model:", model);
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    model,
    isDirectGemini: false,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, title, content, puntosClave, companyId, courseId } = await req.json();

    if (!type || !title) {
      return new Response(
        JSON.stringify({ error: "type and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiConfig = await getAIConfig(companyId);
    const { url, headers, model, isDirectGemini } = getImageEndpoint(aiConfig);

    const keyPoints = (puntosClave || []).slice(0, 5).join(", ");
    let prompt = "";

    switch (type) {
      case "imagen":
        prompt = `Genera una imagen profesional, educativa y visualmente atractiva que represente el tema de capacitación empresarial: "${title}". Puntos clave: ${keyPoints}. Estilo: ilustración corporativa limpia, colores profesionales, sin texto superpuesto.`;
        break;
      case "mapa_mental":
        prompt = `Genera una imagen de un mapa mental profesional y visualmente organizado sobre: "${title}". Incluye como ramas principales: ${keyPoints}. Estilo: diagrama limpio con colores distinguibles, nodos bien espaciados, fondo claro, texto legible en español.`;
        break;
      case "infografia":
        prompt = `Genera una infografía profesional vertical sobre: "${title}". Incluye estos puntos clave: ${keyPoints}. Estilo: diseño corporativo moderno, iconos representativos, secciones numeradas, colores profesionales, texto en español.`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unsupported media type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log("Generating media:", type, "direct:", isDirectGemini);

    let imageData: string | undefined;

    if (isDirectGemini) {
      // Direct Gemini REST API call
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Límite de solicitudes excedido. Intente de nuevo en unos momentos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("Direct Gemini error:", response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const geminiResponse = await response.json();
      const parts = geminiResponse.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData);
      if (imagePart?.inlineData) {
        imageData = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      }
    } else {
      // Lovable gateway call
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Límite de solicitudes excedido. Intente de nuevo en unos momentos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Créditos insuficientes. Contacte al administrador." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiResponse = await response.json();
      imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    }

    if (!imageData) {
      throw new Error("No image generated");
    }

    // Upload to storage if courseId provided
    let storedUrl = imageData;
    if (courseId) {
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
  } catch (error) {
    console.error("generate-training-media error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error generating media" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
