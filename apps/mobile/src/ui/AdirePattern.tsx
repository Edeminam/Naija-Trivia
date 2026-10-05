import Svg, { Defs, Pattern, Rect, Circle, Path, G } from "react-native-svg";
import { StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Adire-inspired line pattern (after the Yoruba 'Olokun' resist-dye motif): concentric rings,
 * spiral strokes and stitched lines on a 36pt grid. Rendered at 4% opacity, only on hero cards
 * and result screens — never behind body copy.
 */
export function AdirePattern({ opacity = 0.04, id = "adire" }: { opacity?: number; id?: string }) {
  const { name } = useTheme();
  const stroke = name === "dark" ? "#FFFFFF" : "#0E1411";
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={36} height={36}>
          <G stroke={stroke} strokeOpacity={opacity} strokeWidth={1.4} fill="none" strokeLinecap="round">
            <Circle cx={18} cy={18} r={11} />
            <Circle cx={18} cy={18} r={6} />
            <Circle cx={18} cy={18} r={1.6} fill={stroke} fillOpacity={opacity} />
            <Path d="M0 0 L6 6 M36 0 L30 6 M0 36 L6 30 M36 36 L30 30" />
            <Path d="M18 0 V3 M18 33 V36 M0 18 H3 M33 18 H36" />
          </G>
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
