import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { usePrefs } from "../stores/prefs";

const enabled = () => Platform.OS !== "web" && usePrefs.getState().haptics;

/** Haptic vocabulary: light tap on answer, success/error on reveal, medium on match found. */
export const haptic = {
  tap: () => enabled() && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => enabled() && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => enabled() && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => enabled() && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  select: () => enabled() && void Haptics.selectionAsync().catch(() => {}),
};
