import { createContext, useContext, useMemo, type ReactNode } from "react";
import { View, useColorScheme } from "react-native";
import { vars } from "nativewind";
import { palettes, rgb, type Palette, type ThemeName } from "./tokens";
import { usePrefs } from "../stores/prefs";

function cssVars(p: Palette) {
  return vars({
    "--bg": rgb(p.bg),
    "--surface": rgb(p.surface),
    "--raised": rgb(p.raised),
    "--line": p.line,
    "--primary": rgb(p.primary),
    "--primary-pressed": rgb(p.primaryPressed),
    "--primary-ink": rgb(p.primaryInk),
    "--primary-text": rgb(p.primaryText),
    "--primary-soft": p.primarySoft,
    "--accent": rgb(p.accent),
    "--accent-text": rgb(p.accentText),
    "--accent-soft": p.accentSoft,
    "--danger": rgb(p.danger),
    "--danger-text": rgb(p.dangerText),
    "--danger-soft": p.dangerSoft,
    "--text": rgb(p.text),
    "--muted": rgb(p.muted),
    "--faint": rgb(p.faint),
  });
}

const themeVars = { dark: cssVars(palettes.dark), light: cssVars(palettes.light) };

interface ThemeCtx {
  name: ThemeName;
  c: Palette;
}

const Ctx = createContext<ThemeCtx>({ name: "dark", c: palettes.dark });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = usePrefs((s) => s.theme);
  const name: ThemeName = pref === "system" ? (system === "light" ? "light" : "dark") : pref;
  const value = useMemo(() => ({ name, c: palettes[name] as Palette }), [name]);
  return (
    <Ctx.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: value.c.bg }, themeVars[name]]}>{children}</View>
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
