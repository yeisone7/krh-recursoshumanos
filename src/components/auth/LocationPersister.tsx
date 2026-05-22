import { useEffect } from 'react';
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
  '/descargos',
  '/verificar-certificado',
];
const LAST_PATH_KEY = 'empatiq_last_visited_path';

const isIgnoredPath = (pathname: string) => (
  IGNORED_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
);

const getRestorablePath = (value: string | null) => {
  if (!value || value === '/') return null;

  try {
    const url = new URL(value, window.location.origin);
    if (isIgnoredPath(url.pathname)) return null;
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
  const { user, isLoading } = useAuth();

  // Guardar la ubicación actual cada vez que cambia
  useEffect(() => {
    const isIgnored = isIgnoredPath(location.pathname);
    if (!isIgnored && location.pathname !== '/') {
      localStorage.setItem(LAST_PATH_KEY, location.pathname + location.search);
      return;
    }

    const savedPath = getRestorablePath(localStorage.getItem(LAST_PATH_KEY));
    if (!savedPath) {
      localStorage.removeItem(LAST_PATH_KEY);
    }
  }, [location]);

  // Restaurar la ubicación al cargar la app si estamos en la raíz (solo una vez por sesión)
  useEffect(() => {
    if (!isLoading && user && location.pathname === '/') {
      const hasRestored = sessionStorage.getItem('empatiq_location_restored');
      if (!hasRestored) {
        const lastPath = getRestorablePath(localStorage.getItem(LAST_PATH_KEY));
        // Marcamos como restaurado inmediatamente para evitar bucles
        sessionStorage.setItem('empatiq_location_restored', 'true');
        
        if (lastPath) {
          const timer = setTimeout(() => {
            navigate(lastPath, { replace: true });
          }, 100);
          return () => clearTimeout(timer);
        }

        localStorage.removeItem(LAST_PATH_KEY);
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  return null;
}
