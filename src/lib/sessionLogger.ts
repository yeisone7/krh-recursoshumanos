import { supabase } from '@/integrations/supabase/client';

function parseUserAgent(ua: string) {
  let browser = 'Desconocido';
  let os = 'Desconocido';
  let deviceType = 'desktop';

  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  if (ua.includes('Mobile') || ua.includes('Android') && !ua.includes('Tablet')) deviceType = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'tablet';

  return { browser, os, deviceType };
}

async function fetchSessionGeo(): Promise<{ ip: string | null; city: string | null; country: string | null }> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/get-session-info`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Best-effort
  }
  return { ip: null, city: null, country: null };
}

export async function logSession(userId: string, email: string | undefined) {
  try {
    const ua = navigator.userAgent;
    const { browser, os, deviceType } = parseUserAgent(ua);

    // Insert session immediately
    const { data: inserted } = await supabase.from('session_logs').insert({
      user_id: userId,
      user_email: email || null,
      browser,
      os,
      device_type: deviceType,
      user_agent: ua,
      is_current: true,
    }).select('id').single();

    // Enrich with geolocation in background
    fetchSessionGeo().then(async (geo) => {
      if (inserted?.id && (geo.ip || geo.city || geo.country)) {
        await supabase.from('session_logs').update({
          ip_address: geo.ip,
          city: geo.city,
          country: geo.country,
        }).eq('id', inserted.id);
      }
    });
  } catch (err) {
    console.error('Error logging session:', err);
  }
}
