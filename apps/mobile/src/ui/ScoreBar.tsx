import { View } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming, useSharedValue } from "react-native-reanimated";
import { useEffect } from "react";
import type { LeagueId } from "@ntc/shared";
import { Avatar } from "./Avatar";
import { Txt } from "./Text";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from "../lib/cn";

export interface ScorePlayer {
  username: string;
  avatarId: string;
  league?: LeagueId;
  frameId?: string | null;
  score: number;
  answered?: boolean;
  connected?: boolean;
}

function AnsweredDot({ on }: { on: boolean }) {
  const s = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    s.value = on ? withSpring(1, { damping: 12, stiffness: 300 }) : withTiming(0, { duration: 120 });
  }, [on, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: s.value }));
  return <Animated.View className="h-2.5 w-2.5 rounded-full bg-primary" style={st} accessibilityLabel={on ? "Answered" : undefined} />;
}

function Side({ p, align }: { p: ScorePlayer; align: "left" | "right" }) {
  const right = align === "right";
  return (
    <View className={cn("flex-1 flex-row items-center gap-2.5", right && "flex-row-reverse")}>
      <View>
        <Avatar id={p.avatarId} size={44} league={p.league} frameId={p.frameId} />
        {p.connected === false ? <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-accent border-2 border-bg" accessibilityLabel="Reconnecting" /> : null}
      </View>
      <View className={cn("shrink", right && "items-end")}>
        <View className={cn("flex-row items-center gap-1.5", right && "flex-row-reverse")}>
          <Txt variant="label" tone="muted" numberOfLines={1} className="max-w-[96px]">
            {p.username}
          </Txt>
          <AnsweredDot on={!!p.answered} />
        </View>
        <AnimatedNumber value={p.score} variant="h2" duration={700} />
      </View>
    </View>
  );
}

/** Both players' avatars + live scores with the round indicator in the middle. */
export function ScoreBar({ me, opponent, round, total, double }: { me: ScorePlayer; opponent: ScorePlayer; round: number; total: number; double?: boolean }) {
  return (
    <View className="flex-row items-center gap-2" accessibilityLabel={`Round ${round} of ${total}. You ${me.score}, ${opponent.username} ${opponent.score}`}>
      <Side p={me} align="left" />
      <View className={cn("items-center rounded-chip px-3 py-1", double ? "bg-accent-soft" : "bg-raised")}>
        <Txt variant="overline" tone={double ? "accent" : "faint"}>
          {double ? "x2" : "Round"}
        </Txt>
        <Txt variant="bodyStrong" tabular>
          {round}/{total}
        </Txt>
      </View>
      <Side p={opponent} align="right" />
    </View>
  );
}
