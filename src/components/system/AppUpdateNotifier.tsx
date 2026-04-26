import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_TOAST_ID = 'app-update-available';
const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION;
const ACKNOWLEDGED_UPDATE_KEY = 'krh_acknowledged_update_version';

type VersionResponse = {
  version?: string;
};

export function AppUpdateNotifier() {
  const auth = useOptionalAuth();

  return auth ? <AppUpdateNotifierContent /> : null;
}

function AppUpdateNotifierContent() {
  const { data: systemConfig } = useSystemConfig();
  const updateNotifiedRef = useRef(false);
  const updateCheckConfig = systemConfig?.app_update_check;
  const updateCheckEnabled = updateCheckConfig?.enabled ?? true;
  const updateCheckMinutes = Math.max(1, Math.min(1440, updateCheckConfig?.minutes ?? 5));
  const checkIntervalMs = updateCheckMinutes * 60 * 1000 || VERSION_CHECK_INTERVAL_MS;

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!updateCheckEnabled) {
      toast.dismiss(UPDATE_TOAST_ID);
      updateNotifiedRef.current = false;
      return;
    }

    let isMounted = true;

    const checkForUpdate = async () => {
      if (!navigator.onLine || updateNotifiedRef.current) return;

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}app-version.json?ts=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!response.ok) return;

        const data = (await response.json()) as VersionResponse;
        const latestVersion = data.version;

        if (!isMounted || !latestVersion || latestVersion === CURRENT_APP_VERSION) return;
        if (window.sessionStorage.getItem(ACKNOWLEDGED_UPDATE_KEY) === latestVersion) return;

        updateNotifiedRef.current = true;
        toast.dismiss(UPDATE_TOAST_ID);
        toast.info('Hay una actualización disponible', {
          id: UPDATE_TOAST_ID,
          description: 'Actualiza para cargar la versión más reciente de KRH.',
          duration: Infinity,
          action: {
            label: 'Actualizar ahora',
            onClick: () => {
              window.sessionStorage.setItem(ACKNOWLEDGED_UPDATE_KEY, latestVersion);
              toast.dismiss(UPDATE_TOAST_ID);
              const url = new URL(window.location.href);
              url.searchParams.set('refresh', latestVersion.slice(0, 12));
              window.location.replace(url.toString());
            },
          },
        });
      } catch {
        // Si la verificación falla, se reintentará automáticamente en el siguiente ciclo.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate();
      }
    };

    void checkForUpdate();
    const intervalId = window.setInterval(checkForUpdate, checkIntervalMs);
    window.addEventListener('online', checkForUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkIntervalMs, updateCheckEnabled]);

  return null;
}