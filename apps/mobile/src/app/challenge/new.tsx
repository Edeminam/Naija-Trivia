import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Play, Clock, Crown } from "lucide-react-native";
import { categoryBySlug, type ChallengeSummary } from "@ntc/shared";
import { Screen, Txt, Button, Card, Chip, Avatar, Icon, ErrorState, SkeletonCard } from "../../ui";
import { api, ApiError } from "../../lib/api";
import { ShareActions } from "../../features/challenge/ShareActions";
import { useCountdown } from "../../lib/useCountdown";

export default function NewChallenge() {
  const create = useMutation({ mutationFn: () => api.post<ChallengeSummary>("/challenges") });
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) {
      setStarted(true);
      create.mutate();
    }
  }, [started, create]);
  const c = create.data;
  const { text } = useCountdown(c ? Date.parse(c.expiresAt) : null);
  const err = create.error as ApiError | null;

  return (
    <Screen title="Challenge a friend" back>
      {err ? (
        err.code === "challenge_limit" ? (
          <Card className="p-5 gap-4 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft"><Icon as={Crown} size={28} tone="accent" /></View>
            <Txt variant="h2" className="text-center">You've used today's free challenges</Txt>
            <Txt variant="body" tone="muted" className="text-center">{err.message}</Txt>
            <Button label="See Premium" variant="accent" full onPress={() => router.push("/shop")} />
          </Card>
        ) : (
          <ErrorState offline={err.offline} body={err.message} onRetry={() => create.mutate()} />
        )
      ) : !c ? (
        <View className="gap-4"><SkeletonCard lines={3} /><SkeletonCard lines={2} /></View>
      ) : (
        <View className="gap-5">
          <Card variant="hero" className="p-5 gap-4">
            <View className="flex-row items-center gap-3">
              <Avatar id={c.createdBy.avatarId} size={52} league={c.createdBy.league} frameId={c.createdBy.frameId} />
              <View className="flex-1">
                <Txt variant="overline" tone="primary">Challenge #{c.code}</Txt>
                <Txt variant="h2">7 questions, same for both</Txt>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {c.categories.map((s) => <Chip key={s} label={categoryBySlug(s)?.name ?? s} tone="primary" />)}
            </View>
            <View className="flex-row items-center gap-2">
              <Icon as={Clock} size={16} tone="muted" />
              <Txt variant="caption" tone="muted">Expires in <Txt variant="caption" tabular>{text}</Txt> · Q7 is Double Wahala</Txt>
            </View>
          </Card>
          <Button label="Play your round first" icon={Play} size="lg" full variant="accent" onPress={() => router.push({ pathname: "/c/[code]/play", params: { code: c.code } })} />
          <Txt variant="caption" tone="muted" className="text-center">Then send it. Your friend plays the exact same questions — highest score wins, fastest breaks ties.</Txt>
          <ShareActions c={c} />
        </View>
      )}
    </Screen>
  );
}
