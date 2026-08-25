import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  applySelectionCatalogQueryDefaults,
  SELECTION_CATALOG_QUERY_KEYS,
} from './selectionCatalogCache';

describe('selection catalog query defaults', () => {
  it.each(SELECTION_CATALOG_QUERY_KEYS)(
    'renders %s immediately while its first request runs in the background',
    (queryKey) => {
      const queryClient = new QueryClient();
      applySelectionCatalogQueryDefaults(queryClient);

      const observer = new QueryObserver(queryClient, {
        queryKey: [queryKey, 'company-id'],
        queryFn: () => new Promise<never>(() => undefined),
      });
      const unsubscribe = observer.subscribe(() => undefined);
      const result = observer.getCurrentResult();

      expect(result.data).toEqual([]);
      expect(result.isLoading).toBe(false);
      expect(result.isFetching).toBe(true);
      expect(result.isPlaceholderData).toBe(true);

      unsubscribe();
      queryClient.clear();
    },
  );
});
