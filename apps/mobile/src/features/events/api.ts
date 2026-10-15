import { useQuery } from "@tanstack/react-query";
import type { LiveEventStatus } from "@ntc/shared";
import { api } from "../../lib/api";
import { useSession } from "../../stores/session";

export function useLiveEvent(id: string | undefined) {
  const token = useSession((s) => s.token);
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => api.get<LiveEventStatus>(`/events/${id}`),
    enabled: !!token && !!id,
    // The leaderboard moves fast while an event is live.
    refetchInterval: (q) => (q.state.data?.phase === "live" ? 15_000 : false),
  });
}
