import Constants from "expo-constants";
import { Platform } from "react-native";

/** Resolve the game server: explicit env, else the dev machine that served the bundle, port 2567. */
function resolveServer(): string {
  const env = process.env.EXPO_PUBLIC_SERVER_URL;
  if (env) return env.replace(/\/$/, "");
  if (Platform.OS === "web" && typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:2567`;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host ?? "localhost"}:2567`;
}

export const SERVER_URL = resolveServer();
export const WS_URL = SERVER_URL.replace(/^http/, "ws");
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const HAS_SUPABASE = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "https://naijatrivia.app");
