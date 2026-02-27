import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { type, title, content, puntosClave, companyId, courseId } = await req.json();

    if (!type || !title) {
      return new Response(
        JSON.stringify({ error: "type and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read AI config for model preference
    let useProModel = false;
    try {
      if (companyId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: configRow } = await supabase
          .from("system_config")
          .select("config_value")
          .eq("company_id", companyId)
          .eq("config_key", "ai_config")
          .maybeSingle();
        if (configRow?.config_value?.model === "openai") {
          useProModel = true;
        }
      }
    } catch (e) {
      console.warn("Could not read AI config:", e);
    }

    const imageModel = useProModel
      ? "google/gemini-3-pro-image-preview"
      : "google/gemini-2.5-flash-image";

    let prompt = "";
    const keyPoints = (puntosClave || []).slice(0, 5).join(", ");

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

    console.log("Generating media:", type, "with model:", imageModel);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageModel,
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
    const imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;

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

        // Decode base64 image
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
