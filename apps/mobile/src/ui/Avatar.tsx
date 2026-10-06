import { View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect, G, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { AVATARS, COSMETICS, LEAGUES, type AvatarDef, type LeagueId } from "@ntc/shared";
import { Txt } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import { useSvgId } from "../lib/useSvgId";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, "0")}`;
}

function Hair({ a }: { a: AvatarDef }) {
  const hair = "#15100C";
  switch (a.hair) {
    case "gele":
      return (
        <G>
          <Path d="M27 40 C22 26 32 10 50 10 C69 10 79 24 74 40 C70 33 62 30 50 30 C38 30 31 33 27 40 Z" fill={a.accent} />
          <Path d="M68 18 C80 12 88 18 84 28 C80 24 75 23 70 26 Z" fill={shade(a.accent, -30)} />
          <Path d="M34 22 C42 17 58 16 67 22 M31 30 C40 24 60 24 70 30" stroke={shade(a.accent, -45)} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </G>
      );
    case "fila":
      return (
        <G>
          <Path d="M31 38 C31 22 40 15 52 15 C64 15 70 22 70 32 L76 22 C79 30 76 37 70 40 Z" fill={a.accent} />
          <Path d="M33 34 H68" stroke={shade(a.accent, -40)} strokeWidth={2} />
        </G>
      );
    case "bun":
      return (
        <G fill={hair}>
          <Circle cx={50} cy={14} r={9} />
          <Path d="M31 44 C30 27 39 20 50 20 C62 20 70 27 69 44 C65 34 58 30 50 30 C42 30 35 34 31 44 Z" />
        </G>
      );
    case "low":
      return <Path d="M32 40 C32 26 40 21 50 21 C60 21 68 26 68 40 C64 31 57 28 50 28 C43 28 36 31 32 40 Z" fill={hair} />;
    case "braids":
      return (
        <G fill={hair}>
          <Path d="M30 46 C29 27 38 19 50 19 C62 19 71 27 70 46 C66 34 59 30 50 30 C41 30 34 34 30 46 Z" />
          {[0, 1, 2].map((i) => (
            <Rect key={`l${i}`} x={27 + i * 2} y={40 + i * 6} width={4} height={22 - i * 4} rx={2} />
          ))}
          {[0, 1, 2].map((i) => (
            <Rect key={`r${i}`} x={69 - i * 2} y={40 + i * 6} width={4} height={22 - i * 4} rx={2} />
          ))}
        </G>
      );
    case "cap":
      return (
        <G>
          <Path d="M32 36 C32 22 40 17 50 17 C60 17 68 22 68 36 Z" fill={a.accent} />
          <Path d="M36 25 H64 M34 31 H66" stroke={shade(a.accent, -50)} strokeWidth={1.4} strokeDasharray="2 3" />
        </G>
      );
    case "afro":
      return <Circle cx={50} cy={36} r={26} fill={hair} />;
    case "locs":
      return (
        <G fill={hair}>
          <Path d="M30 44 C29 26 38 18 50 18 C62 18 71 26 70 44 C66 33 59 29 50 29 C41 29 34 33 30 44 Z" />
          {[28, 33, 64, 69].map((x, i) => (
            <Rect key={i} x={x} y={36} width={4} height={i % 2 ? 26 : 30} rx={2} />
          ))}
        </G>
      );
  }
}

/** Illustrated preset avatar (SVG) with optional league ring, cosmetic frame and state badge. */
export function Avatar({
  id,
  size = 48,
  league,
  frameId,
  stateCode,
  label,
}: {
  id: string;
  size?: number;
  league?: LeagueId;
  frameId?: string | null;
  stateCode?: string | null;
  label?: string;
}) {
  const { c } = useTheme();
  const a = AVATARS.find((x) => x.id === id) ?? AVATARS[0]!;
  const ring = league ? LEAGUES.find((l) => l.id === league)?.color : undefined;
  const frame = frameId ? COSMETICS.find((x) => x.id === frameId && x.kind === "frame") : undefined;
  const ringW = Math.max(2, Math.round(size / 18));
  const inner = ring || frame ? size - ringW * 2 - 4 : size;
  const gid = useSvgId("frame");
  const bgId = useSvgId("avbg");
  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={label ?? `${a.name} avatar`}>
      {ring || frame ? (
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          {frame ? (
            <Defs>
              <SvgGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={frame.colors[0]} />
                <Stop offset="1" stopColor={frame.colors[1]} />
              </SvgGradient>
            </Defs>
          ) : null}
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - ringW / 2} stroke={frame ? `url(#${gid})` : ring} strokeWidth={ringW} fill="none" />
        </Svg>
      ) : null}
      <View style={{ position: "absolute", left: (size - inner) / 2, top: (size - inner) / 2 }}>
        <Svg width={inner} height={inner} viewBox="0 0 100 100">
          <Defs>
            <SvgGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={shade(a.bg, 25)} />
              <Stop offset="1" stopColor={shade(a.bg, -25)} />
            </SvgGradient>
          </Defs>
          <Circle cx={50} cy={50} r={50} fill={`url(#${bgId})`} />
          <G clipPath={undefined}>
            <Path d="M14 100 C16 78 32 70 50 70 C68 70 84 78 86 100 Z" fill={shade(a.bg, -70)} />
            <Path d="M40 70 L50 80 L60 70" fill="none" stroke={a.accent} strokeWidth={3} strokeLinejoin="round" />
            <Rect x={43} y={58} width={14} height={14} rx={5} fill={shade(a.skin, -18)} />
            {a.hair === "afro" ? <Hair a={a} /> : null}
            <Ellipse cx={33} cy={48} rx={4} ry={6} fill={shade(a.skin, -10)} />
            <Ellipse cx={67} cy={48} rx={4} ry={6} fill={shade(a.skin, -10)} />
            <Ellipse cx={50} cy={45} rx={17} ry={20} fill={a.skin} />
            <Ellipse cx={43.5} cy={46} rx={2.2} ry={2.6} fill="#120C08" />
            <Ellipse cx={56.5} cy={46} rx={2.2} ry={2.6} fill="#120C08" />
            <Path d="M44 55 C47 58.5 53 58.5 56 55" stroke="#120C08" strokeWidth={2} fill="none" strokeLinecap="round" />
            {a.hair !== "afro" ? <Hair a={a} /> : null}
          </G>
        </Svg>
      </View>
      {stateCode ? (
        <View
          className="absolute rounded-chip bg-surface border border-line px-1.5"
          style={{ right: -4, bottom: -2, borderColor: c.line, minWidth: 22, alignItems: "center" }}
          accessibilityLabel={`State ${stateCode}`}
        >
          <Txt variant="overline" style={{ fontSize: Math.max(9, size / 6), lineHeight: Math.max(13, size / 4.2) }}>
            {stateCode}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
