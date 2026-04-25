import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_TOAST_ID = 'app-update-available';
const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION;

type VersionResponse = {
  version?: string;
};

export function AppUpdateNotifier() {
  const updateNotifiedRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

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

        updateNotifiedRef.current = true;
        toast.info('Hay una actualización disponible', {
          id: UPDATE_TOAST_ID,
          description: 'Actualiza para cargar la versión más reciente de KRH.',
          duration: Infinity,
          action: {
            label: 'Actualizar ahora',
            onClick: () => {
              window.sessionStorage.setItem('krh_pending_update_reload', latestVersion);
              window.location.assign(`${window.location.pathname}${window.location.search}${window.location.hash}`);
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
    const intervalId = window.setInterval(checkForUpdate, VERSION_CHECK_INTERVAL_MS);
    window.addEventListener('online', checkForUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}