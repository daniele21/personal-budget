import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { haptics } from '../utils/haptics';

const MAIN_ROUTES = ['/', '/transactions', '/budgets', '/reports', '/more'];
const EDGE_ZONE = 28;
const TRIGGER_DISTANCE = 96;

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button,a,input,select,textarea,[role="dialog"]'));
}

export function useSwipeNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (isInteractive(event.target)) return;
      const touch = event.touches[0];
      if (!touch) return;
      const isEdge = touch.clientX <= EDGE_ZONE || touch.clientX >= window.innerWidth - EDGE_ZONE;
      if (!isEdge) return;
      start.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!start.current) return;
      const touch = event.changedTouches[0];
      if (!touch) {
        start.current = null;
        return;
      }

      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < TRIGGER_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.6) return;

      const currentIndex = MAIN_ROUTES.indexOf(location.pathname);
      if (currentIndex === -1) return;
      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      const nextRoute = MAIN_ROUTES[nextIndex];
      if (!nextRoute) return;
      haptics.tap();
      navigate(nextRoute);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [location.pathname, navigate]);
}
