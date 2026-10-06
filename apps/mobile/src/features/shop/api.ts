import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CosmeticDef, PowerUpDef, ProductDef, MeResponse } from "@ntc/shared";
import { api } from "../../lib/api";
import { useSession } from "../../stores/session";
import { meKey } from "../me";

export interface ShopData {
  coins: number;
  premium: { active: boolean; until: string | null };
  equipped: { frameId: string | null; buttonThemeId: string | null };
  owned: Record<string, number>;
  powerUps: (PowerUpDef & { owned: number })[];
  cosmetics: (CosmeticDef & { owned: boolean })[];
  products: ProductDef[];
}

export function useShop() {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: ["shop"], queryFn: () => api.get<ShopData>("/shop"), enabled: !!token });
}

export function useShopRefresh() {
  const qc = useQueryClient();
  return (coins?: number) => {
    if (coins != null) qc.setQueryData<MeResponse>(meKey, (old) => (old ? { ...old, profile: { ...old.profile, coins } } : old));
    void qc.invalidateQueries({ queryKey: ["shop"] });
    void qc.invalidateQueries({ queryKey: meKey });
  };
}

export function useBuyItem() {
  const refresh = useShopRefresh();
  return useMutation({
    mutationFn: (v: { kind: "power_up" | "cosmetic"; itemId: string }) => api.post<{ coins: number; itemId: string }>("/shop/buy-item", v),
    onSuccess: (r) => refresh(r.coins),
  });
}

export function useEquip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { frameId?: string | null; buttonThemeId?: string | null }) => api.patch<MeResponse>("/me", v),
    onSuccess: (r) => {
      qc.setQueryData(meKey, r);
      void qc.invalidateQueries({ queryKey: ["shop"] });
    },
  });
}
