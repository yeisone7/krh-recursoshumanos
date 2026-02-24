import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { title, type, area, audience, level, objective, legalFramework, riskLevel, duration, language, pdfText, additionalContext } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Eres un experto en capacitación empresarial colombiana, especializado en seguridad industrial, HSEQ, calidad y desarrollo organizacional. Genera contenido de capacitación estructurado y profesional en español.

IMPORTANTE: Responde SOLO con el JSON solicitado, sin texto adicional ni bloques de código.`;

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

Genera un JSON con esta estructura exacta:
{
  "introduccion": "Párrafo introductorio de 3-5 líneas",
  "objetivos": ["objetivo 1", "objetivo 2", "objetivo 3"],
  "contenido": "Contenido principal en formato Markdown con títulos ##, listas, negritas. Mínimo 500 palabras. Incluir secciones relevantes al tema.",
  "puntosClave": ["punto clave 1", "punto clave 2", "punto clave 3", "punto clave 4", "punto clave 5"],
  "evaluacion": [
    {
      "pregunta": "¿Pregunta de evaluación?",
      "respuestaCorrecta": "Opción A (correcta)",
      "opciones": ["Opción A (correcta)", "Opción B", "Opción C", "Opción D"]
    }
  ]
}

La evaluación debe tener mínimo 5 preguntas. La primera opción (índice 0) SIEMPRE debe ser la respuesta correcta y debe coincidir con respuestaCorrecta.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
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
    const rawContent = aiResponse.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON from the AI response (may be wrapped in ```json blocks)
    let parsed;
    try {
      const cleaned = rawContent
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse AI-generated content");
    }

    // Validate structure
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
