import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => void;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 84 }: PullToRefreshOptions) {
  const startY = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startY.current === null || window.scrollY > 0) return;
      const nextDistance = Math.max(0, (event.touches[0]?.clientY ?? 0) - startY.current);
      setDistance(Math.min(nextDistance, threshold + 36));
    };

    const onTouchEnd = () => {
      if (distance >= threshold) onRefresh();
      startY.current = null;
      setDistance(0);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [distance, onRefresh, threshold]);

  return { distance, isArmed: distance >= threshold };
}
