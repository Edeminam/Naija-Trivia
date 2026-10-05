import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing, cancelAnimation } from "react-native-reanimated";
import { Txt } from "./Text";
import { useTheme } from "../theme/ThemeProvider";

const ACircle = Animated.createAnimatedComponent(Circle);

/**
 * Countdown ring driven by an absolute deadline (already converted to local clock).
 * Turns red under 3 seconds. `paused` freezes it (after the player answers).
 */
export function CircularTimer({ deadline, duration, size = 64, paused, onExpire }: { deadline: number; duration: number; size?: number; paused?: boolean; onExpire?: () => void }) {
  const { c } = useTheme();
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = useSharedValue(1);
  const [secs, setSecs] = useState(Math.ceil(duration / 1000));
  const expired = useRef(false);

  useEffect(() => {
    expired.current = false;
    const remaining = Math.max(0, deadline - Date.now());
    progress.value = Math.min(1, remaining / duration);
    if (!paused) progress.value = withTiming(0, { duration: remaining, easing: Easing.linear });
    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setSecs(Math.ceil(left / 1000));
      if (left <= 0 && !expired.current) {
        expired.current = true;
        onExpire?.();
      }
    };
    tick();
    if (paused) {
      cancelAnimation(progress);
      return;
    }
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline, duration, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const danger = secs <= 3;
  const color = danger ? c.danger : c.primary;
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - progress.value) }));

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessibilityRole="timer"
      accessibilityLabel={`${secs} seconds left`}
      accessibilityLiveRegion={danger ? "assertive" : "none"}
    >
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.raised} strokeWidth={stroke} fill="none" />
        <ACircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} animatedProps={props} />
      </Svg>
      <Txt variant="h2" tabular tone={danger ? "danger" : "default"}>
        {secs}
      </Txt>
    </View>
  );
}
