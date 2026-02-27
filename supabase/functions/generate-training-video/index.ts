import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GATEWAY_TEXT_MODEL = "google/gemini-2.5-flash-lite";
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

const STYLE_PROMPTS: Record<string, string> = {
  clasico: "professional corporate illustration style, clean lines, business colors, modern flat design",
  pizarra: "chalk drawing on a dark green/black chalkboard, white and colored chalk, hand-drawn educational style",
  kawaii: "cute Japanese kawaii style, pastel colors, adorable characters, rounded shapes, cheerful mood",
  anime: "detailed Japanese anime style, vibrant colors, dynamic composition, expressive characters",
  acuarela: "artistic watercolor painting style, soft edges, flowing colors, elegant brush strokes, natural palette",
  retro: "vintage 1960s-70s illustration style, retro color palette, groovy typography feel, mid-century modern",
  legado: "ancient parchment manuscript style, sepia tones, calligraphic elements, classical ornamental borders",
  papiroflexia: "3D origami paper folding style, geometric paper shapes, clean folds, colorful paper textures, craft aesthetic",
};

const STYLE_LABELS: Record<string, string> = {
  clasico: "Clásico",
  pizarra: "Pizarra",
  kawaii: "Kawaii",
  anime: "Anime",
  acuarela: "Acuarela",
  retro: "Dibujo Retro",
  legado: "Legado",
  papiroflexia: "Papiroflexia",
};

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

async function generateScriptGeminiDirect(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini script error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function generateScriptGateway(apiKey: string, prompt: string): Promise<string> {
  const response = await fetchWithRetry(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GATEWAY_TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    if (response.status === 429) throw { status: 429, message: "Límite de solicitudes excedido. Configure sus propias API keys en Configuración → IA." };
    if (response.status === 402) throw { status: 402, message: "Créditos insuficientes. Configure sus propias API keys en Configuración → IA." };
    const errorText = await response.text();
    console.error("Script gateway error:", response.status, errorText);
    throw new Error(`Script generation failed: ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateImageGeminiDirect(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`;
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });
    if (!response.ok) { console.warn("Gemini image failed:", response.status); return null; }
    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.warn("Gemini image error:", e);
    return null;
  }
}

async function generateImageGateway(apiKey: string, prompt: string): Promise<string | null> {
  try {
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
    if (!response.ok) { console.warn("Gateway image failed:", response.status); return null; }
    const data = await response.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch (e) {
    console.warn("Gateway image error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseId, style = "clasico", duration = "medium", title, content, puntosClave, companyId } = await req.json();

    if (!title || !courseId) {
      return new Response(
        JSON.stringify({ error: "title and courseId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiConfig = await getAIConfig(companyId);
    const useGeminiDirect = aiConfig.model === "gemini" && !!aiConfig.gemini_api_key;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!useGeminiDirect && !LOVABLE_API_KEY) throw new Error("No AI provider configured");

    const sceneCount = duration === "short" ? 3 : duration === "long" ? 6 : 4;
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.clasico;
    const styleLabel = STYLE_LABELS[style] || "Clásico";
    const keyPoints = (puntosClave || []).slice(0, 6).join(", ");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Generate script
    const scriptPrompt = `Eres un experto en capacitación empresarial. Genera un guion narrado para un video educativo sobre "${title}".

Contexto del contenido: ${content?.substring(0, 1500) || "No disponible"}
Puntos clave: ${keyPoints || "No especificados"}

Genera exactamente ${sceneCount} escenas. Para cada escena incluye:
1. Título de la escena
2. Narración (texto que se leería en voz alta, 2-3 oraciones)
3. Descripción visual (qué se vería en la imagen de esa escena)

Responde en formato JSON con esta estructura exacta:
{
  "scenes": [
    {
      "title": "Título de la escena",
      "narration": "Texto de narración...",
      "visual_description": "Descripción de lo que se ve..."
    }
  ],
  "summary": "Resumen breve del video"
}`;

    console.log(`Generating script via ${useGeminiDirect ? 'Gemini direct' : 'Gateway'}...`);
    const scriptText = useGeminiDirect
      ? await generateScriptGeminiDirect(aiConfig.gemini_api_key!, scriptPrompt)
      : await generateScriptGateway(LOVABLE_API_KEY!, scriptPrompt);

    let script: { scenes: Array<{ title: string; narration: string; visual_description: string }>; summary: string };
    try {
      const jsonMatch = scriptText.match(/\{[\s\S]*\}/);
      script = JSON.parse(jsonMatch ? jsonMatch[0] : scriptText);
    } catch {
      script = {
        scenes: [{ title: "Escena 1", narration: scriptText, visual_description: title }],
        summary: title,
      };
    }

    console.log(`Script: ${script.scenes.length} scenes. Generating images in parallel...`);

    // Step 2: Generate images in parallel
    const imagePromises = script.scenes.map(async (scene, i) => {
      const imagePrompt = `Create an educational illustration for a training video scene. Topic: "${title}". Scene: "${scene.visual_description}". Style: ${stylePrompt}. No text overlays, clean composition, professional quality.`;
      
      const imageBase64 = useGeminiDirect
        ? await generateImageGeminiDirect(aiConfig.gemini_api_key!, imagePrompt)
        : await generateImageGateway(LOVABLE_API_KEY!, imagePrompt);

      if (!imageBase64) return null;

      try {
        const base64Part = imageBase64.split(",")[1];
        const binaryStr = atob(base64Part);
        const bytes = new Uint8Array(binaryStr.length);
        for (let j = 0; j < binaryStr.length; j++) {
          bytes[j] = binaryStr.charCodeAt(j);
        }
        const fileName = `${courseId}/video_${style}_scene_${i + 1}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("training-media")
          .upload(fileName, bytes.buffer, { contentType: "image/png", upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("training-media").getPublicUrl(fileName);
          return urlData.publicUrl;
        }
        return imageBase64;
      } catch {
        return imageBase64;
      }
    });

    const results = await Promise.all(imagePromises);
    const imageUrls = results.filter((url): url is string => url !== null);

    console.log(`${imageUrls.length} images. Saving...`);

    // Step 3: Save to training_media
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        await supabase.from("training_media").insert({
          course_id: courseId,
          type: "video",
          title: `${styleLabel} - Escena ${i + 1}: ${script.scenes[i]?.title || ""}`,
          description: script.scenes[i]?.narration || "",
          file_url: imageUrls[i],
          file_size: 0,
          metadata: {
            style,
            scene_index: i,
            visual_description: script.scenes[i]?.visual_description,
          },
          created_by: "system",
        });
      } catch (e) {
        console.warn("Failed to save media record:", e);
      }
    }

    return new Response(
      JSON.stringify({
        script,
        imageUrls,
        style: styleLabel,
        sceneCount: script.scenes.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-training-video error:", error);
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Error generating video content");
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
