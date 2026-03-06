import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from 'sonner';

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click',
];

export function useInactivityTimeout() {
  const { user, signOut } = useAuth();
  const { data: systemConfig } = useSystemConfig();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnedRef = useRef(false);

  const timeoutMinutes = systemConfig?.inactivity_timeout_minutes?.minutes ?? 0;

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    warnedRef.current = false;
  }, []);

  const handleSignOut = useCallback(async () => {
    clearTimers();
    toast.info('Sesión cerrada por inactividad');
    await signOut();
  }, [signOut, clearTimers]);

  const resetTimer = useCallback(() => {
    if (!user || timeoutMinutes <= 0) return;
    clearTimers();

    const ms = timeoutMinutes * 60 * 1000;

    // Warning 1 minute before (if timeout > 1 min)
    if (timeoutMinutes > 1) {
      warningRef.current = setTimeout(() => {
        if (!warnedRef.current) {
          warnedRef.current = true;
          toast.warning('Tu sesión se cerrará en 1 minuto por inactividad', { duration: 10000 });
        }
      }, ms - 60000);
    }

    timerRef.current = setTimeout(handleSignOut, ms);
  }, [user, timeoutMinutes, clearTimers, handleSignOut]);

  useEffect(() => {
    if (!user || timeoutMinutes <= 0) {
      clearTimers();
      return;
    }

    resetTimer();

    const handler = () => resetTimer();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handler, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handler));
    };
  }, [user, timeoutMinutes, resetTimer, clearTimers]);
}
