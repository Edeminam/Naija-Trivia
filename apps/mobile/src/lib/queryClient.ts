import { QueryClient, onlineManager, focusManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { AppState, Platform } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
      retry: (count, err: any) => (err?.status && err.status < 500 && err.status !== 408 ? false : count < 2),
      retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
      networkMode: "offlineFirst",
    },
    mutations: { networkMode: "offlineFirst", retry: 0 },
  },
});

// Wire TanStack Query to device connectivity and foreground state.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)));
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));
}
