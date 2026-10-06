import { AuthClient } from "@supabase/auth-js";
import { Platform } from "react-native";
import { AsyncStorage } from "./storage";
import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Supabase is used only for Auth on the client (all data goes through the game server), so we ship
 * just the auth client instead of the full supabase-js bundle.
 */
export const supabase: { auth: InstanceType<typeof AuthClient> } | null = HAS_SUPABASE
  ? {
      auth: new AuthClient({
        url: `${SUPABASE_URL}/auth/v1`,
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        storageKey: "ntc.supabase.auth",
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      }),
    }
  : null;
