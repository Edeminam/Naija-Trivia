import { useEffect, useState } from "react";
import { formatCountdown } from "@ntc/shared";

/** Live countdown string to an epoch-ms target, ticking every second. */
export function useCountdown(target: number | null | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return { text: "", ms: 0 };
  const ms = Math.max(0, target - now);
  return { text: formatCountdown(ms), ms };
}
