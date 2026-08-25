import type { QueryClient } from '@tanstack/react-query';

const CACHE_PREFIX = 'krh:selection-catalog:';
const CACHE_TTL_MS = 15 * 60 * 1000;

export const SELECTION_CATALOG_QUERY_KEYS = [
  'selection-labor-references',
  'selection-academic-references',
  'selection-pink-list',
  'selection-vacancy-information',
  'selection-medical-exam-information',
] as const;

interface CachedCatalog<T> {
  data: T;
  updatedAt: number;
}

export function getSelectionCatalogCache<T>(key: string): CachedCatalog<T> | undefined {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return undefined;

    const cached = JSON.parse(raw) as CachedCatalog<T>;
    if (!cached || Date.now() - cached.updatedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return undefined;
    }

    return cached;
  } catch {
    return undefined;
  }
}

export function setSelectionCatalogCache<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ data, updatedAt: Date.now() }));
  } catch {
    // Storage can be unavailable or full; the in-memory React Query cache still works.
  }
}

export function clearSelectionCatalogCache(key: string) {
  try {
    sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}

export function applySelectionCatalogQueryDefaults(queryClient: QueryClient) {
  SELECTION_CATALOG_QUERY_KEYS.forEach((queryKey) => {
    queryClient.setQueryDefaults([queryKey], {
      placeholderData: [],
    });
  });
}
