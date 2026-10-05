import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSession } from "../stores/session";
import { usePrefs, settingsOf } from "../stores/prefs";
import { api } from "../lib/api";
import { useMe } from "./me";
import { scheduleDailyReminders } from "./notifications";

/** App-wide side effects: settings sync, notification routing, reminders. */
export function useAppBootstrap() {
  const token = useSession((s) => s.token);
  const me = useMe();
  const pulled = useRef(false);

  // Server settings win on first load for this account; local edits push back afterwards.
  useEffect(() => {
    if (!me.data || pulled.current) return;
    pulled.current = true;
    usePrefs.getState().replace(me.data.profile.settings);
  }, [me.data]);

  useEffect(() => {
    if (!token) {
      pulled.current = false;
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = usePrefs.subscribe((s, prev) => {
      if (!pulled.current) return;
      const a = JSON.stringify(settingsOf(s));
      if (a === JSON.stringify(settingsOf(prev))) return;
      clearTimeout(timer);
      timer = setTimeout(() => void api.patch("/me", { settings: settingsOf(usePrefs.getState()) }).catch(() => {}), 600);
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [token]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url;
      if (typeof url === "string") router.push(url as any);
    });
    return () => sub.remove();
  }, []);

  const notificationsOn = usePrefs((s) => s.notifications);
  useEffect(() => {
    if (notificationsOn && token) void scheduleDailyReminders(false).catch(() => {});
  }, [notificationsOn, token]);
}
