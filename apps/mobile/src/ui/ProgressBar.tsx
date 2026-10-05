import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withDelay } from "react-native-reanimated";
import { motion } from "../theme/tokens";
import { useReducedMotion } from "../lib/motion";
import { cn } from "../lib/cn";

/** Animated progress track. `value` is 0..1. */
export function ProgressBar({ value, tone = "primary", height = 8, delay = 0, className, label }: { value: number; tone?: "primary" | "accent" | "danger"; height?: number; delay?: number; className?: string; label?: string }) {
  const reduce = useReducedMotion();
  const w = useSharedValue(reduce ? value : 0);
  useEffect(() => {
    const v = Math.max(0, Math.min(1, value));
    w.value = reduce ? v : withDelay(delay, withTiming(v, { duration: 600, easing: motion.easeOut }));
  }, [value, reduce, delay, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const fill = tone === "primary" ? "bg-primary" : tone === "accent" ? "bg-accent" : "bg-danger";
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      className={cn("w-full overflow-hidden rounded-chip bg-raised", className)}
      style={{ height }}
    >
      <Animated.View className={cn("h-full rounded-chip", fill)} style={style} />
    </View>
  );
}
