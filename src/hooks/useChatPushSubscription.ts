import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const chatClient = supabase as any;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export function useChatPushSubscription(enabled = true) {
  const { user } = useAuth();

  useEffect(() => {
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!enabled) return;
    if (!user?.id || !vapidPublicKey) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (cancelled) return;

        const subscription =
          (await registration.pushManager.getSubscription()) ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }));

        const payload = subscription.toJSON();
        const p256dh = payload.keys?.p256dh;
        const auth = payload.keys?.auth;
        if (!subscription.endpoint || !p256dh || !auth) return;

        await chatClient.from('chat_push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        );
      } catch (error) {
        console.warn('Chat push subscription skipped:', error);
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [enabled, user?.id]);
}
