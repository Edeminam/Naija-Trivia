import "../global.css";
import "../lib/interop";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { queryClient } from "../lib/queryClient";
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
        <Stack.Screen name="report" options={{ presentation: "transparentModal", animation: "fade" }} />
      </Stack>
      <AdOverlayHost />
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Satoshi-Medium": require("../../assets/fonts/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../../assets/fonts/Satoshi-Bold.ttf"),
    "Satoshi-Black": require("../../assets/fonts/Satoshi-Black.ttf"),
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
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
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Shell />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
