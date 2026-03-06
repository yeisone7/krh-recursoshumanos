import { supabase } from '@/integrations/supabase/client';

function parseUserAgent(ua: string) {
  let browser = 'Desconocido';
  let os = 'Desconocido';
  let deviceType = 'desktop';

  // Browser detection
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  // OS detection
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Device type
  if (ua.includes('Mobile') || ua.includes('Android') && !ua.includes('Tablet')) deviceType = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'tablet';

  return { browser, os, deviceType };
}

export async function logSession(userId: string, email: string | undefined) {
  try {
    const ua = navigator.userAgent;
    const { browser, os, deviceType } = parseUserAgent(ua);

    await supabase.from('session_logs').insert({
      user_id: userId,
      user_email: email || null,
      browser,
      os,
      device_type: deviceType,
      user_agent: ua,
      is_current: true,
    });
  } catch (err) {
    console.error('Error logging session:', err);
  }
}
