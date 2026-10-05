import { create } from "zustand";
import { secure } from "../lib/storage";

const KEY = "ntc.session";

interface SessionState {
  token: string | null;
  userId: string | null;
  provider: "dev" | "supabase" | null;
  hydrated: boolean;
  setSession: (s: { token: string; userId: string; provider: "dev" | "supabase" }) => Promise<void>;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  token: null,
  userId: null,
  provider: null,
  hydrated: false,
  async setSession(s) {
    set({ ...s });
    await secure.set(KEY, JSON.stringify(s));
  },
  async clear() {
    set({ token: null, userId: null, provider: null });
    await secure.set(KEY, null);
  },
  async hydrate() {
    const raw = await secure.get(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        set({ token: s.token, userId: s.userId, provider: s.provider, hydrated: true });
        return;
      } catch {
        /* corrupted — start fresh */
      }
    }
    set({ hydrated: true });
  },
}));

/** Read the token outside React (API client, socket). */
export const getToken = () => useSession.getState().token;
