import { useEffect, useRef, useState } from 'react';
import { formatInr } from '../lib/formatInr';

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const from = shownRef.current;
    const started = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - started) / 400);
      const next = Math.round(from + (value - from) * p);
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{formatInr(shown)}</span>;
}
