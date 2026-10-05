import { Easing } from "react-native-reanimated";

/** Brand palettes. Everything visual derives from these. */
export const palettes = {
  dark: {
    bg: "#0B0F0D",
    surface: "#141A17",
    raised: "#1C2420",
    line: "rgba(255,255,255,0.08)",
    lineStrong: "rgba(255,255,255,0.14)",
    primary: "#0FA958",
    primaryPressed: "#0B8A47",
    /** text on primary fills — dark ink keeps contrast ≥ 4.5:1 */
    primaryInk: "#03140B",
    /** primary used as text on bg */
    primaryText: "#2FCB78",
    primarySoft: "rgba(15,169,88,0.14)",
    accent: "#E8B44A",
    accentText: "#F0C76E",
    accentSoft: "rgba(232,180,74,0.14)",
    danger: "#E5484D",
    dangerText: "#FF6B6F",
    dangerSoft: "rgba(229,72,77,0.14)",
    text: "#F4F6F5",
    muted: "#A3ADA8",
    faint: "#6E7873",
    overlay: "rgba(5,8,6,0.72)",
  },
  light: {
    bg: "#F7F8F6",
    surface: "#FFFFFF",
    raised: "#EEF1EE",
    line: "rgba(14,20,17,0.08)",
    lineStrong: "rgba(14,20,17,0.14)",
    primary: "#0FA958",
    primaryPressed: "#0B8A47",
    primaryInk: "#03140B",
    primaryText: "#0A7A40",
    primarySoft: "rgba(15,169,88,0.12)",
    accent: "#E8B44A",
    accentText: "#8A6110",
    accentSoft: "rgba(232,180,74,0.18)",
    danger: "#E5484D",
    dangerText: "#C52F34",
    dangerSoft: "rgba(229,72,77,0.12)",
    text: "#0E1411",
    muted: "#55605A",
    faint: "#87918C",
    overlay: "rgba(14,20,17,0.45)",
  },
} as const;

export type ThemeName = keyof typeof palettes;
export type Palette = { [K in keyof (typeof palettes)["dark"]]: string };

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;
export const SCREEN_PADDING = 20;
export const radius = { card: 20, btn: 14, chip: 999, sm: 10 } as const;
export const TOUCH = 48;

export const type = { "3xl": 34, "2xl": 28, xl: 22, lg: 17, base: 15, sm: 13 } as const;

export const fonts = {
  display: "Satoshi-Black",
  heading: "Satoshi-Bold",
  headingMedium: "Satoshi-Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
} as const;

/** Motion: 150–250ms ease-out; springs for presses and count-ups. */
export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
  easeOut: Easing.bezier(0.22, 1, 0.36, 1),
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  pop: { damping: 14, stiffness: 220 },
  pressScale: 0.97,
} as const;

/** hex → "r g b" for CSS variables */
export function rgb(hex: string): string {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}
