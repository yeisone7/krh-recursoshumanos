import { useState, useEffect, useMemo, useCallback } from 'react';

let cie10Cache: Record<string, string> | null = null;
let loadPromise: Promise<Record<string, string>> | null = null;

async function loadCie10Data(): Promise<Record<string, string>> {
  if (cie10Cache) return cie10Cache;
  if (loadPromise) return loadPromise;
  loadPromise = import('@/data/cie10-codes.json').then((mod) => {
    cie10Cache = mod.default as Record<string, string>;
    return cie10Cache;
  });
  return loadPromise;
}

export function useCie10Lookup() {
  const [data, setData] = useState<Record<string, string>>(cie10Cache || {});
  const [isLoaded, setIsLoaded] = useState(!!cie10Cache);

  useEffect(() => {
    loadCie10Data().then((d) => {
      setData(d);
      setIsLoaded(true);
    });
  }, []);

  const lookup = useCallback(
    (code: string): string | null => {
      if (!code) return null;
      const normalized = code.trim().toUpperCase().replace(/[.\-\s]/g, '');
      return data[normalized] || null;
    },
    [data]
  );

  const search = useCallback(
    (query: string, limit = 50): { code: string; description: string }[] => {
      if (!query || query.length < 2) return [];
      const q = query.toLowerCase();
      const results: { code: string; description: string }[] = [];
      for (const [code, desc] of Object.entries(data)) {
        if (results.length >= limit) break;
        if (code.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
          results.push({ code, description: desc });
        }
      }
      return results;
    },
    [data]
  );

  return { lookup, search, isLoaded };
}
