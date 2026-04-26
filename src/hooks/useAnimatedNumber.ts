import { useEffect, useState } from 'react';

export function useAnimatedNumber(value: number, duration = 500) {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const start = displayed;
    const delta = value - start;
    if (delta === 0) return;

    let frame = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + delta * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return displayed;
}
