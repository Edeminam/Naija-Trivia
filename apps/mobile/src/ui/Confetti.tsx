import { useEffect, useMemo } from "react";
import { AnimatedBox } from "../lib/animated";
import { View, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, withTiming, withDelay, useAnimatedStyle, Easing } from "react-native-reanimated";
import { useReducedMotion } from "../lib/motion";

const COLORS = ["#0FA958", "#E8B44A", "#F4F6F5", "#2FCB78", "#FFD27A"];

function Piece({ x, delay, color, size, drift, spin, h }: { x: number; delay: number; color: string; size: number; drift: number; spin: number; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 2600 + Math.random() * 900, easing: Easing.out(Easing.quad) }));
  }, [delay, t]);
  const st = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [{ translateY: -40 + t.value * (h + 80) }, { translateX: Math.sin(t.value * 6) * drift }, { rotate: `${t.value * spin}deg` }],
  }));
  return <AnimatedBox style={[{ position: "absolute", left: x, top: 0, width: size, height: size * 0.45, borderRadius: 2, backgroundColor: color }, st]} />;
}

/** Celebration burst — only for wins and promotions, and never under Reduce Motion. */
export function Confetti({ count = 60 }: { count?: number }) {
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        delay: Math.random() * 500,
        color: COLORS[i % COLORS.length]!,
        size: 8 + Math.random() * 8,
        drift: 10 + Math.random() * 30,
        spin: 360 + Math.random() * 720,
      })),
    [count, width],
  );
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, overflow: "hidden" }} aria-hidden>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} h={height} />
      ))}
    </View>
  );
}
