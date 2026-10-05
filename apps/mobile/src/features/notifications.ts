import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { LAGOS_OFFSET_MS, lagosDate } from "@ntc/shared";
import { api } from "../lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const REMINDER_TAG = "daily-reminder";

/** Ask permission (only when the user turns notifications on) and register the Expo push token. */
export async function enableNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const cur = await Notifications.getPermissionsAsync();
  let granted = cur.granted;
  if (!granted && cur.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Reminders", importance: Notifications.AndroidImportance.DEFAULT });
  }
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (projectId) {
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await api.patch("/me", { pushToken: token });
    }
  } catch {
    /* push token needs an EAS project id; local reminders still work */
  }
  return true;
}

export async function disableNotifications() {
  if (Platform.OS === "web") return;
  await cancelReminders();
  await api.patch("/me", { pushToken: null }).catch(() => {});
}

async function cancelReminders() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.content.data?.tag === REMINDER_TAG).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/**
 * Schedule 7pm-WAT Daily Naija reminders for the next 7 evenings (skipping today if already played).
 * Re-run on app open and after playing so it stays accurate offline.
 */
export async function scheduleDailyReminders(playedToday: boolean) {
  if (Platform.OS === "web") return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await cancelReminders();
  const today = lagosDate();
  for (let d = 0; d < 7; d++) {
    const base = Date.parse(`${today}T00:00:00Z`) + d * 86_400_000;
    const at = base + 19 * 3_600_000 - LAGOS_OFFSET_MS; // 19:00 WAT in epoch ms
    if (at <= Date.now() || (d === 0 && playedToday)) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: "Daily Naija dey wait you 🔥", body: "10 questions, one shot. Keep your streak alive.", data: { tag: REMINDER_TAG, url: "/daily" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
    });
  }
}
