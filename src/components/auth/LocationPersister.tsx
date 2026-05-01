import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const IGNORED_PATHS = ['/auth', '/reset-password', '/onboarding', '/select-company', '/install'];
const LAST_PATH_KEY = 'krh_last_visited_path';

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
    const isIgnored = IGNORED_PATHS.some(path => location.pathname.startsWith(path));
    if (!isIgnored && location.pathname !== '/') {
      localStorage.setItem(LAST_PATH_KEY, location.pathname + location.search);
    }
  }, [location]);

  // Restaurar la ubicación al cargar la app si estamos en la raíz (solo una vez por sesión)
  useEffect(() => {
    if (!isLoading && user && location.pathname === '/') {
      const hasRestored = sessionStorage.getItem('krh_location_restored');
      if (!hasRestored) {
        const lastPath = localStorage.getItem(LAST_PATH_KEY);
        // Marcamos como restaurado inmediatamente para evitar bucles
        sessionStorage.setItem('krh_location_restored', 'true');
        
        if (lastPath && lastPath !== '/') {
          const timer = setTimeout(() => {
            navigate(lastPath, { replace: true });
          }, 100);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  return null;
}
