import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HomeResponse } from "@ntc/shared";
import { api } from "../../lib/api";
import { useSession } from "../../stores/session";
import { meKey } from "../me";

export type HomeData = HomeResponse & { chest: { available: boolean; amount: number } };

export function useHome() {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: ["home"], queryFn: () => api.get<HomeData>("/home"), enabled: !!token });
}

export function useClaimMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ reward: number; coins: number }>(`/missions/${id}/claim`),
    onSuccess: (r) => {
      qc.setQueryData(meKey, (old: any) => (old ? { ...old, profile: { ...old.profile, coins: r.coins } } : old));
      void qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useClaimChest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ coins: number; amount: number }>("/chest/claim"),
    onSuccess: (r) => {
      qc.setQueryData(meKey, (old: any) => (old ? { ...old, profile: { ...old.profile, coins: r.coins } } : old));
      qc.setQueryData<HomeData>(["home"], (old) => (old ? { ...old, chest: { ...old.chest, available: false } } : old));
    },
  });
}
