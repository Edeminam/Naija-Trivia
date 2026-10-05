import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** Secrets (session token) go to the keychain on device; web falls back to localStorage. */
export const secure = {
  async get(key: string) {
    try {
      if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string | null) {
    try {
      if (Platform.OS === "web") {
        if (value === null) globalThis.localStorage?.removeItem(key);
        else globalThis.localStorage?.setItem(key, value);
        return;
      }
      if (value === null) await SecureStore.deleteItemAsync(key);
      else await SecureStore.setItemAsync(key, value);
    } catch {
      /* storage unavailable (private mode) — session simply won't persist */
    }
  },
};

export { AsyncStorage };
