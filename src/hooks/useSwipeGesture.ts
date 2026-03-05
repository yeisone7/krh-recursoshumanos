import { useEffect, useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  edgeThreshold?: number; // px from left edge to trigger swipe-right
  minSwipeDistance?: number;
  enabled?: boolean;
}

export function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  edgeThreshold = 30,
  minSwipeDistance = 50,
  enabled = true,
}: SwipeGestureOptions) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isEdgeSwipe = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isEdgeSwipe.current = touch.clientX <= edgeThreshold;
  }, [edgeThreshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) < minSwipeDistance || Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (deltaX > 0 && isEdgeSwipe.current) {
      onSwipeRight?.();
    } else if (deltaX < 0) {
      onSwipeLeft?.();
    }
  }, [minSwipeDistance, onSwipeRight, onSwipeLeft]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchEnd]);
}
