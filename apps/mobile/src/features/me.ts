import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MeResponse } from "@ntc/shared";
import { api } from "../lib/api";
import { useSession } from "../stores/session";

export const meKey = ["me"] as const;

export function useMe() {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: meKey, queryFn: () => api.get<MeResponse>("/me"), enabled: !!token, staleTime: 15_000 });
}

/** Optimistically patch cached coins etc. after a mutation returns a new balance. */
export function useSetCoins() {
  const qc = useQueryClient();
  return (coins: number) => qc.setQueryData<MeResponse>(meKey, (old) => (old ? { ...old, profile: { ...old.profile, coins } } : old));
}
