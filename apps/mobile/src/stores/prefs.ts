import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_SETTINGS, type Settings } from "@ntc/shared";
import { AsyncStorage } from "../lib/storage";

interface PrefsState extends Settings {
  set: (patch: Partial<Settings>) => void;
  replace: (s: Settings) => void;
  hydrated: boolean;
}

/** Device-level preferences. Mirrored to the server profile when signed in. */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      set: (patch) => set(patch),
      replace: (s) => set(s),
    }),
    {
      name: "ntc.prefs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, replace: _r, hydrated: _h, ...rest }) => rest,
      onRehydrateStorage: () => () => usePrefs.setState({ hydrated: true }),
    },
  ),
);

export const settingsOf = (s: PrefsState): Settings => ({
  theme: s.theme,
  sound: s.sound,
  haptics: s.haptics,
  notifications: s.notifications,
  dataSaver: s.dataSaver,
  reduceMotion: s.reduceMotion,
  pidginFlavour: s.pidginFlavour,
  questionLanguage: s.questionLanguage,
});
