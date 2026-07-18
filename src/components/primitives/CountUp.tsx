import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  value: number;
  /** Stable formatter (define at module scope so the effect isn't re-created). */
  format: (value: number) => string;
  durationMs?: number;
  className?: string;
}

/**
 * Animated number that tweens from its previous value to the next one and writes
 * straight to the DOM node (no per-frame React re-render). Honors reduced motion.
 */
export function CountUp({ value, format, durationMs = 650, className }: CountUpProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReduced || prev.current === value) {
      node.textContent = format(value);
      prev.current = value;
      return;
    }

    const controls = animate(prev.current, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, format, durationMs, prefersReduced]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
