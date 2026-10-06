import { useQuery } from "@tanstack/react-query";
import type { ProfileStatsResponse } from "@ntc/shared";
import { api } from "../../lib/api";
import { useSession } from "../../stores/session";

export function useProfileStats(id = "me") {
  const token = useSession((s) => s.token);
  return useQuery({ queryKey: ["profile-stats", id], queryFn: () => api.get<ProfileStatsResponse>(`/profile/${id}/stats`), enabled: !!token });
}
