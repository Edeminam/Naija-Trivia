import "../global.css";
import "../lib/interop";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { FONT_SOURCES } from "../theme/fonts";
import { queryClient, persister, PERSISTED_KEYS } from "../lib/queryClient";
import "../lib/outbox";
import "../features/daily/offline";
import { ToastHost } from "../ui";
import { useSession } from "../stores/session";
import { usePrefs } from "../stores/prefs";
import { AdOverlayHost } from "../features/ads/AdOverlay";
import { useAppBootstrap } from "../features/bootstrap";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { name, c } = useTheme();
  useAppBootstrap();
  return (
    <>
      <StatusBar style={name === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: "fade_from_bottom", animationDuration: 220 }}>
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="match" options={{ gestureEnabled: false, animation: "fade" }} />
      </Stack>
      <AdOverlayHost />
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_SOURCES);
  const hydrated = useSession((s) => s.hydrated);
  const prefsHydrated = usePrefs((s) => s.hydrated);
  const ready = (fontsLoaded || !!fontError) && hydrated && prefsHydrated;

  useEffect(() => {
    void useSession.getState().hydrate();
  }, []);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 24 * 60 * 60_000, buster: "v1", dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && PERSISTED_KEYS.has(String(q.queryKey[0])) } }}
        >
          <ThemeProvider>
            <Shell />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
