import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, type, area, audience, level, objective, legalFramework, riskLevel, duration, language, pdfText, additionalContext } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres un experto en capacitación empresarial colombiana, especializado en seguridad industrial, HSEQ, calidad y desarrollo organizacional. Genera contenido de capacitación estructurado y profesional en español.`;

    const userPrompt = `Genera una capacitación completa con los siguientes parámetros:

- Título: ${title}
- Tipo: ${type || 'General'}
- Área: ${area || 'General'}
- Público objetivo: ${audience || 'Todo el personal'}
- Nivel: ${level || 'Básico'}
- Objetivo: ${objective || 'Capacitar al personal en el tema indicado'}
- Marco legal/Norma: ${legalFramework || 'N/A'}
- Nivel de riesgo: ${riskLevel || 'Medio'}
- Duración estimada: ${duration || '30'} minutos
- Idioma: ${language || 'Español'}

${pdfText ? `\nContenido de referencia extraído de PDF:\n${pdfText.substring(0, 8000)}\n` : ''}
${additionalContext ? `\nContexto adicional proporcionado:\n${additionalContext}\n` : ''}

Genera el contenido de la capacitación usando la función generate_training_content. La evaluación debe tener mínimo 5 preguntas. La primera opción (índice 0) SIEMPRE debe ser la respuesta correcta y debe coincidir con respuestaCorrecta. El contenido principal debe ser en formato Markdown con títulos ##, listas, negritas. Mínimo 500 palabras.`;

    console.log("Calling Lovable AI Gateway with model:", DEFAULT_MODEL);

    const requestBody = JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      tools: [
        {
          type: "function",
          function: {
            name: "generate_training_content",
            description: "Genera el contenido estructurado de una capacitación empresarial",
            parameters: {
              type: "object",
              properties: {
                introduccion: { type: "string", description: "Párrafo introductorio de 3-5 líneas" },
                objetivos: { type: "array", items: { type: "string" }, description: "Lista de 3+ objetivos" },
                contenido: { type: "string", description: "Contenido principal en Markdown, mínimo 500 palabras" },
                puntosClave: { type: "array", items: { type: "string" }, description: "5+ puntos clave" },
                evaluacion: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      pregunta: { type: "string" },
                      respuestaCorrecta: { type: "string" },
                      opciones: { type: "array", items: { type: "string" } },
                    },
                    required: ["pregunta", "respuestaCorrecta", "opciones"],
                  },
                  description: "5+ preguntas de evaluación",
                },
              },
              required: ["introduccion", "objetivos", "contenido", "puntosClave", "evaluacion"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_training_content" } },
    });

    // Retry logic for rate limits
    let response: Response | null = null;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      if (response.status === 429 && attempt < maxRetries - 1) {
        const wait = (attempt + 1) * 5000;
        console.log(`Rate limited (429), retrying in ${wait}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intente de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response?.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Contacte al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response?.text();
      console.error("AI error:", response?.status, errorText);
      throw new Error(`AI error: ${response?.status}`);
    }

    const aiResponse = await response.json();
    
    // Extract from tool call response
    let parsed;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
        throw new Error("Failed to parse AI-generated content from tool call");
      }
    } else {
      // Fallback: try parsing from content directly
      const rawContent = aiResponse.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error("No content returned from AI");
      try {
        const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI response:", rawContent);
        throw new Error("Failed to parse AI-generated content");
      }
    }

    if (!parsed.introduccion || !parsed.objetivos || !parsed.contenido || !parsed.puntosClave || !parsed.evaluacion) {
      throw new Error("AI response missing required fields");
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-training error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error generating training content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
