import { useQuery } from "@tanstack/react-query";
import type { StateWarsResponse, LeaderboardPlayer, LeaguesResponse, StateDef } from "@ntc/shared";
import { api } from "../../lib/api";
import { useSession } from "../../stores/session";

export function useStateWars() {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: ["state-wars"], queryFn: () => api.get<StateWarsResponse>("/state-wars"), enabled: !!token, refetchInterval: 60_000 });
}

export function useStateTop(code: string | undefined) {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: ["state-top", code], queryFn: () => api.get<{ state?: StateDef; players: LeaderboardPlayer[]; weekStart: string }>(`/state-wars/${code}`), enabled: !!token && !!code });
}

export function useLeagues() {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: ["leagues"], queryFn: () => api.get<LeaguesResponse>("/leagues"), enabled: !!token });
}
