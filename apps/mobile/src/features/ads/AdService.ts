import { create } from "zustand";
import { api } from "../../lib/api";

/**
 * Ads behind an interface. The mock shows a 3-second branded overlay.
 * Rules (enforced server-side + here): interstitial only after every 3rd completed match,
 * never mid-match, never for Premium users.
 */
export interface AdService {
  showRewarded(reason: string): Promise<{ rewarded: boolean; coins?: number; amount?: number }>;
  showInterstitial(): Promise<void>;
}

interface OverlayState {
  open: null | { kind: "rewarded" | "interstitial"; resolve: (completed: boolean) => void };
}
export const useAdOverlay = create<OverlayState>(() => ({ open: null }));

const showOverlay = (kind: "rewarded" | "interstitial") => new Promise<boolean>((resolve) => useAdOverlay.setState({ open: { kind, resolve } }));

class MockAdService implements AdService {
  async showRewarded(reason: string) {
    const completed = await showOverlay("rewarded");
    if (!completed) return { rewarded: false };
    const r = await api.post<{ coins: number; amount: number }>("/ads/rewarded", { reason });
    return { rewarded: true, ...r };
  }
  async showInterstitial() {
    const { show } = await api.get<{ show: boolean }>("/ads/interstitial").catch(() => ({ show: false }));
    if (!show) return;
    await showOverlay("interstitial");
    await api.post("/ads/interstitial/shown").catch(() => {});
  }
}

export const ads: AdService = new MockAdService();
