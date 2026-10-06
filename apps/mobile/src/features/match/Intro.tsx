import { View } from "react-native";
import Animated, { FadeIn, ZoomIn, FadeInUp, useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay } from "react-native-reanimated";
import { useEffect } from "react";
import { Flame } from "lucide-react-native";
import { Txt, Icon, AdirePattern } from "../../ui";
import { useReducedMotion } from "../../lib/motion";

export function RoundIntro({ round, total }: { round: number; total: number }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View entering={reduce ? undefined : FadeInUp.duration(220)} className="flex-1 items-center justify-center gap-1" accessibilityLiveRegion="polite">
      <Txt variant="overline" tone="faint">Question</Txt>
      <Txt variant="display" style={{ fontSize: 56, lineHeight: 62 }} tabular>{round}<Txt variant="h1" tone="faint">/{total}</Txt></Txt>
    </Animated.View>
  );
}

/** Question 7: a distinct, louder intro — gold slam with a shake. */
export function DoubleWahalaIntro() {
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!reduce) x.value = withDelay(260, withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(4, { duration: 50 }), withTiming(0, { duration: 50 })));
  }, [reduce, x]);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(150)} className="flex-1 items-center justify-center" accessibilityLiveRegion="assertive" accessibilityLabel="Double Wahala! Final question, double points">
      <View className="absolute inset-0 rounded-card overflow-hidden bg-accent-soft">
        <AdirePattern id="wahala" opacity={0.06} />
      </View>
      <Animated.View style={shake} className="items-center gap-3">
        <Animated.View entering={reduce ? undefined : ZoomIn.springify().damping(9).stiffness(180)} className="h-20 w-20 items-center justify-center rounded-3xl bg-accent">
          <Icon as={Flame} size={40} tone="ink" />
        </Animated.View>
        <Animated.View entering={reduce ? undefined : ZoomIn.delay(120).springify().damping(10)}>
          <Txt variant="display" tone="accent" style={{ fontSize: 44, lineHeight: 48 }} className="text-center">DOUBLE{"\n"}WAHALA</Txt>
        </Animated.View>
        <Txt variant="title" tone="muted">Final question · points x2</Txt>
      </Animated.View>
    </Animated.View>
  );
}
