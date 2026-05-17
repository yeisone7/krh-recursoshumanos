import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';

import { useLocation } from 'react-router-dom';

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_TOAST_ID = 'app-update-available';
const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION;
const ACKNOWLEDGED_UPDATE_KEY = 'empatiq_acknowledged_update_version';

// Rutas públicas donde no queremos mostrar notificaciones de actualización
const PUBLIC_ROUTES = ['/registro', '/capacitacion', '/descargos'];

type VersionResponse = {
  version?: string;
};

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
  const updateCheckConfig = systemConfig?.app_update_check;
  const updateCheckEnabled = updateCheckConfig?.enabled ?? true;
  const updateCheckMinutes = Math.max(1, Math.min(1440, updateCheckConfig?.minutes ?? 5));
  const checkIntervalMs = updateCheckMinutes * 60 * 1000 || VERSION_CHECK_INTERVAL_MS;

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

        // Caso 1: Ya estamos en la versión más reciente
        if (!isMounted || !latestVersion || latestVersion === CURRENT_APP_VERSION) {
          // Si ya estábamos en la versión más reciente, nos aseguramos de limpiar 
          // cualquier rastro de reconocimiento de versiones antiguas
          if (latestVersion === CURRENT_APP_VERSION) {
            localStorage.removeItem(ACKNOWLEDGED_UPDATE_KEY);
          }
          return;
        }

        // Caso 2: El usuario ya reconoció esta versión específica y decidió ignorarla por ahora
        if (localStorage.getItem(ACKNOWLEDGED_UPDATE_KEY) === latestVersion) return;

        // Evitar múltiples toasts
        updateNotifiedRef.current = true;
        
        toast.info('Nueva versión disponible', {
          id: UPDATE_TOAST_ID,
          description: 'Se han aplicado mejoras y correcciones importantes.',
          duration: Infinity,
          action: {
            label: 'Actualizar',
            onClick: () => {
              // Guardamos en localStorage para persistencia real
              localStorage.setItem(ACKNOWLEDGED_UPDATE_KEY, latestVersion);
              toast.dismiss(UPDATE_TOAST_ID);
              
              // Pequeño delay para que el usuario vea el feedback del click
              setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('refresh', latestVersion.slice(0, 8));
                window.location.replace(url.toString());
              }, 100);
            },
          },
          cancel: {
            label: 'Más tarde',
            onClick: () => {
              // Si el usuario da a "Más tarde", marcamos como reconocida para que 
              // no vuelva a aparecer en esta versión.
              localStorage.setItem(ACKNOWLEDGED_UPDATE_KEY, latestVersion);
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