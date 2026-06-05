import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_TOAST_ID = 'app-update-available';
const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION;
const CURRENT_BUILD_ID = import.meta.env.VITE_BUILD_ID;
const ACKNOWLEDGED_UPDATE_KEY = 'empatiq_acknowledged_update_version';
const APPLYING_UPDATE_KEY = 'empatiq_applying_update_version';

const PUBLIC_ROUTES = ['/registro', '/capacitacion', '/descargos'];

type VersionResponse = {
  version?: string;
  buildId?: string;
};

type AppUpdateEvent = CustomEvent<{
  updateSW?: (reloadPage?: boolean) => Promise<void>;
}>;

const getCurrentDeploymentKey = () => CURRENT_BUILD_ID || CURRENT_APP_VERSION || null;

const acknowledgeDeploymentKey = (deploymentKey: string) => {
  localStorage.setItem(ACKNOWLEDGED_UPDATE_KEY, deploymentKey);
};

export function AppUpdateNotifier() {
  const auth = useOptionalAuth();
  const location = useLocation();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => location.pathname.startsWith(route));

  if (isPublicRoute || !auth) return null;

  return <AppUpdateNotifierContent />;
}

function AppUpdateNotifierContent() {
  const { data: systemConfig } = useSystemConfig();
  const updateNotifiedRef = useRef(false);
  const activeUpdateKeyRef = useRef<string | null>(null);
  const pendingServiceWorkerUpdateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  const updateCheckConfig = systemConfig?.app_update_check;
  const updateCheckEnabled = updateCheckConfig?.enabled ?? true;
  const updateCheckMinutes = Math.max(1, Math.min(1440, updateCheckConfig?.minutes ?? 5));
  const checkIntervalMs = updateCheckMinutes * 60 * 1000 || VERSION_CHECK_INTERVAL_MS;

  const fetchLatestDeploymentKey = useCallback(async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}app-version.json?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as VersionResponse;
    return data.buildId || data.version || null;
  }, []);

  const forceRefreshToLatest = useCallback(async (deploymentKey: string) => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          try {
            await registration.update();
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          } catch {
            // Continue with the next registration.
          }
        }
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // If cleanup fails, still navigate with a cache-busting URL.
    }

    const url = new URL(window.location.href);
    url.searchParams.set('refresh', deploymentKey.slice(0, 8));
    url.searchParams.set('ts', Date.now().toString());
    window.location.replace(url.toString());
  }, []);

  const applyUpdate = useCallback(
    async (deploymentKey: string, useServiceWorkerUpdate?: boolean) => {
      acknowledgeDeploymentKey(deploymentKey);
      sessionStorage.setItem(APPLYING_UPDATE_KEY, deploymentKey);
      toast.dismiss(UPDATE_TOAST_ID);

      const updateSW = pendingServiceWorkerUpdateRef.current;
      if (useServiceWorkerUpdate && updateSW) {
        let navigationStarted = false;
        const handleBeforeUnload = () => {
          navigationStarted = true;
        };

        window.addEventListener('beforeunload', handleBeforeUnload, { once: true });

        try {
          await Promise.race([
            updateSW(true),
            new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
          ]);
        } finally {
          window.removeEventListener('beforeunload', handleBeforeUnload);
        }

        if (navigationStarted) return;
      }

      await forceRefreshToLatest(deploymentKey);
    },
    [forceRefreshToLatest],
  );

  const showUpdateToast = useCallback(
    (deploymentKey: string, options?: { useServiceWorkerUpdate?: boolean }) => {
      const currentDeploymentKey = getCurrentDeploymentKey();
      if (currentDeploymentKey && deploymentKey === currentDeploymentKey) {
        acknowledgeDeploymentKey(deploymentKey);
        sessionStorage.removeItem(APPLYING_UPDATE_KEY);
        activeUpdateKeyRef.current = null;
        updateNotifiedRef.current = false;
        toast.dismiss(UPDATE_TOAST_ID);
        return;
      }

      if (localStorage.getItem(ACKNOWLEDGED_UPDATE_KEY) === deploymentKey) return;
      if (sessionStorage.getItem(APPLYING_UPDATE_KEY) === deploymentKey) return;
      if (activeUpdateKeyRef.current === deploymentKey) return;

      activeUpdateKeyRef.current = deploymentKey;
      updateNotifiedRef.current = true;

      toast.info('Nueva versión disponible', {
        id: UPDATE_TOAST_ID,
        description: 'Se han aplicado mejoras y correcciones importantes.',
        duration: Infinity,
        action: {
          label: 'Actualizar',
          onClick: async () => {
            await applyUpdate(deploymentKey, options?.useServiceWorkerUpdate);
          },
        },
        cancel: {
          label: 'Más tarde',
          onClick: () => {
            acknowledgeDeploymentKey(deploymentKey);
            activeUpdateKeyRef.current = null;
            updateNotifiedRef.current = false;
            toast.dismiss(UPDATE_TOAST_ID);
          },
        },
      });
    },
    [applyUpdate],
  );

  useEffect(() => {
    if (!updateCheckEnabled) return;

    const handleServiceWorkerUpdate = (event: Event) => {
      const updateEvent = event as AppUpdateEvent;
      pendingServiceWorkerUpdateRef.current = updateEvent.detail?.updateSW || null;
      const fallbackDeploymentKey = getCurrentDeploymentKey() || 'service-worker-update';

      void fetchLatestDeploymentKey()
        .then((latestDeploymentKey) => {
          const deploymentKey = latestDeploymentKey || fallbackDeploymentKey;
          const currentDeploymentKey = getCurrentDeploymentKey();

          if (currentDeploymentKey && deploymentKey === currentDeploymentKey) {
            acknowledgeDeploymentKey(deploymentKey);
            sessionStorage.removeItem(APPLYING_UPDATE_KEY);
            return;
          }

          showUpdateToast(deploymentKey, {
            useServiceWorkerUpdate: true,
          });
        })
        .catch(() => {
          showUpdateToast(fallbackDeploymentKey, {
            useServiceWorkerUpdate: true,
          });
        });
    };

    window.addEventListener('empatiq-app-update-available', handleServiceWorkerUpdate);
    return () => {
      window.removeEventListener('empatiq-app-update-available', handleServiceWorkerUpdate);
    };
  }, [fetchLatestDeploymentKey, showUpdateToast, updateCheckEnabled]);

  useEffect(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

    if (!updateCheckEnabled) {
      toast.dismiss(UPDATE_TOAST_ID);
      activeUpdateKeyRef.current = null;
      updateNotifiedRef.current = false;
      return;
    }

    let isMounted = true;

    const checkForUpdate = async () => {
      if (!navigator.onLine || updateNotifiedRef.current) return;

      try {
        const latestDeploymentKey = await fetchLatestDeploymentKey();
        const currentDeploymentKey = getCurrentDeploymentKey();

        if (!isMounted || !latestDeploymentKey) return;

        if (latestDeploymentKey !== currentDeploymentKey) {
          showUpdateToast(latestDeploymentKey);
          return;
        }

        acknowledgeDeploymentKey(latestDeploymentKey);
        sessionStorage.removeItem(APPLYING_UPDATE_KEY);
        activeUpdateKeyRef.current = null;
        updateNotifiedRef.current = false;
      } catch {
        // Silent retry on the next interval.
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
  }, [checkIntervalMs, fetchLatestDeploymentKey, showUpdateToast, updateCheckEnabled]);

  return null;
}
