import { useQuery } from "@tanstack/react-query";
import type { DailyStatus, LeaderboardPlayer } from "@ntc/shared";
import { api } from "../../lib/api";
import { useSession } from "../../stores/session";

export function useDaily() {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: ["daily"], queryFn: () => api.get<DailyStatus>("/daily"), enabled: !!token });
}

export function useDailyBoard(state: string | null) {
  const token = useSession((s) => s.token);
  return useQuery({
    queryKey: ["daily-board", state ?? "all"],
    queryFn: () => api.get<{ date: string; players: LeaderboardPlayer[] }>(`/daily/leaderboard${state ? `?state=${state}` : ""}`),
    enabled: !!token,
  });
}
