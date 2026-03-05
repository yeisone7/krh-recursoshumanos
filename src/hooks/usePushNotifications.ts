import { useState, useEffect, useCallback } from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSupported] = useState(() => typeof Notification !== 'undefined');

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const vibrate = useCallback((pattern: number | number[] = [100, 50, 100]) => {
    try {
      navigator?.vibrate?.(pattern);
    } catch {
      // Vibration API not supported
    }
  }, []);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') return;

      // Vibrate on mobile
      vibrate([100, 50, 100]);

      try {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          ...options,
        });
      } catch {
        // SW notification fallback with vibrate
        navigator.serviceWorker?.ready.then((reg) => {
          reg.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            ...options,
            ...(({ vibrate: [100, 50, 100] }) as any),
          });
        });
      }
    },
    [isSupported, permission, vibrate]
  );

  return { permission, isSupported, requestPermission, sendNotification };
}
