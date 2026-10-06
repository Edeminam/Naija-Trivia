import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useSharedValue, withSpring, withTiming, withRepeat, withDelay, useAnimatedStyle, Easing, FadeInRight, ZoomIn, FadeOut, FadeInDown } from "react-native-reanimated";
import { stateByCode, LEAGUES } from "@ntc/shared";
import { Avatar, Txt, AnimatedNumber, LeagueBadge } from "../../ui";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../lib/motion";
import type { PlayerView } from "./store";
import { useTheme } from "../../theme/ThemeProvider";

function Dot({ on }: { on: boolean }) {
  const { c } = useTheme();
  const s = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    s.value = on ? withSpring(1, { damping: 12, stiffness: 320 }) : withTiming(0, { duration: 120 });
  }, [on, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: s.value }));
  return <Animated.View style={[{ height: 10, width: 10, borderRadius: 5, backgroundColor: c.primary }, st]} />;
}

function Ring({ delay }: { delay: number }) {
  const { c } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [delay, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + v.value * 1.5 }], opacity: 0.5 * (1 - v.value) }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", height: 120, width: 120, borderRadius: 60, borderWidth: 2, borderColor: c.primary }, st]} />;
}

function PlayerCard({ p, searching, right }: { p: PlayerView | null; searching?: boolean; right?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <View className="flex-1 items-center gap-3">
      <View className="h-[120px] w-[120px] items-center justify-center">
        {searching && !reduce ? (
          <>
            <Ring delay={0} />
            <Ring delay={730} />
            <Ring delay={1460} />
          </>
        ) : null}
        {p ? (
          <Animated.View entering={right && !reduce ? FadeInRight.springify().damping(15).stiffness(140) : undefined}>
            <Avatar id={p.avatarId} size={104} league={p.league} frameId={p.frameId || null} />
          </Animated.View>
        ) : (
          <View className="h-[104px] w-[104px] items-center justify-center rounded-full border-2 border-dashed border-line bg-surface">
            <Txt variant="h1" tone="faint">?</Txt>
          </View>
        )}
      </View>
      <View className="items-center gap-1 min-h-[86px]">
        {p ? (
          <Animated.View entering={right && !reduce ? FadeInRight.delay(80).springify().damping(16) : undefined} className="items-center gap-1">
            <Txt variant="h3" numberOfLines={1} className="max-w-[150px]">{p.username}</Txt>
            <Txt variant="caption" tone="muted">{stateByCode(p.stateCode)?.name ?? "Naija"} · {p.rating}</Txt>
            <View className="flex-row items-center gap-1.5 mt-1">
              <LeagueBadge league={p.league} size={22} />
              <Txt variant="caption" tone="faint">{LEAGUES.find((l) => l.id === p.league)?.name}</Txt>
            </View>
          </Animated.View>
        ) : (
          <Txt variant="caption" tone="faint">Searching…</Txt>
        )}
      </View>
    </View>
  );
}

/** Pre-match face-off: you vs opponent, with a radar pulse while searching. */
function FaceOff({ me, opp }: { me: PlayerView | null; opp: PlayerView | null }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View exiting={reduce ? undefined : FadeOut.duration(220)} className="flex-row items-start pt-10">
      <PlayerCard p={me} searching={!opp} />
      <View className="items-center justify-center h-[120px] w-12">
        {opp ? (
          <Animated.View entering={reduce ? undefined : ZoomIn.delay(150).springify().damping(10)} className="h-12 w-12 items-center justify-center rounded-full bg-accent">
            <Txt variant="h3" tone="ink">VS</Txt>
          </Animated.View>
        ) : (
          <Txt variant="h3" tone="faint">VS</Txt>
        )}
      </View>
      <PlayerCard p={opp} right />
    </Animated.View>
  );
}

function Side({ p, right, gain }: { p: PlayerView | null; right?: boolean; gain?: number | null }) {
  return (
    <View className={cn("flex-1 flex-row items-center gap-2.5", right && "flex-row-reverse")}>
      <View>
        {p ? <Avatar id={p.avatarId} size={46} league={p.league} frameId={p.frameId || null} /> : <View className="h-[46px] w-[46px] rounded-full bg-raised" />}
        {p && !p.connected ? <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-accent border-2 border-bg" accessibilityLabel="Reconnecting" /> : null}
      </View>
      <View className={cn("shrink", right && "items-end")}>
        <View className={cn("flex-row items-center gap-1.5", right && "flex-row-reverse")}>
          <Txt variant="label" tone="muted" numberOfLines={1} className="max-w-[96px]">{p?.username ?? "…"}</Txt>
          <Dot on={!!p?.answered} />
        </View>
        <View className={cn("flex-row items-baseline gap-1.5", right && "flex-row-reverse")}>
          <AnimatedNumber value={p?.score ?? 0} variant="h2" duration={650} />
        </View>
      </View>
    </View>
  );
}

/**
 * Shared-element style header: the face-off from matchmaking hands its avatars over to the compact
 * in-game score bar (face-off fades/shrinks out while the bar rises in at the top).
 */
export function Arena({ me, opp, compact, round, total, double, gainMe }: { me: PlayerView | null; opp: PlayerView | null; compact: boolean; round: number; total: number; double?: boolean; gainMe?: number | null }) {
  const reduce = useReducedMotion();
  if (!compact) return <FaceOff me={me} opp={opp} />;
  return (
    <Animated.View
      entering={reduce ? undefined : FadeInDown.duration(320)}
      className="flex-row items-center gap-2 py-1.5"
      accessibilityLabel={me && opp ? `Round ${round} of ${total}. You ${me.score}, ${opp.username} ${opp.score}` : undefined}
    >
      <Side p={me} gain={gainMe} />
      <View className={cn("items-center rounded-chip px-3 py-1", double ? "bg-accent-soft" : "bg-raised")}>
        <Txt variant="overline" tone={double ? "accent" : "faint"}>{double ? "x2" : "Round"}</Txt>
        <Txt variant="bodyStrong" tabular>{round}/{total}</Txt>
      </View>
      <Side p={opp} right />
    </Animated.View>
  );
}
