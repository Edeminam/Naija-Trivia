import type { AuthClient } from "@supabase/auth-js";
import { Platform } from "react-native";
import { AsyncStorage } from "./storage";
import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

type Supabase = { auth: InstanceType<typeof AuthClient> };

let client: Promise<Supabase | null> | null = null;

/**
 * Supabase is used only for Auth on the client (all data goes through the game server), so we ship
 * just the auth client — and load it on first use, keeping it out of the start-up bundle on web.
 */
export function getSupabase(): Promise<Supabase | null> {
  if (!HAS_SUPABASE) return Promise.resolve(null);
  client ??= import("@supabase/auth-js").then(({ AuthClient }) => ({
    auth: new AuthClient({
      url: `${SUPABASE_URL}/auth/v1`,
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      storageKey: "ntc.supabase.auth",
      storage: AsyncStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    }),
  }));
  return client;
}
