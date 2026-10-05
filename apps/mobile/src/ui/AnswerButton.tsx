import { View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, withSequence, withTiming, useSharedValue } from "react-native-reanimated";
import { useEffect } from "react";
import { Check, X } from "lucide-react-native";
import { PressableScale } from "./Pressable";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { cn } from "../lib/cn";
import { useReducedMotion } from "../lib/motion";

export type AnswerState = "idle" | "selected" | "correct" | "wrong" | "disabled";

const shell: Record<AnswerState, string> = {
  idle: "bg-surface border-line",
  selected: "bg-raised border-primary",
  correct: "bg-primary-soft border-primary",
  wrong: "bg-danger-soft border-danger",
  disabled: "bg-surface border-line opacity-50",
};

const badge: Record<AnswerState, string> = {
  idle: "bg-raised",
  selected: "bg-primary",
  correct: "bg-primary",
  wrong: "bg-danger",
  disabled: "bg-raised",
};

/**
 * One option in the thumb zone. Colour is never the only signal: correct/wrong also show
 * a ✓/✕ icon and are announced to screen readers. Optional opponent marker and crowd %.
 */
export function AnswerButton({
  letter,
  text,
  state,
  onPress,
  opponentAvatarId,
  mine,
  crowd,
  hidden,
  themeColors,
}: {
  letter: string;
  text: string;
  state: AnswerState;
  onPress?: () => void;
  opponentAvatarId?: string | null;
  mine?: boolean;
  crowd?: number | null;
  hidden?: boolean;
  themeColors?: [string, string] | null;
}) {
  const reduce = useReducedMotion();
  const shake = useSharedValue(0);
  useEffect(() => {
    if (state === "wrong" && mine && !reduce) shake.value = withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 70 }), withTiming(-3, { duration: 60 }), withTiming(0, { duration: 50 }));
  }, [state, mine, reduce, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const label = `Option ${letter}: ${text}${state === "correct" ? ", correct answer" : state === "wrong" ? ", wrong" : ""}${mine ? ", your pick" : ""}`;

  if (hidden) {
    return <View className="h-[60px] rounded-btn border border-dashed border-line opacity-40" accessibilityLabel={`Option ${letter} removed`} />;
  }
  const custom = themeColors && state === "idle" ? { backgroundColor: themeColors[0], borderColor: themeColors[1] } : null;
  return (
    <Animated.View style={shakeStyle}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: state !== "idle", selected: state === "selected" }}
        disabled={state !== "idle"}
        onPress={onPress}
        className={cn("min-h-[60px] flex-row items-center gap-3 rounded-btn border-2 px-3 py-2.5 overflow-hidden", shell[state])}
        style={custom}
      >
        {crowd != null ? <View className="absolute left-0 top-0 bottom-0 bg-accent-soft" style={{ width: `${crowd}%` }} /> : null}
        <View className={cn("h-9 w-9 items-center justify-center rounded-[10px]", badge[state])}>
          {state === "correct" ? <Icon as={Check} size={18} tone="ink" /> : state === "wrong" ? <Icon as={X} size={18} tone="white" /> : <Txt variant="bodyStrong" tone={state === "selected" ? "ink" : "muted"}>{letter}</Txt>}
        </View>
        <Txt variant="bodyStrong" className="flex-1" numberOfLines={3}>
          {text}
        </Txt>
        {crowd != null ? (
          <Txt variant="label" tone="accent" tabular>
            {crowd}%
          </Txt>
        ) : null}
        {opponentAvatarId ? (
          <Animated.View entering={reduce ? undefined : FadeIn.duration(200)} accessibilityLabel="Opponent's pick">
            <Avatar id={opponentAvatarId} size={26} />
          </Animated.View>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}
