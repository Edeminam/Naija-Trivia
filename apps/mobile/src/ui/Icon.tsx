import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { Palette } from "../theme/tokens";

export const ICON_STROKE = 2;

type Tone = "default" | "muted" | "faint" | "primary" | "accent" | "danger" | "ink" | "white";

const toneColor = (c: Palette, tone: Tone) =>
  ({ default: c.text, muted: c.muted, faint: c.faint, primary: c.primaryText, accent: c.accent, danger: c.dangerText, ink: c.primaryInk, white: "#FFFFFF" })[tone];

/** One outline icon set (lucide) at a consistent stroke width. */
export function Icon({ as: Cmp, size = 20, tone = "default", color }: { as: LucideIcon; size?: number; tone?: Tone; color?: string }) {
  const { c } = useTheme();
  return <Cmp size={size} strokeWidth={ICON_STROKE} color={color ?? toneColor(c, tone)} absoluteStrokeWidth={false} />;
}
