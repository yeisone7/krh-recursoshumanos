import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

const THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children, className, disabled }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistance = useMotionValue(0);

  const indicatorOpacity = useTransform(pullDistance, [0, THRESHOLD * 0.5, THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullDistance, [0, THRESHOLD], [0.5, 1]);
  const rotation = useTransform(pullDistance, [0, THRESHOLD], [0, 180]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    const el = e.currentTarget;
    if (el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || isRefreshing) return;
    const diff = Math.max(0, e.touches[0].clientY - startY.current);
    // Apply resistance
    const dampened = Math.min(diff * 0.5, THRESHOLD * 1.5);
    pullDistance.set(dampened);
  }, [isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance.get() >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      pullDistance.set(THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
  }, [onRefresh, isRefreshing, pullDistance]);

  return (
    <div
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Indicator */}
      <motion.div
        className="flex items-center justify-center py-2 pointer-events-none"
        style={{
          height: pullDistance,
          opacity: indicatorOpacity,
        }}
      >
        <motion.div style={{ scale: indicatorScale }}>
          <motion.div
            style={{ rotate: isRefreshing ? undefined : rotation }}
            animate={isRefreshing ? { rotate: 360 } : undefined}
            transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : undefined}
          >
            <RefreshCw className="w-5 h-5 text-primary" />
          </motion.div>
        </motion.div>
        {pullDistance.get() >= THRESHOLD && !isRefreshing && (
          <span className="text-xs text-primary ml-2">Soltar para actualizar</span>
        )}
      </motion.div>

      {children}
    </div>
  );
}
