import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GATEWAY_TEXT_MODEL = "google/gemini-2.5-flash-lite";
const GATEWAY_IMAGE_MODEL = "google/gemini-2.5-flash-image";
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
  gemini_api_key?: string;
  openai_api_key?: string;
  gemini_model?: string;
  gemini_image_model?: string;
  openai_model?: string;
  openai_image_model?: string;
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

async function getRequestUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Sesión inválida. Inicia sesión para generar storyboard." };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await authClient.auth.getClaims(token);
  const userId = (data?.claims as { sub?: string } | undefined)?.sub;

  if (error || !userId) {
    throw { status: 401, message: "No se pudo validar la sesión del usuario." };
  }

  return userId;
}

async function requireTrainingPermission(userId: string, companyId: string | undefined) {
  if (!companyId) throw { status: 400, message: "companyId is required" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: systemRole } = await supabase
    .from("user_custom_roles")
    .select("id, custom_roles!inner(is_system,is_active)")
    .eq("user_id", userId)
    .eq("custom_roles.is_system", true)
    .eq("custom_roles.is_active", true)
    .limit(1);

  const isSystemRole = Boolean(systemRole?.length);
  const { data: legacyAdminRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);

  const isLegacyAdmin = Boolean(legacyAdminRole?.length);
  const { data: companyAdminRole } = await supabase
    .from("user_custom_roles")
    .select("id, custom_roles!inner(name,is_active,company_id)")
    .eq("user_id", userId)
    .eq("custom_roles.company_id", companyId)
    .eq("custom_roles.is_active", true);

  const isCompanyAdminRole = (companyAdminRole || []).some((row: any) =>
    ADMIN_ROLE_NAMES.includes(String(row.custom_roles?.name || "").trim().toLowerCase())
  );

  if (isSystemRole || isLegacyAdmin || isCompanyAdminRole) return;

  const permissionChecks = await Promise.all(
    TRAINING_AI_ALLOWED_PERMISSIONS.map((permission) =>
      supabase.rpc("check_user_permission", {
        _user_id: userId,
        _module_code: permission.module,
        _action: permission.action,
      })
    )
  );
  const hasPermission = permissionChecks.some(({ data }) => data === true);

  const { data: assignment } = await supabase
    .from("user_company_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!assignment || !hasPermission) {
    throw { status: 403, message: "No tienes permiso para generar storyboard en esta empresa." };
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

async function generateImageGeminiDirect(apiKey: string, prompt: string, preferredModel?: string): Promise<string | null> {
  const modelCandidates = uniqueStrings([
    preferredModel,
    Deno.env.get("GEMINI_IMAGE_MODEL"),
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-lite-image",
    "gemini-3.1-pro-image",
    "gemini-2.5-flash-image-preview",
    "gemini-2.0-flash-preview-image-generation",
    "gemini-3-flash-preview",
  ]);
  let lastError = "";

  for (const model of modelCandidates) {
    const interactionResponse = await fetchWithRetry("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        input: [{ type: "text", text: prompt }],
      }),
    });

    if (interactionResponse.ok) {
      const data = await interactionResponse.json();
      const outputImage = data.output_image || data.outputImage;
      if (outputImage?.data) {
        return `data:${outputImage.mime_type || outputImage.mimeType || "image/png"};base64,${outputImage.data}`;
      }

      const steps = Array.isArray(data.steps) ? data.steps : [];
      for (const step of steps) {
        const image = step.output_image || step.outputImage || step.image;
        if (image?.data) {
          return `data:${image.mime_type || image.mimeType || "image/png"};base64,${image.data}`;
        }
      }
    } else {
      lastError = extractProviderError(`Gemini Interactions ${model}`, interactionResponse.status, await interactionResponse.text());
      console.warn("Gemini interactions image failed:", lastError);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });

    if (!response.ok) {
      lastError = extractProviderError(`Gemini ${model}`, response.status, await response.text());
      console.warn("Gemini image failed:", lastError);
      if ([400, 403, 404].includes(response.status)) continue;
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      const inlineData = part.inlineData || part.inline_data;
      if (inlineData?.data) {
        return `data:${inlineData.mimeType || inlineData.mime_type || "image/png"};base64,${inlineData.data}`;
      }
      const fileUri = part.fileData?.fileUri || part.file_data?.file_uri;
      if (fileUri) {
        return fileUri;
      }
    }
    lastError = `Gemini ${model}: no devolvio ninguna imagen`;
  }

  console.warn("Gemini image error:", lastError);
  return null;
}

