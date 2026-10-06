import { memo, useMemo } from "react";
import { View, Platform } from "react-native";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
import type { StateWarsRow } from "@ntc/shared";
import { STATE_PATHS, STATE_CENTERS, MAP_WIDTH, MAP_HEIGHT } from "./nigeriaPaths";
import { useTheme } from "../../theme/ThemeProvider";
import { Txt } from "../../ui";

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/**
 * Stylised choropleth of Nigeria coloured by this week's rank. Top 3 glow gold; the rest shade from
 * deep green (high) to the surface tone (no points). Your state gets an outline.
 */
export const StateMap = memo(function StateMap({ rows, myState, onPress }: { rows: StateWarsRow[]; myState: string | null; onPress?: (code: string) => void }) {
  const { c, name } = useTheme();
  const byCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows]);
  const scored = rows.filter((r) => r.points > 0 && r.code !== "DI");
  const worst = Math.max(1, ...scored.map((r) => r.rank));
  const empty = name === "dark" ? "#1C2420" : "#E6EAE7";
  const deep = name === "dark" ? "#0FA958" : "#0B8A47";
  const fillFor = (code: string) => {
    const r = byCode.get(code);
    if (!r || r.points === 0) return empty;
    if (r.rank <= 3) return mix("#E8B44A", "#F0C76E", (r.rank - 1) / 3);
    const t = (r.rank - 4) / Math.max(1, worst - 3);
    return mix(deep, name === "dark" ? "#21402F" : "#BFE3CC", t);
  };
  const top = rows.filter((r) => r.points > 0 && r.rank <= 3 && STATE_CENTERS[r.code]);
  return (
    <View accessibilityRole="image" accessibilityLabel={`Map of Nigeria coloured by State Wars rank.${top.map((r) => ` ${r.name} is number ${r.rank}.`).join("")}`}>
      <Svg width="100%" style={{ aspectRatio: MAP_WIDTH / MAP_HEIGHT }} viewBox={`-10 -10 ${MAP_WIDTH + 20} ${MAP_HEIGHT + 20}`}>
        <G>
          {Object.entries(STATE_PATHS).map(([code, d]) => (
            <Path
              key={code}
              d={d}
              fill={fillFor(code)}
              stroke={c.bg}
              strokeWidth={2.5}
              strokeLinejoin="round"
              // react-native-svg forwards responder props to the DOM on web; use a plain click there.
              {...(onPress ? (Platform.OS === "web" ? ({ onClick: () => onPress(code), style: { cursor: "pointer" } } as any) : { onPress: () => onPress(code) }) : {})}
            />
          ))}
          {myState && STATE_PATHS[myState] ? <Path d={STATE_PATHS[myState]} fill="none" stroke={c.text} strokeWidth={5} strokeLinejoin="round" pointerEvents="none" /> : null}
        </G>
        {top.map((r) => {
          const [x, y] = STATE_CENTERS[r.code]!;
          return (
            <G key={r.code} pointerEvents="none">
              <SvgText x={x} y={y + 12} fontSize={34} fontWeight="900" textAnchor="middle" fill="#03140B">{r.rank}</SvgText>
            </G>
          );
        })}
      </Svg>
      <View className="flex-row items-center justify-center gap-4 mt-3">
        {[
          { color: "#E8B44A", label: "Top 3" },
          { color: deep, label: "Scoring" },
          { color: empty, label: "No points yet" },
        ].map((l) => (
          <View key={l.label} className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-[4px] border border-line" style={{ backgroundColor: l.color }} />
            <Txt variant="caption" tone="muted">{l.label}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
});
