import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GATEWAY_IMAGE_MODEL = "openai/dall-e-3"; // Usamos DALL-E-3 via gateway por estabilidad

interface AIConfig {
  model?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
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
  const { data: hasPermission } = await adminClient.rpc("check_user_permission", {
    _user_id: userId,
    _module_code: "capacitaciones",
    _action: "create",
  });

  if (!isSystemRole) {
    const { data: assignment } = await adminClient
      .from("user_company_assignments")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!assignment || !hasPermission) {
      throw { status: 403, message: "No tienes permiso para generar medios de capacitación en esta empresa." };
    }
  }
}

async function getAIConfig(companyId: string | undefined): Promise<AIConfig> {
  console.log("getAIConfig called for companyId:", companyId);
  if (!companyId) return {};
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn("SUPABASE_URL or SERVICE_ROLE_KEY missing in environment");
      return {};
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: configRow, error } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("company_id", companyId)
      .eq("config_key", "ai_config")
      .maybeSingle();
    
    if (error) {
      console.warn("Database error fetching AI config:", error.message);
      return {};
    }

    return (configRow?.config_value as AIConfig) || {};
  } catch (e) {
    console.warn("Unexpected error reading AI config from DB:", e);
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
  console.log("Generating with Gemini 1.5 Flash Direct...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { 
        // Note: For actual image generation via Gemini API, specific endpoints like Imagen are often used.
        // If Gemini 1.5 Flash is used for text-to-image in a specific tier, this works.
        // If not, we'll suggest using OpenAI for images if they have both keys.
        responseModalities: ["IMAGE", "TEXT"] 
      },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini direct image error:", response.status, errorText);
    throw new Error(`Gemini image API error: ${response.status}. Asegúrese de que su API Key tenga acceso a generación de imágenes.`);
  }
  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No se generó ninguna imagen en la respuesta de Gemini. Considere usar OpenAI para imágenes si el problema persiste.");
}

async function generateImageOpenAIDirect(apiKey: string, prompt: string): Promise<string> {
  console.log("Generating with OpenAI ChatGPT Images 2.0 (gpt-image-1.5) Direct...");
  const response = await fetchWithRetry("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1.5",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody.error?.message || `Status ${response.status}`;
    console.error("OpenAI direct image error details:", response.status, JSON.stringify(errorBody));
    throw new Error(`OpenAI (gpt-image-1.5) dice: ${errorMessage}`);
  }

  const result = await response.json();
  console.log("OpenAI full response structure:", JSON.stringify(result).substring(0, 500));

  // Handle both URL and Base64 formats
  const imageData = result.data?.[0]?.url || result.data?.[0]?.b64_json;
  
  if (!imageData) {
    console.error("OpenAI response missing image data. Full JSON:", JSON.stringify(result));
    throw new Error("OpenAI no devolvió ninguna imagen. Verifique si el modelo gpt-image-1.5 está disponible en su región.");
  }

  // If it's already base64, prepend the data URI prefix if missing
  if (result.data?.[0]?.b64_json && !imageData.startsWith("data:")) {
    return `data:image/png;base64,${imageData}`;
  }

  return imageData;
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
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Request body received:", JSON.stringify(body));
    const { type, title, content, puntosClave, courseId, skipUpload, companyId } = body;
    await requireTrainingPermission(req, companyId);

    if (!type || !title) {
      console.error("Missing required fields:", { type, title });
      return new Response(
        JSON.stringify({ error: "type and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing request for type:", type, "title:", title);
    const aiConfig = await getAIConfig(companyId);
    console.log("AI Config loaded:", { model: aiConfig.model, hasGemini: !!aiConfig.gemini_api_key, hasOpenAI: !!aiConfig.openai_api_key });
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
    
    console.log("Using provider:", provider, "Has LOVABLE_API_KEY:", !!LOVABLE_API_KEY);

    // Route based on selected provider in configuration
    if (provider === "gemini" && aiConfig.gemini_api_key) {
      console.log("Generating media via Gemini direct:", type);
      try {
        imageData = await generateImageGeminiDirect(aiConfig.gemini_api_key, prompt);
      } catch (geminiErr: any) {
        console.warn("Gemini direct failed. Not falling back to avoid hiding errors.");
        throw geminiErr;
      }
    } else if (provider === "openai" && aiConfig.openai_api_key) {
      console.log("Generating media via OpenAI direct:", type);
      try {
        imageData = await generateImageOpenAIDirect(aiConfig.openai_api_key, prompt);
      } catch (openaiErr: any) {
        console.warn("OpenAI direct failed. Not falling back to avoid hiding errors.");
        throw openaiErr;
      }
    } else {
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY is missing in environment and no user keys found");
        throw new Error("No hay proveedores de IA configurados. Por favor configure sus API keys de OpenAI o Gemini.");
      }
      console.log("Generating media via Gateway (default):", type);
      imageData = await generateImageGateway(LOVABLE_API_KEY, prompt);
    }
    
    console.log("Image generation successful. Length:", imageData.length);

    // If skipUpload is true, we should still ensure the frontend can access the image (CORS)
    // If it's an external URL, we fetch it here and return as base64
    let storedUrl = imageData;
    
    if (skipUpload) {
      if (imageData.startsWith("http")) {
        console.log("Fetching external image to return as base64 (CORS bypass):", imageData);
        try {
          const imgRes = await fetch(imageData);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            // Convert to base64 safely without call stack overflow
            let binaryStr = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binaryStr += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binaryStr);
            const contentType = imgRes.headers.get("content-type") || "image/png";
            storedUrl = `data:${contentType};base64,${base64}`;
            console.log("Successfully converted external URL to base64 for frontend");
          }
        } catch (e) {
          console.warn("Could not proxy image for CORS, returning original URL:", e);
        }
      }
    } else if (courseId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        let bytes: Uint8Array;
        if (imageData.startsWith("data:")) {
          const base64Part = imageData.split(",")[1];
          const binaryStr = atob(base64Part);
          bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
        } else {
          console.log("Fetching image from URL for storage:", imageData);
          const imgRes = await fetch(imageData);
          if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
          const arrayBuffer = await imgRes.arrayBuffer();
          bytes = new Uint8Array(arrayBuffer);
        }

        const fileName = `${courseId}/${type}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("training-media")
          .upload(fileName, bytes.buffer, { contentType: "image/png", upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("training-media").getPublicUrl(fileName);
          storedUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.warn("Storage upload process failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ imageUrl: storedUrl, type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-training-media error:", error);
    const status = error?.status || 200;
    const message = error?.message || (error instanceof Error ? error.message : "Error generating media");
    
    // Provider errors remain 200 to preserve the existing frontend handling. Auth errors use their status.
    return new Response(
      JSON.stringify({ error: message, details: error?.toString() }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