async function generateImageOpenAIDirect(apiKey: string, prompt: string, preferredModel?: string): Promise<string | null> {
  const modelCandidates = uniqueStrings([
    preferredModel,
    Deno.env.get("OPENAI_IMAGE_MODEL"),
    "gpt-image-1",
    "dall-e-3",
  ]);
  let lastError = "";

  for (const model of modelCandidates) {
    const response = await fetchWithRetry("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      lastError = extractProviderError(`OpenAI ${model}`, response.status, await response.text());
      console.warn("OpenAI image failed:", lastError);
      if ([400, 403, 404].includes(response.status)) continue;
      return null;
    }

    const data = await response.json();
    const imageData = data.data?.[0]?.url || data.data?.[0]?.b64_json;
    if (data.data?.[0]?.b64_json && imageData && !imageData.startsWith("data:")) {
      return `data:image/png;base64,${imageData}`;
    }
    if (imageData) return imageData;

    lastError = `OpenAI ${model}: no devolvio ninguna imagen`;
  }

  console.warn("OpenAI image error:", lastError);
  return null;
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

async function storeGeneratedImage(
  supabase: ReturnType<typeof createClient>,
  source: string,
  fileName: string
) {
  if (!source.startsWith("data:")) return source;

  const base64Part = source.split(",")[1];
  if (!base64Part) return source;

  const mimeMatch = source.match(/^data:([^;]+);base64,/);
  const contentType = mimeMatch?.[1] || "image/png";
  const binaryStr = atob(base64Part);
  const bytes = new Uint8Array(binaryStr.length);
  for (let j = 0; j < binaryStr.length; j++) {
    bytes[j] = binaryStr.charCodeAt(j);
  }

  const { error: uploadError } = await supabase.storage
    .from("training-media")
    .upload(fileName, bytes.buffer, { contentType, upsert: true });

  if (uploadError) {
    console.warn("Failed to upload generated image:", uploadError.message);
    return source;
  }

  const { data: urlData } = supabase.storage.from("training-media").getPublicUrl(fileName);
  return urlData.publicUrl;
}

async function generateImageForConfiguredProvider(
  aiConfig: AIConfig,
  lovableApiKey: string | undefined,
  prompt: string
) {
  const provider = aiConfig.model || "gateway";

  if (provider === "gemini" && aiConfig.gemini_api_key) {
    return await withTimeout(
      generateImageGeminiDirect(aiConfig.gemini_api_key, prompt, aiConfig.gemini_image_model || aiConfig.gemini_model),
      IMAGE_TIMEOUT_MS
    );
  }

  if (provider === "openai" && aiConfig.openai_api_key) {
    return await withTimeout(
      generateImageOpenAIDirect(aiConfig.openai_api_key, prompt, aiConfig.openai_image_model),
      IMAGE_TIMEOUT_MS
    );
  }

  if ((provider === "gateway" || provider === "lovable_ai") && lovableApiKey) {
    return await withTimeout(generateImageGateway(lovableApiKey, prompt), IMAGE_TIMEOUT_MS);
  }

  return null;
}

Deno.serve(async (req) => {
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

    const requestUserId = await getRequestUserId(req);
    await requireTrainingPermission(requestUserId, companyId);

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
      const imageSource = await generateImageForConfiguredProvider(aiConfig, LOVABLE_API_KEY || undefined, imagePrompt);

      let finalUrl = imageSource || '';
      if (imageSource) {
        try {
          const fileName = `${courseId}/video_${style}_scene_regen_${regenerateScene}_${Date.now()}.png`;
          finalUrl = await storeGeneratedImage(supabase, imageSource, fileName);
        } catch { /* keep provider URL/data */ }

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
            created_by: requestUserId,
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

      const imageSource = await generateImageForConfiguredProvider(aiConfig, LOVABLE_API_KEY || undefined, imagePrompt);

      if (!imageSource) return null;

      try {
        const fileName = `${courseId}/video_${style}_scene_${i + 1}_${Date.now()}.png`;
        return await storeGeneratedImage(supabase, imageSource, fileName);
      } catch {
        return imageSource;
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
          created_by: requestUserId,
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
