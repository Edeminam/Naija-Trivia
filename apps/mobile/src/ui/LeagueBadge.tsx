import { View } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { LEAGUES, type LeagueId } from "@ntc/shared";
import { Txt } from "./Text";
import { useSvgId } from "../lib/useSvgId";

const TIER: Record<LeagueId, number> = { jjc: 1, learner: 2, sharp: 3, odogwu: 4, oga: 5, agba: 6 };

/** Shield crest coloured by league; pips show the tier. */
export function LeagueBadge({ league, size = 56, showName }: { league: LeagueId; size?: number; showName?: boolean }) {
  const def = LEAGUES.find((l) => l.id === league) ?? LEAGUES[0]!;
  const tier = TIER[league];
  const gid = useSvgId(`lg-${league}`);
  return (
    <View className="items-center gap-1.5" accessibilityRole="image" accessibilityLabel={`${def.name} league`}>
      <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={def.color} stopOpacity={1} />
            <Stop offset="1" stopColor={def.color} stopOpacity={0.55} />
          </LinearGradient>
        </Defs>
        <Path d="M50 4 L90 18 V54 C90 80 72 98 50 108 C28 98 10 80 10 54 V18 Z" fill={`url(#${gid})`} />
        <Path d="M50 14 L80 25 V54 C80 74 67 88 50 96 C33 88 20 74 20 54 V25 Z" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2.5} />
        <Path d="M50 34 L56 47 L70 48 L59 57 L63 71 L50 63 L37 71 L41 57 L30 48 L44 47 Z" fill="rgba(255,255,255,0.92)" />
        {Array.from({ length: tier }).map((_, i) => (
          <Circle key={i} cx={50 + (i - (tier - 1) / 2) * 8} cy={84} r={2.6} fill="rgba(255,255,255,0.9)" />
        ))}
      </Svg>
      {showName ? (
        <Txt variant="label" tone="muted">
          {def.name}
        </Txt>
      ) : null}
    </View>
  );
}
