import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChallengeSummary, FriendsResponse, FriendStatus, PlayerSearchResult } from "@ntc/shared";
import { api } from "../../lib/api";
import { useSession } from "../../stores/session";

export const friendsKey = ["friends"] as const;

export function useFriends() {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: friendsKey, queryFn: () => api.get<FriendsResponse>("/friends"), enabled: !!token });
}

export function usePlayerSearch(q: string) {
  const token = useSession((s) => s.token);
  const term = q.trim();
  return useQuery({
    queryKey: ["player-search", term.toLowerCase()],
    queryFn: () => api.get<{ players: PlayerSearchResult[] }>(`/players/search?q=${encodeURIComponent(term)}`),
    enabled: !!token && term.length >= 2,
    staleTime: 10_000,
  });
}

export function useFriendStatus(id: string | undefined) {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: ["friend-status", id], queryFn: () => api.get<{ status: FriendStatus }>(`/friends/${id}/status`), enabled: !!token && !!id });
}

/** Add / accept / remove. Refreshes every view that shows friendship state. */
export function useFriendAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "add" | "accept" | "remove" }) =>
      action === "remove" ? api.del<{ status: FriendStatus }>(`/friends/${id}`) : api.post<{ status: FriendStatus }>(action === "accept" ? `/friends/${id}/accept` : `/friends/${id}`),
    onSuccess: (r, v) => {
      qc.setQueryData(["friend-status", v.id], r);
      void qc.invalidateQueries({ queryKey: friendsKey });
      void qc.invalidateQueries({ queryKey: ["player-search"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useChallengeFriend() {
  return useMutation({ mutationFn: (id: string) => api.post<ChallengeSummary>(`/friends/${id}/challenge`) });
}
