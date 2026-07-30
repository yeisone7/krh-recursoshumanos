export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

export const THEME_KEY = 'empatiq-theme';
export const THEME_CHANGE_EVENT = 'empatiq-theme-change';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

export const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';

  const savedTheme = window.localStorage.getItem(THEME_KEY);
  return isThemePreference(savedTheme) ? savedTheme : 'system';
};

export const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const resolveTheme = (preference: ThemePreference): Theme =>
  preference === 'system' ? getSystemTheme() : preference;

export const applyThemePreference = (preference: ThemePreference): Theme => {
  const resolvedTheme = resolveTheme(preference);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolvedTheme;
  }

  return resolvedTheme;
};
