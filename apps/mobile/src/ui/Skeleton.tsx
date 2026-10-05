import { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useReducedMotion } from "../lib/motion";
import { cn } from "../lib/cn";

/** Pulsing placeholder block. Compose into screen-shaped skeletons. */
export function Skeleton({ w = "100%", h = 16, r = 10, className }: { w?: DimensionValue; h?: number; r?: number; className?: string }) {
  const reduce = useReducedMotion();
  const o = useSharedValue(0.55);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View aria-hidden className={cn("bg-raised", className)} style={[{ width: w, height: h, borderRadius: r }, style]} />;
}

export function SkeletonCard({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <View className={cn("rounded-card border border-line bg-surface p-5 gap-3", className)} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Skeleton w="40%" h={14} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} w={i === lines - 1 ? "70%" : "100%"} h={12} />
      ))}
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <Skeleton w={40} h={40} r={20} />
      <View className="flex-1 gap-2">
        <Skeleton w="55%" h={12} />
        <Skeleton w="30%" h={10} />
      </View>
      <Skeleton w={48} h={14} />
    </View>
  );
}
