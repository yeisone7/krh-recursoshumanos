import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const TRAINING_AI_CREATE_MODULES = ['capacitaciones', 'capacitaciones_ia'];

async function requireTrainingPermission(req: Request, supabase: any, companyId: string | undefined) {
  if (!companyId) throw { status: 400, message: 'companyId is required' };

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) throw { status: 401, message: 'No autorizado' };

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) throw { status: 401, message: 'No autorizado' };

  const { data: systemRole } = await supabase
    .from('user_custom_roles')
    .select('id, custom_roles!inner(is_system,is_active)')
    .eq('user_id', userId)
    .eq('custom_roles.is_system', true)
    .eq('custom_roles.is_active', true)
    .limit(1);

  const isSystemRole = Boolean(systemRole?.length);
  const permissionChecks = await Promise.all(
    TRAINING_AI_CREATE_MODULES.map((moduleCode) =>
      supabase.rpc('check_user_permission', {
        _user_id: userId,
        _module_code: moduleCode,
        _action: 'create',
      })
    )
  );
  const hasPermission = permissionChecks.some(({ data }) => data === true);

  if (!isSystemRole) {
    const { data: assignment } = await supabase
      .from('user_company_assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (!assignment || !hasPermission) {
      throw { status: 403, message: 'No tienes permiso para generar video avatar en esta empresa.' };
    }
  }

  return userId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, companyId } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestUserId = await requireTrainingPermission(req, supabase, companyId);

    // Get HeyGen API key from system_config
    const { data: configData } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('company_id', companyId)
      .eq('config_key', 'ai_config')
      .single();

    const heygenApiKey = configData?.config_value?.heygen_api_key;
    if (!heygenApiKey) {
      return new Response(
        JSON.stringify({ error: 'No se ha configurado la API Key de HeyGen. Ve a Configuración > IA para agregarla.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: List available avatars
    if (action === 'list_avatars') {
      const response = await fetch('https://api.heygen.com/v2/avatars', {
        headers: { 'X-Api-Key': heygenApiKey },
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`HeyGen API error: ${response.status} - ${err}`);
      }
      const data = await response.json();
      const avatars = (data?.data?.avatars || []).map((a: any) => ({
        avatar_id: a.avatar_id,
        avatar_name: a.avatar_name,
        preview_image_url: a.preview_image_url,
        gender: a.gender,
      }));
      return new Response(
        JSON.stringify({ avatars }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Test API key
    if (action === 'test') {
      const response = await fetch('https://api.heygen.com/v2/avatars', {
        headers: { 'X-Api-Key': heygenApiKey },
      });
      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Error ${response.status}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const data = await response.json();
      const count = data?.data?.avatars?.length || 0;
      return new Response(
        JSON.stringify({ success: true, avatarCount: count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Generate video
    if (action === 'generate') {
      const { script, avatarId, courseId } = body;
      if (!script) {
        return new Response(
          JSON.stringify({ error: 'Se requiere un guion (script) para generar el video' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const videoPayload: any = {
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatarId || 'default',
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: script,
            voice_id: 'es_male_roberto', // Spanish male voice
          },
        }],
        dimension: { width: 1280, height: 720 },
      };

      const response = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'X-Api-Key': heygenApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoPayload),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`HeyGen generate error: ${response.status} - ${err}`);
      }

      const result = await response.json();
      const videoId = result?.data?.video_id;

      if (!videoId) {
        throw new Error('No se recibió video_id de HeyGen');
      }

      return new Response(
        JSON.stringify({ videoId, status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Check video status
    if (action === 'check_status') {
      const { videoId, courseId } = body;
      if (!videoId) {
        return new Response(
          JSON.stringify({ error: 'Se requiere videoId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-Api-Key': heygenApiKey },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`HeyGen status error: ${response.status} - ${err}`);
      }

      const result = await response.json();
      const videoStatus = result?.data?.status;

      if (videoStatus === 'completed') {
        const videoUrl = result?.data?.video_url;

        // Download video and upload to storage
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        const fileName = `${courseId}/avatar_${Date.now()}.mp4`;

        const { error: uploadError } = await supabase.storage
          .from('training-media')
          .upload(fileName, videoBlob, { contentType: 'video/mp4', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('training-media').getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        // Insert media record
        const authHeader = req.headers.get('authorization');
        let createdBy: string | null = requestUserId;
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          createdBy = user?.id || null;
        }

        await supabase.from('training_media').insert({
          course_id: courseId,
          type: 'video',
          title: 'Avatar Presentador',
          description: 'Video generado con avatar IA de HeyGen',
          file_url: publicUrl,
          file_size: videoBlob.size,
          metadata: { source: 'heygen', video_id: videoId, is_avatar: true },
          created_by: createdBy || '00000000-0000-0000-0000-000000000000',
        });

        return new Response(
          JSON.stringify({ status: 'completed', videoUrl: publicUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (videoStatus === 'failed') {
        return new Response(
          JSON.stringify({ status: 'failed', error: result?.data?.error || 'Video generation failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Acción no reconocida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-training-avatar:', error);
    const status = error?.status || 500;
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
