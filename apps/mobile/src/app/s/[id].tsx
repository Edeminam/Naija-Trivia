import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Swords, Bot } from "lucide-react-native";
import { categoryBySlug, stateByCode } from "@ntc/shared";
import { Screen, Txt, Card, Avatar, Button, Chip, Icon, ErrorState, SkeletonCard, EmptyState } from "../../ui";
import { api, type ApiError } from "../../lib/api";
import { useSession } from "../../stores/session";

interface PublicMatch {
  id: string;
  isBot: boolean;
  type: string;
  a: { username: string; avatarId: string; stateCode: string; rating: number } | null;
  b: { username: string; avatarId: string; stateCode: string; rating: number } | null;
  scoreA: number;
  scoreB: number;
  winner: "a" | "b" | null;
  categories: string[];
  createdAt: string;
}

/** Landing page for shared match results (deep link target). */
export default function SharedMatch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSession((s) => s.token);
  const q = useQuery({ queryKey: ["public-match", id], queryFn: () => api.get<PublicMatch>(`/matches/${id}/public`), enabled: !!id });
  const m = q.data;
  const err = q.error as ApiError | null;
  const side = (p: PublicMatch["a"], score: number, won: boolean, bot?: boolean) => (
    <View className="flex-1 items-center gap-2">
      <Avatar id={p?.avatarId ?? "ada"} size={80} stateCode={bot ? null : p?.stateCode} />
      <View className="flex-row items-center gap-1">
        {bot ? <Icon as={Bot} size={14} tone="faint" /> : null}
        <Txt variant="bodyStrong" numberOfLines={1}>{p?.username ?? "Player"}</Txt>
      </View>
      <Txt variant="caption" tone="muted">{bot ? "Practice opponent" : stateByCode(p?.stateCode)?.name}</Txt>
      <Txt variant="display" tone={won ? "accent" : "default"} tabular>{score.toLocaleString("en-NG")}</Txt>
    </View>
  );
  return (
    <Screen back={!!token}>
      <View className="flex-row items-center gap-2 mb-5">
        <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-primary"><Icon as={Swords} size={18} tone="ink" /></View>
        <Txt variant="h3">Naija Trivia Clash</Txt>
      </View>
      {err && !m ? (
        err.status === 404 ? <EmptyState icon={Swords} title="Match not found" body="This result link may be broken." /> : <ErrorState offline={err.offline} onRetry={() => q.refetch()} />
      ) : !m ? (
        <SkeletonCard lines={4} />
      ) : (
        <View className="gap-5">
          <Card variant="hero" className="p-6 gap-5">
            <Txt variant="overline" tone="primary" className="text-center">{m.isBot ? "Practice match" : m.type === "friend" ? "Friend challenge" : "Ranked clash"}</Txt>
            <Txt variant="h1" className="text-center">{m.winner ? `${(m.winner === "a" ? m.a : m.b)?.username} won` : "It's a draw"}</Txt>
            <View className="flex-row items-start">
              {side(m.a, m.scoreA, m.winner === "a")}
              <Txt variant="h2" tone="faint" className="mt-8">vs</Txt>
              {side(m.b, m.scoreB, m.winner === "b", m.isBot)}
            </View>
            <View className="flex-row flex-wrap justify-center gap-2">
              {m.categories.map((s) => <Chip key={s} label={categoryBySlug(s)?.name ?? s} tone="primary" />)}
            </View>
          </Card>
          <Button label={token ? "Play a clash" : "Play free now"} icon={Swords} size="lg" full onPress={() => router.replace(token ? "/match/play" : "/onboarding")} />
          <Txt variant="caption" tone="muted" className="text-center">Real-time 1v1 Naija trivia. Every win adds points to your state.</Txt>
        </View>
      )}
    </Screen>
  );
}
