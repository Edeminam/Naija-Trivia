import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

/** Host of the machine serving the JS bundle (the dev machine), e.g. 192.168.1.5 or 10.0.2.2. */
function devHost(): string | null {
  const fromExpo = Constants.expoConfig?.hostUri?.split(":")[0];
  if (fromExpo) return fromExpo;
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  const m = scriptURL?.match(/^https?:\/\/([^/:]+)/);
  if (m?.[1]) return m[1];
  // Android emulator reaches the host machine at 10.0.2.2; iOS simulator shares localhost.
  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
}

/** Resolve the game server: explicit env, else the dev machine that served the bundle, port 2567. */
function resolveServer(): string {
  const env = process.env.EXPO_PUBLIC_SERVER_URL;
  if (env) return env.replace(/\/$/, "");
  if (Platform.OS === "web" && typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:2567`;
  return `http://${devHost()}:2567`;
}

export const SERVER_URL = resolveServer();
export const WS_URL = SERVER_URL.replace(/^http/, "ws");
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const HAS_SUPABASE = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "https://naijatrivia.app");
