import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

interface AIConfig {
  model?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
}

async function getAIConfig(companyId: string | undefined, supabase: any): Promise<AIConfig> {
  if (!companyId) return {};
  try {
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

function getTextEndpoint(aiConfig: AIConfig): {
  url: string;
  headers: Record<string, string>;
  model: string;
} {
  const provider = aiConfig.model || "gemini";

  if (provider === "openai" && aiConfig.openai_api_key) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${aiConfig.openai_api_key}`, "Content-Type": "application/json" },
      model: "gpt-4o-mini",
    };
  }
  if (provider === "gemini" && aiConfig.gemini_api_key) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: { Authorization: `Bearer ${aiConfig.gemini_api_key}`, "Content-Type": "application/json" },
      model: "gemini-2.5-flash-preview-04-17",
    };
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("No API key configured");
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    model: "google/gemini-3-flash-preview",
  };
}

function getImageEndpoint(aiConfig: AIConfig): {
  url: string;
  headers: Record<string, string>;
  model: string;
  isDirectGemini: boolean;
} {
  if (aiConfig.gemini_api_key) {
    const model = "gemini-2.0-flash-preview-image-generation";
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiConfig.gemini_api_key}`,
      headers: { "Content-Type": "application/json" },
      model,
      isDirectGemini: true,
    };
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("No API key configured");
  const useProModel = aiConfig.model === "openai";
  const model = useProModel ? "google/gemini-3-pro-image-preview" : "google/gemini-2.5-flash-image";
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    model,
    isDirectGemini: false,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const { courseId, style = "clasico", duration = "medium", title, content, puntosClave, companyId } = await req.json();

    if (!title || !courseId) {
      return new Response(
        JSON.stringify({ error: "title and courseId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sceneCount = duration === "short" ? 3 : duration === "long" ? 6 : 4;
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.clasico;
    const styleLabel = STYLE_LABELS[style] || "Clásico";
    const keyPoints = (puntosClave || []).slice(0, 6).join(", ");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const aiConfig = await getAIConfig(companyId, supabase);
    const textEndpoint = getTextEndpoint(aiConfig);
    const imageEndpoint = getImageEndpoint(aiConfig);

    // Step 1: Generate script
    console.log("Generating script with:", textEndpoint.model);
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

    const scriptResponse = await fetch(textEndpoint.url, {
      method: "POST",
      headers: textEndpoint.headers,
      body: JSON.stringify({
        model: textEndpoint.model,
        messages: [{ role: "user", content: scriptPrompt }],
      }),
    });

    if (!scriptResponse.ok) {
      if (scriptResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intente de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (scriptResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Contacte al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await scriptResponse.text();
      console.error("Script error:", scriptResponse.status, errorText);
      throw new Error(`Script generation failed: ${scriptResponse.status}`);
    }

    const scriptData = await scriptResponse.json();
    const scriptText = scriptData.choices?.[0]?.message?.content || "";

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

    console.log(`Script: ${script.scenes.length} scenes. Generating images with ${imageEndpoint.isDirectGemini ? "direct Gemini" : "Lovable gateway"}...`);

    // Step 2: Generate images
    const imageUrls: string[] = [];
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const imagePrompt = `Create an educational illustration for a training video scene. Topic: "${title}". Scene: "${scene.visual_description}". Style: ${stylePrompt}. No text overlays, clean composition, professional quality.`;

      try {
        console.log(`Image ${i + 1}/${script.scenes.length}...`);
        let imageBase64: string | undefined;

        if (imageEndpoint.isDirectGemini) {
          const imgResponse = await fetch(imageEndpoint.url, {
            method: "POST",
            headers: imageEndpoint.headers,
            body: JSON.stringify({
              contents: [{ parts: [{ text: imagePrompt }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          });
          if (!imgResponse.ok) {
            console.warn(`Image ${i + 1} failed: ${imgResponse.status}`);
            continue;
          }
          const geminiData = await imgResponse.json();
          const parts = geminiData.candidates?.[0]?.content?.parts || [];
          const imagePart = parts.find((p: any) => p.inlineData);
          if (imagePart?.inlineData) {
            imageBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
          }
        } else {
          const imgResponse = await fetch(imageEndpoint.url, {
            method: "POST",
            headers: imageEndpoint.headers,
            body: JSON.stringify({
              model: imageEndpoint.model,
              messages: [{ role: "user", content: imagePrompt }],
              modalities: ["image", "text"],
            }),
          });
          if (!imgResponse.ok) {
            console.warn(`Image ${i + 1} failed: ${imgResponse.status}`);
            continue;
          }
          const imgData = await imgResponse.json();
          imageBase64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        }

        if (imageBase64) {
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
              imageUrls.push(urlData.publicUrl);
            } else {
              imageUrls.push(imageBase64);
            }
          } catch (e) {
            imageUrls.push(imageBase64);
          }
        }
      } catch (e) {
        console.warn(`Error scene ${i + 1}:`, e);
      }
    }

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
  } catch (error) {
    console.error("generate-training-video error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error generating video content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
