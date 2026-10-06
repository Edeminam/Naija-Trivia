import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { usePrefs } from "../stores/prefs";

const SOURCES = {
  tap: require("../../assets/sounds/tap.wav"),
  correct: require("../../assets/sounds/correct.wav"),
  wrong: require("../../assets/sounds/wrong.wav"),
  found: require("../../assets/sounds/found.wav"),
  win: require("../../assets/sounds/win.wav"),
  wahala: require("../../assets/sounds/wahala.wav"),
} as const;

type Sfx = keyof typeof SOURCES;
const players: Partial<Record<Sfx, AudioPlayer>> = {};
let ready = false;

function init() {
  if (ready) return;
  ready = true;
  // Respect the silent switch; mix with the user's music instead of stopping it.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
}

/** Tiny SFX layer; honours the Sound setting and never throws. */
export const sfx = {
  play(name: Sfx) {
    if (!usePrefs.getState().sound) return;
    try {
      init();
      let p = players[name];
      if (!p) p = players[name] = createAudioPlayer(SOURCES[name]);
      p.volume = name === "tap" ? 0.4 : 0.7;
      void p.seekTo(0);
      p.play();
    } catch {
      /* audio unavailable (e.g. autoplay policy on web) */
    }
  },
};
