import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';

import { useLocation } from 'react-router-dom';

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_TOAST_ID = 'app-update-available';
const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION;
const CURRENT_BUILD_ID = import.meta.env.VITE_BUILD_ID;
const ACKNOWLEDGED_UPDATE_KEY = 'empatiq_acknowledged_update_version';

// Rutas públicas donde no queremos mostrar notificaciones de actualización
const PUBLIC_ROUTES = ['/registro', '/capacitacion', '/descargos'];

type VersionResponse = {
  version?: string;
  buildId?: string;
};

type AppUpdateEvent = CustomEvent<{
  updateSW?: (reloadPage?: boolean) => Promise<void>;
}>;

export function AppUpdateNotifier() {
  const auth = useOptionalAuth();
  const location = useLocation();

  // No mostrar en rutas públicas o si el usuario no está autenticado
  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));
  
  if (isPublicRoute || !auth) return null;

  return <AppUpdateNotifierContent />;
}

function AppUpdateNotifierContent() {
  const { data: systemConfig } = useSystemConfig();
  const updateNotifiedRef = useRef(false);
  const pendingServiceWorkerUpdateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const updateCheckConfig = systemConfig?.app_update_check;
  const updateCheckEnabled = updateCheckConfig?.enabled ?? true;
  const updateCheckMinutes = Math.max(1, Math.min(1440, updateCheckConfig?.minutes ?? 5));
  const checkIntervalMs = updateCheckMinutes * 60 * 1000 || VERSION_CHECK_INTERVAL_MS;

  const forceRefreshToLatest = async (deploymentKey: string) => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          try {
            await registration.update();
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          } catch {
            // Continuar con el siguiente registro
          }
        }
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Si falla la limpieza, continuamos con el refresco de URL
    }

    const url = new URL(window.location.href);
    url.searchParams.set('refresh', deploymentKey.slice(0, 8));
    url.searchParams.set('ts', Date.now().toString());
    window.location.replace(url.toString());
  };

  const showUpdateToast = (deploymentKey: string, options?: { useServiceWorkerUpdate?: boolean }) => {
    if (localStorage.getItem(ACKNOWLEDGED_UPDATE_KEY) === deploymentKey) return;

    updateNotifiedRef.current = true;

    toast.info('Nueva versión disponible', {
      id: UPDATE_TOAST_ID,
      description: 'Se han aplicado mejoras y correcciones importantes.',
      duration: Infinity,
      action: {
        label: 'Actualizar',
        onClick: async () => {
          localStorage.setItem(ACKNOWLEDGED_UPDATE_KEY, deploymentKey);
          toast.dismiss(UPDATE_TOAST_ID);

          const updateSW = pendingServiceWorkerUpdateRef.current;
          if (options?.useServiceWorkerUpdate && updateSW) {
            await updateSW(true);
            return;
          }

          await forceRefreshToLatest(deploymentKey);
        },
      },
      cancel: {
        label: 'Más tarde',
        onClick: () => {
          localStorage.setItem(ACKNOWLEDGED_UPDATE_KEY, deploymentKey);
          toast.dismiss(UPDATE_TOAST_ID);
        },
      },
    });
  };

  useEffect(() => {
    if (!updateCheckEnabled) return;

    const handleServiceWorkerUpdate = (event: Event) => {
      const updateEvent = event as AppUpdateEvent;
      pendingServiceWorkerUpdateRef.current = updateEvent.detail?.updateSW || null;
      showUpdateToast(`service-worker-update-${Date.now()}`, {
        useServiceWorkerUpdate: true,
      });
    };

    window.addEventListener('empatiq-app-update-available', handleServiceWorkerUpdate);
    return () => {
      window.removeEventListener('empatiq-app-update-available', handleServiceWorkerUpdate);
    };
  }, [updateCheckEnabled]);

  useEffect(() => {
    // En desarrollo local (localhost), evitamos la notificación de actualización 
    // para no molestar durante el ciclo de trabajo de desarrollo.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

    if (!updateCheckEnabled) {
      toast.dismiss(UPDATE_TOAST_ID);
      updateNotifiedRef.current = false;
      return;
    }

    let isMounted = true;

    const checkForUpdate = async () => {
      // Si ya notificamos en esta sesión, no volvemos a preguntar 
      // (a menos que se recargue o se limpie el ref)
      if (!navigator.onLine || updateNotifiedRef.current) return;

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}app-version.json?ts=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!response.ok) return;

        const data = (await response.json()) as VersionResponse;
        const latestVersion = data.version;
        const latestBuildId = data.buildId;
        const latestDeploymentKey = latestBuildId || latestVersion;
        const currentDeploymentKey = CURRENT_BUILD_ID || CURRENT_APP_VERSION;

        if (isMounted && latestDeploymentKey && latestDeploymentKey !== currentDeploymentKey) {
          showUpdateToast(latestDeploymentKey);
          return;
        }

        // Caso 1: Ya estamos en la versión más reciente
        if (!isMounted || !latestDeploymentKey || latestDeploymentKey === currentDeploymentKey) {
          // Si ya estábamos en la versión más reciente, nos aseguramos de limpiar 
          // cualquier rastro de reconocimiento de versiones antiguas
          if (latestDeploymentKey === currentDeploymentKey) {
            localStorage.removeItem(ACKNOWLEDGED_UPDATE_KEY);
          }
          return;
        }

        // Caso 2: El usuario ya reconoció esta versión específica y decidió ignorarla por ahora
        if (localStorage.getItem(ACKNOWLEDGED_UPDATE_KEY) === latestDeploymentKey) return;

        // Evitar múltiples toasts
        updateNotifiedRef.current = true;
        
        toast.info('Nueva versión disponible', {
          id: UPDATE_TOAST_ID,
          description: 'Se han aplicado mejoras y correcciones importantes.',
          duration: Infinity,
          action: {
            label: 'Actualizar',
            onClick: async () => {
              // Guardamos en localStorage para persistencia real
              localStorage.setItem(ACKNOWLEDGED_UPDATE_KEY, latestDeploymentKey);
              toast.dismiss(UPDATE_TOAST_ID);
              
              // Pequeño delay para que el usuario vea el feedback del click
              await forceRefreshToLatest(latestDeploymentKey);
            },
          },
          cancel: {
            label: 'Más tarde',
            onClick: async () => {
              // Si el usuario da a "Más tarde", marcamos como reconocida para que 
              // no vuelva a aparecer en esta versión.
              localStorage.setItem(ACKNOWLEDGED_UPDATE_KEY, latestDeploymentKey);
              toast.dismiss(UPDATE_TOAST_ID);
            }
          }
        });
      } catch (error) {
        // Silencioso, reintentará en el siguiente intervalo
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
