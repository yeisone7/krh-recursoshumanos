import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseInfiniteScrollOptions<T> {
  /** Full list of items (already filtered) */
  items: T[];
  /** Number of items per page */
  pageSize?: number;
}

interface UseInfiniteScrollResult<T> {
  /** Items to render (paginated slice) */
  visibleItems: T[];
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Ref to attach to a sentinel element at the bottom */
  sentinelRef: (node: HTMLDivElement | null) => void;
  /** Total count */
  totalCount: number;
  /** Visible count */
  visibleCount: number;
  /** Reset pagination (e.g. when filters change) */
  reset: () => void;
}

export function useInfiniteScroll<T>({
  items,
  pageSize = 20,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset when items reference changes (filter change)
  const itemsRef = useRef(items);
  useEffect(() => {
    if (items !== itemsRef.current) {
      itemsRef.current = items;
      setPage(1);
    }
  }, [items]);

  const visibleItems = useMemo(
    () => items.slice(0, page * pageSize),
    [items, page, pageSize]
  );

  const hasMore = visibleItems.length < items.length;

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node || !hasMore) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setPage((p) => p + 1);
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    },
    [hasMore]
  );

  const reset = useCallback(() => setPage(1), []);

  return {
    visibleItems,
    hasMore,
    sentinelRef,
    totalCount: items.length,
    visibleCount: visibleItems.length,
    reset,
  };
}
