import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withDelay } from "react-native-reanimated";
import { motion } from "../theme/tokens";
import { useReducedMotion } from "../lib/motion";
import { cn } from "../lib/cn";
import { useTheme } from "../theme/ThemeProvider";

/** Animated progress track. `value` is 0..1. */
export function ProgressBar({ value, tone = "primary", height = 8, delay = 0, className, label }: { value: number; tone?: "primary" | "accent" | "danger"; height?: number; delay?: number; className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const { c } = useTheme();
  const w = useSharedValue(reduce ? value : 0);
  useEffect(() => {
    const v = Math.max(0, Math.min(1, value));
    w.value = reduce ? v : withDelay(delay, withTiming(v, { duration: 600, easing: motion.easeOut }));
  }, [value, reduce, delay, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const fill = tone === "primary" ? c.primary : tone === "accent" ? c.accent : c.danger;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      className={cn("w-full overflow-hidden rounded-chip bg-raised", className)}
      style={{ height }}
    >
      {/* No className on animated elements: NativeWind drops classes combined with animated styles on native. */}
      <Animated.View style={[{ height: "100%", borderRadius: 999, backgroundColor: fill }, style]} />
    </View>
  );
}
