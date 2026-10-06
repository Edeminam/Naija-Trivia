import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useReducedMotion } from "../lib/motion";
import { cn } from "../lib/cn";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Animated progress track. `value` is 0..1.
 * The fill animates with a Reanimated CSS transition on a plain style (works on web and native; animated
 * styles combined with NativeWind's interop don't apply on native).
 */
export function ProgressBar({ value, tone = "primary", height = 8, delay = 0, className, label }: { value: number; tone?: "primary" | "accent" | "danger"; height?: number; delay?: number; className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const { c } = useTheme();
  const target = Math.max(0, Math.min(1, value));
  // Start empty, then grow to the target after mount so the fill animates in.
  const [shown, setShown] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) return setShown(target);
    const id = setTimeout(() => setShown(target), 16);
    return () => clearTimeout(id);
  }, [target, reduce]);
  const fill = tone === "primary" ? c.primary : tone === "accent" ? c.accent : c.danger;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      className={cn("w-full overflow-hidden rounded-chip bg-raised", className)}
      style={{ height }}
    >
      <Animated.View
        style={
          {
            height: "100%",
            width: `${shown * 100}%`,
            borderRadius: 999,
            backgroundColor: fill,
            transitionProperty: "width",
            transitionDuration: reduce ? 0 : 600,
            transitionDelay: delay,
            transitionTimingFunction: "ease-out",
          } as any
        }
      />
    </View>
  );
}
