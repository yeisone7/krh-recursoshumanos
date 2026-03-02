import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GATEWAY_TEXT_MODEL = "google/gemini-2.5-flash-lite";
const GATEWAY_IMAGE_MODEL = "google/gemini-2.5-flash-image";

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

const IMAGE_TIMEOUT_MS = 45000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

// --- Text generation (script) ---

async function generateScriptGeminiDirect(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
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

async function generateScriptOpenAIDirect(apiKey: string, prompt: string): Promise<string> {
  const response = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI script error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
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

// --- Image generation ---

async function generateImageGeminiDirect(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
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
    const { courseId, style = "clasico", duration = "medium", title, content, puntosClave, companyId, regenerateScene, existingScene } = await req.json();

    if (!title || !courseId) {
      return new Response(
        JSON.stringify({ error: "title and courseId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiConfig = await getAIConfig(companyId);
    const provider = aiConfig.model || "gateway";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Determine which provider to use for text (script) and images
    const useGeminiDirect = provider === "gemini" && !!aiConfig.gemini_api_key;
    const useOpenAIDirect = provider === "openai" && !!aiConfig.openai_api_key;

    if (!useGeminiDirect && !useOpenAIDirect && !LOVABLE_API_KEY) throw new Error("No AI provider configured");

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.clasico;
    const styleLabel = STYLE_LABELS[style] || "Clásico";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Single scene regeneration ──
    if (typeof regenerateScene === 'number' && existingScene) {
      console.log(`Regenerating single scene ${regenerateScene}...`);

      // Regenerate the script for this one scene
      const scenePrompt = `Eres un experto en capacitación empresarial. Reescribe esta escena de un video educativo sobre "${title}".
Escena original: Título: "${existingScene.title}", Narración: "${existingScene.narration}", Descripción visual: "${existingScene.visual_description || ''}".
Genera una versión diferente manteniendo el mismo tema pero con nueva redacción y enfoque visual.
Responde en JSON: { "title": "...", "narration": "...", "visual_description": "..." }`;

      let sceneText: string;
      if (useGeminiDirect) {
        sceneText = await generateScriptGeminiDirect(aiConfig.gemini_api_key!, scenePrompt);
      } else if (useOpenAIDirect) {
        sceneText = await generateScriptOpenAIDirect(aiConfig.openai_api_key!, scenePrompt);
      } else {
        sceneText = await generateScriptGateway(LOVABLE_API_KEY!, scenePrompt);
      }

      let newScene: { title: string; narration: string; visual_description: string };
      try {
        const jsonMatch = sceneText.match(/\{[\s\S]*\}/);
        newScene = JSON.parse(jsonMatch ? jsonMatch[0] : sceneText);
      } catch {
        newScene = { title: existingScene.title, narration: sceneText.substring(0, 200), visual_description: existingScene.visual_description || title };
      }

      // Generate new image
      const imagePrompt = `Create an educational illustration for a training video scene. Topic: "${title}". Scene: "${newScene.visual_description}". Style: ${stylePrompt}. No text overlays, clean composition, professional quality.`;
      let imageBase64: string | null = null;
      if (useGeminiDirect) {
        imageBase64 = await withTimeout(generateImageGeminiDirect(aiConfig.gemini_api_key!, imagePrompt), IMAGE_TIMEOUT_MS);
        if (!imageBase64 && LOVABLE_API_KEY) {
          imageBase64 = await withTimeout(generateImageGateway(LOVABLE_API_KEY, imagePrompt), IMAGE_TIMEOUT_MS);
        }
      } else if (LOVABLE_API_KEY) {
        imageBase64 = await withTimeout(generateImageGateway(LOVABLE_API_KEY, imagePrompt), IMAGE_TIMEOUT_MS);
      }

      let finalUrl = imageBase64 || '';
      if (imageBase64) {
        try {
          const base64Part = imageBase64.split(",")[1];
          const binaryStr = atob(base64Part);
          const bytes = new Uint8Array(binaryStr.length);
          for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j);
          const fileName = `${courseId}/video_${style}_scene_regen_${regenerateScene}_${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage.from("training-media").upload(fileName, bytes.buffer, { contentType: "image/png", upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("training-media").getPublicUrl(fileName);
            finalUrl = urlData.publicUrl;
          }
        } catch { /* keep base64 */ }

        // Update media record
        try {
          await supabase.from("training_media").insert({
            course_id: courseId,
            type: "video",
            title: `${styleLabel} - Escena ${regenerateScene + 1} (regen): ${newScene.title}`,
            description: newScene.narration,
            file_url: finalUrl,
            file_size: 0,
            metadata: { style, scene_index: regenerateScene, visual_description: newScene.visual_description, regenerated: true },
            created_by: "system",
          });
        } catch (e) { console.warn("Failed to save regen media:", e); }
      }

      return new Response(
        JSON.stringify({ scene: newScene, imageUrl: finalUrl, sceneIndex: regenerateScene }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Full storyboard generation ──
    const sceneCount = duration === "short" ? 3 : duration === "long" ? 6 : 4;
    const keyPoints = (puntosClave || []).slice(0, 6).join(", ");

    // Step 1: Generate script using the selected provider
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

    let scriptText: string;
    if (useGeminiDirect) {
      console.log("Generating script via Gemini direct...");
      scriptText = await generateScriptGeminiDirect(aiConfig.gemini_api_key!, scriptPrompt);
    } else if (useOpenAIDirect) {
      console.log("Generating script via OpenAI direct...");
      scriptText = await generateScriptOpenAIDirect(aiConfig.openai_api_key!, scriptPrompt);
    } else {
      console.log("Generating script via Gateway...");
      scriptText = await generateScriptGateway(LOVABLE_API_KEY!, scriptPrompt);
    }

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

    // Step 2: Generate images using the selected provider
    const imagePromises = script.scenes.map(async (scene, i) => {
      const imagePrompt = `Create an educational illustration for a training video scene. Topic: "${title}". Scene: "${scene.visual_description}". Style: ${stylePrompt}. No text overlays, clean composition, professional quality.`;

      let imageBase64: string | null = null;

      if (useGeminiDirect) {
        imageBase64 = await withTimeout(generateImageGeminiDirect(aiConfig.gemini_api_key!, imagePrompt), IMAGE_TIMEOUT_MS);
        // Fallback to gateway if Gemini direct fails
        if (!imageBase64 && LOVABLE_API_KEY) {
          imageBase64 = await withTimeout(generateImageGateway(LOVABLE_API_KEY, imagePrompt), IMAGE_TIMEOUT_MS);
        }
      } else {
        // OpenAI selected or no direct key: use Gateway for images
        if (LOVABLE_API_KEY) {
          imageBase64 = await withTimeout(generateImageGateway(LOVABLE_API_KEY, imagePrompt), IMAGE_TIMEOUT_MS);
        }
      }

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
