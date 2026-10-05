import { useEffect, useRef, useState } from "react";
import { Txt, type TxtProps } from "./Text";
import { useReducedMotion } from "../lib/motion";

/** Spring-like count-up (slight overshoot settles) for scores, coins and XP. */
export function AnimatedNumber({ value, duration = 900, delay = 0, format = (n) => n.toLocaleString("en-NG"), prefix = "", ...rest }: Omit<TxtProps, "children"> & { value: number; duration?: number; delay?: number; format?: (n: number) => string; prefix?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = from.current;
    let raf = 0;
    let t0 = 0;
    const timer = setTimeout(() => {
      const step = (t: number) => {
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / duration);
        // easeOutBack-ish: quick rise, tiny overshoot, settle
        const e = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
        setShown(Math.round(start + (value - start) * (p === 1 ? 1 : e)));
        if (p < 1) raf = requestAnimationFrame(step);
        else from.current = value;
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration, delay, reduce]);
  return (
    <Txt tabular accessibilityLabel={`${prefix}${format(value)}`} {...rest}>
      {prefix}
      {format(shown)}
    </Txt>
  );
}
