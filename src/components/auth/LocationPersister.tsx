import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const IGNORED_PATHS = [
  '/auth',
  '/reset-password',
  '/onboarding',
  '/select-company',
  '/install',
  '/registro',
  '/capacitacion',
  '/copasst/votar',
  '/descargos',
  '/solicitud-permiso',
  '/verificar-certificado',
  '/marcar',
  '/asistencia',
  '/portal',
  '/change-password-required',
  '/reloj-checador/pantalla',
];


// Exported for the regression test that protects public-route isolation.
// eslint-disable-next-line react-refresh/only-export-components
export const isIgnoredPath = (pathname: string) => (
  IGNORED_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
);

// eslint-disable-next-line react-refresh/only-export-components
export const getRestorablePath = (value: string | null) => {
  if (!value || value === '/') return null;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || isIgnoredPath(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

/**
 * Componente que persiste la última ubicación del usuario para evitar que se pierda
 * en caso de recargas accidentales o el problema de foco.
 */
export function LocationPersister() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, currentCompanyId, isLoading } = useAuth();
  const restored = useRef<string | null>(null);
  useEffect(() => {
    // Desktop restoration belongs exclusively to the workspace. Mobile keeps
    // its single-screen navigation, with storage isolated by user and company.
    if (window.innerWidth >= 768 || isLoading || !user || !currentCompanyId || isIgnoredPath(location.pathname)) return;
    const key = `empatiq_mobile_location:${user.id}:${currentCompanyId}`;
    try {
      if (restored.current !== key) {
        restored.current = key;
        const saved = getRestorablePath(sessionStorage.getItem(key));
        if (location.pathname === '/' && saved) { navigate(saved, { replace: true }); return; }
      }
      sessionStorage.setItem(key, location.pathname + location.search + location.hash);
    } catch { /* Storage is optional. */ }
  }, [user, currentCompanyId, isLoading, location, navigate]);
  return null;
}
