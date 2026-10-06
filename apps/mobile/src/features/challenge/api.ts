import { useQuery } from "@tanstack/react-query";
import type { ChallengeSummary } from "@ntc/shared";
import { api } from "../../lib/api";

export function useChallenge(code: string | undefined) {
  return useQuery({ queryKey: ["challenge", code], queryFn: () => api.get<ChallengeSummary>(`/challenges/${code}`), enabled: !!code, refetchInterval: 15_000 });
}
