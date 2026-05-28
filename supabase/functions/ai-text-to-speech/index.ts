import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Manejar preflight de CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text, voice = 'nova', model = 'tts-1-hd', speed = 0.98 } = await req.json();
    
    if (!text) {
      return new Response(JSON.stringify({ error: 'El texto es obligatorio' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Obtener la API Key de OpenAI desde la configuración del sistema
    const { data: aiConfig } = await supabaseClient
      .from("system_config")
      .select("config_value")
      .eq("config_key", "ai_config")
      .maybeSingle();
      
    const apiKey = aiConfig?.config_value?.openai_api_key || Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key de OpenAI no configurada' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2. Llamar a la API de OpenAI TTS
    console.log(`[ai-text-to-speech] Generando audio para: "${text.substring(0, 50)}..."`);
    
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice, // alloy, echo, fable, onyx, nova, shimmer
        speed,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[ai-text-to-speech] Error de OpenAI: ${err}`);
      return new Response(JSON.stringify({ error: 'Error en OpenAI TTS', details: err }), { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 3. Devolver el flujo de audio
    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600"
      },
    });

  } catch (error) {
    console.error(`[ai-text-to-speech] Error no controlado: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
