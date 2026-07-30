import { useState, useEffect, useCallback } from 'react';
import {
  THEME_CHANGE_EVENT,
  THEME_KEY,
  applyThemePreference,
  getStoredThemePreference,
  isThemePreference,
  resolveTheme,
  type Theme,
  type ThemePreference,
} from '@/lib/theme';

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(getStoredThemePreference);
  const [theme, setResolvedTheme] = useState<Theme>(() => resolveTheme(getStoredThemePreference()));

  useEffect(() => {
    const syncResolvedTheme = () => setResolvedTheme(applyThemePreference(preference));
    syncResolvedTheme();

    if (preference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', syncResolvedTheme);
    return () => mediaQuery.removeEventListener('change', syncResolvedTheme);
  }, [preference]);

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) {
        setPreference(getStoredThemePreference());
      }
    };
    const syncFromApp = (event: Event) => {
      const nextPreference = (event as CustomEvent<ThemePreference>).detail;
      setPreference(isThemePreference(nextPreference) ? nextPreference : getStoredThemePreference());
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(THEME_CHANGE_EVENT, syncFromApp);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, syncFromApp);
    };
  }, []);

  const setTheme = useCallback((nextPreference: ThemePreference) => {
    window.localStorage.setItem(THEME_KEY, nextPreference);
    setPreference(nextPreference);
    window.dispatchEvent(
      new CustomEvent<ThemePreference>(THEME_CHANGE_EVENT, { detail: nextPreference }),
    );
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return {
    theme,
    preference,
    isSystemTheme: preference === 'system',
    toggleTheme,
    setTheme,
  };
}
