import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { usePrefs } from "../stores/prefs";

/** True when the OS or the in-app setting asks for reduced motion. */
export function useReducedMotion() {
  const pref = usePrefs((s) => s.reduceMotion);
  const [os, setOs] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOs).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOs);
    return () => sub.remove();
  }, []);
  return pref || os;
}
