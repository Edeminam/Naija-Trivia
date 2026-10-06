import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing, withDelay } from "react-native-reanimated";
import { Txt } from "../../ui";
import { useReducedMotion } from "../../lib/motion";
import { useMatch } from "./store";
import { useTheme } from "../../theme/ThemeProvider";

function Ring({ delay }: { delay: number }) {
  const { c } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [delay, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 0.4 + v.value * 1.6 }], opacity: 0.55 * (1 - v.value) }));
  return <Animated.View style={[{ position: "absolute", height: 176, width: 176, borderRadius: 88, borderWidth: 2, borderColor: c.primary }, st]} />;
}

/** Radar pulse behind the arena while we look for an opponent. */
export function SearchPulse() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <View pointerEvents="none" className="absolute left-0 right-0 items-center justify-center" style={{ top: 70, height: 100 }}>
      <View className="absolute" style={{ left: "18%" }}>
        <Ring delay={0} />
        <Ring delay={730} />
        <Ring delay={1460} />
      </View>
    </View>
  );
}

export function SearchStatus() {
  const { searchStartedAt, window, stage } = useMatch();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const secs = Math.floor((now - searchStartedAt) / 1000);
  if (stage === "found") {
    return (
      <View className="items-center gap-1" accessibilityLiveRegion="polite">
        <Txt variant="h2">Opponent found!</Txt>
        <Txt variant="body" tone="muted">Get ready to ban a category…</Txt>
      </View>
    );
  }
  return (
    <View className="items-center gap-1" accessibilityLiveRegion="polite">
      <Txt variant="h2">Finding a worthy opponent</Txt>
      <Txt variant="body" tone="muted" tabular>
        {secs}s · matching within ±{window} rating
      </Txt>
      <Txt variant="caption" tone="faint" className="mt-1">No one close? You'll face a practice opponent in 5s.</Txt>
    </View>
  );
}
