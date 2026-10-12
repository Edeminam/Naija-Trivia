import { View } from "react-native";
import { router } from "expo-router";
import { CalendarClock, Info, Swords, Check, Lock, Users, ChevronRight } from "lucide-react-native";
import { LEAGUES, leagueForRating } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Card, LeagueBadge, ProgressBar, Icon, Button, Skeleton, SkeletonCard, ErrorState, AdirePattern } from "../../ui";
import { useLeagues } from "../../features/statewars/api";
import { useCountdown } from "../../lib/useCountdown";
import { cn } from "../../lib/cn";

export default function Leagues() {
  const q = useLeagues();
  const d = q.data;
  const { text } = useCountdown(d ? Date.parse(d.season.endsAt) : null);
  const current = d ? leagueForRating(d.rating) : null;
  const next = d?.nextLeague ? LEAGUES.find((l) => l.id === d.nextLeague) : null;

  return (
    <Screen title="Leagues" refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      {q.isError && !d ? (
        <ErrorState offline={(q.error as any)?.offline} onRetry={() => q.refetch()} />
      ) : !d || !current ? (
        <View className="gap-4"><Skeleton h={280} r={20} /><SkeletonCard lines={4} /></View>
      ) : (
        <>
          <Card variant="hero" className="p-6 items-center gap-4">
            <LeagueBadge league={current.id} size={96} />
            <View className="items-center gap-1">
              <Txt variant="overline" tone="primary">Season {d.season.number}</Txt>
              <Txt variant="display">{current.name}</Txt>
              <Txt variant="h2" tabular tone="muted">{d.rating} rating</Txt>
            </View>
            <View className="w-full gap-2">
              <ProgressBar value={d.progress} label={`Progress to ${next?.name ?? "the top"}`} />
              <View className="flex-row justify-between">
                <Txt variant="caption" tone="muted" tabular>{current.min}</Txt>
                <Txt variant="caption" tone="muted">{next ? `${d.pointsToNext} to ${next.name}` : "You're at the summit"}</Txt>
                <Txt variant="caption" tone="muted" tabular>{current.max ?? "∞"}</Txt>
              </View>
            </View>
            <View className="flex-row w-full gap-2">
              {[
                { l: "Wins", v: d.record.wins },
                { l: "Losses", v: d.record.losses },
                { l: "Draws", v: d.record.draws },
                { l: "Ranked", v: d.rankedGames },
              ].map((s) => (
                <View key={s.l} className="flex-1 items-center rounded-2xl bg-surface border border-line py-2.5">
                  <Txt variant="h3" tabular>{s.v}</Txt>
                  <Txt variant="caption" tone="muted">{s.l}</Txt>
                </View>
              ))}
            </View>
          </Card>

          <Card className="p-4 mt-4 flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-accent-soft"><Icon as={CalendarClock} tone="accent" /></View>
            <View className="flex-1">
              <Txt variant="bodyStrong">Season ends in <Txt variant="bodyStrong" tabular>{text}</Txt></Txt>
              <Txt variant="caption" tone="muted">Rewards pay out for your league at the end, and your finish is kept on your profile. Then everyone drops at most one league.</Txt>
            </View>
          </Card>

          <Card className="p-4 mt-3 flex-row items-center gap-3" onPress={() => router.push("/friends")} accessibilityLabel="Friends leaderboard">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-soft"><Icon as={Users} tone="primary" /></View>
            <View className="flex-1">
              <Txt variant="bodyStrong">Friends leaderboard</Txt>
              <Txt variant="caption" tone="muted">See where you rank among your friends</Txt>
            </View>
            <Icon as={ChevronRight} tone="faint" />
          </Card>

          <SectionTitle title="Leagues & rewards" />
          <Card className="overflow-hidden">
            {[...LEAGUES].reverse().map((l, i) => {
              const isCurrent = l.id === current.id;
              const reached = d.rating >= l.min;
              return (
                <View key={l.id} className={cn("flex-row items-center gap-3 px-4 py-3.5", i > 0 && "border-t border-line", isCurrent && "bg-primary-soft")} accessibilityLabel={`${l.name}, ${l.min}${l.max ? ` to ${l.max - 1}` : " and above"}. Reward ${l.reward}${isCurrent ? ". Your league" : ""}`}>
                  <LeagueBadge league={l.id} size={40} />
                  <View className="flex-1">
                    <Txt variant="bodyStrong">{l.name}{isCurrent ? " · you" : ""}</Txt>
                    <Txt variant="caption" tone="muted" tabular>{l.max ? `${l.min}–${l.max - 1}` : `${l.min}+`}</Txt>
                  </View>
                  <View className="items-end gap-0.5">
                    <Txt variant="label" tone={reached ? "accent" : "faint"}>{l.reward}</Txt>
                    <Icon as={reached ? Check : Lock} size={14} tone={reached ? "primary" : "faint"} />
                  </View>
                </View>
              );
            })}
          </Card>
          <View className="flex-row items-start gap-2 mt-4 px-1">
            <Icon as={Info} size={14} tone="faint" />
            <Txt variant="caption" tone="faint" className="flex-1">Elo rating: K=32 for your first 30 ranked games, then 20. Practice opponents count at half. Seasons last 28 days.</Txt>
          </View>
          <Button label="Play ranked" icon={Swords} size="lg" full className="mt-6" onPress={() => router.push("/match/play")} />
        </>
      )}
    </Screen>
  );
}
