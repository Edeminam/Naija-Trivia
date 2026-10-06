import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Flame, Snowflake, Play, Trophy, Users2 } from "lucide-react-native";
import { stateByCode, addDays, lagosDate } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Button, Card, Icon, Segmented, SkeletonCard, SkeletonRow, ErrorState, EmptyState, Confetti, Chip } from "../../ui";
import { useDaily, useDailyBoard } from "../../features/daily/api";
import { useMe } from "../../features/me";
import { LeaderRow } from "../../features/LeaderRow";
import { useCountdown } from "../../lib/useCountdown";
import { useOnline } from "../../lib/useNetwork";
import { cn } from "../../lib/cn";

export default function Daily() {
  const { done } = useLocalSearchParams<{ done?: string }>();
  const daily = useDaily();
  const me = useMe();
  const online = useOnline();
  const [scope, setScope] = useState<"national" | "state">("national");
  const myState = me.data?.profile.stateCode ?? null;
  const board = useDailyBoard(scope === "state" ? myState : null);
  const d = daily.data;
  const { text } = useCountdown(d?.resetsAt);

  return (
    <View className="flex-1 bg-bg">
      <Screen title="Daily Naija" back refreshing={daily.isRefetching} onRefresh={() => { void daily.refetch(); void board.refetch(); }}>
        {!d ? (
          daily.isError ? <ErrorState offline={(daily.error as any)?.offline} onRetry={() => daily.refetch()} /> : <SkeletonCard lines={4} />
        ) : (
          <Card variant="hero" tint="accent" className="p-5 gap-5">
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-danger-soft">
                <Icon as={Flame} size={32} tone={d.streak.current ? "danger" : "faint"} />
              </View>
              <View className="flex-1">
                <Txt variant="display" tabular>{d.streak.current}<Txt variant="h3" tone="muted"> day streak</Txt></Txt>
                <Txt variant="caption" tone="muted">Best {d.streak.best} · {d.streak.freezeAvailable ? "1 freeze ready this week" : "Freeze used this week"}</Txt>
              </View>
              <Icon as={Snowflake} tone={d.streak.freezeAvailable ? "primary" : "faint"} />
            </View>
            <View className="flex-row justify-between" accessibilityLabel="Last 7 days">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = addDays(lagosDate(), i - 6);
                // Streak runs back from today (if played) or yesterday.
                const k = 6 - i;
                const base = d.played ? 0 : 1;
                const lit = k >= base && k < base + d.streak.current;
                return (
                  <View key={day} className="items-center gap-1.5">
                    <View className={cn("h-9 w-9 items-center justify-center rounded-full", lit ? "bg-danger" : "bg-raised")}>
                      <Icon as={Flame} size={16} tone={lit ? "white" : "faint"} />
                    </View>
                    <Txt variant="caption" tone={i === 6 ? "default" : "faint"}>{new Date(`${day}T12:00:00Z`).toLocaleDateString("en-NG", { weekday: "narrow" })}</Txt>
                  </View>
                );
              })}
            </View>
            {d.played ? (
              <View className="gap-3">
                <View className="flex-row gap-2.5">
                  {[
                    { v: d.score?.toLocaleString("en-NG") ?? "0", l: `${d.correct}/10 right` },
                    { v: `#${d.nationalRank ?? "—"}`, l: `of ${d.players} in Naija` },
                    { v: `#${d.stateRank ?? "—"}`, l: stateByCode(myState)?.name ?? "Your state" },
                  ].map((t) => (
                    <View key={t.l} className="flex-1 rounded-2xl bg-surface border border-line py-3.5 px-2 items-center gap-0.5">
                      <Txt variant="h2" tabular numberOfLines={1}>{t.v}</Txt>
                      <Txt variant="caption" tone="muted" numberOfLines={1}>{t.l}</Txt>
                    </View>
                  ))}
                </View>
                <Txt variant="caption" tone="muted" className="text-center">Next Daily Naija in <Txt variant="caption" tabular>{text}</Txt></Txt>
              </View>
            ) : (
              <View className="gap-2">
                <Button label={d.inProgress ? `Resume · question ${d.nextIndex + 1}` : "Play today's 10"} icon={Play} size="lg" full variant="accent" disabled={!online} onPress={() => router.push("/daily/play")} testID="play-daily" />
                <Txt variant="caption" tone="muted" className="text-center">One attempt per day · +20 coins · resets in <Txt variant="caption" tabular>{text}</Txt></Txt>
              </View>
            )}
          </Card>
        )}

        <SectionTitle title="Today's ranking" />
        <Segmented label="Ranking scope" value={scope} onChange={setScope} options={[{ value: "national", label: "All Naija" }, { value: "state", label: stateByCode(myState)?.name ?? "My state" }]} />
        <Card className="mt-3 overflow-hidden">
          {board.isError && !board.data ? (
            <ErrorState offline={(board.error as any)?.offline} onRetry={() => board.refetch()} />
          ) : !board.data ? (
            <View className="px-4"><SkeletonRow /><SkeletonRow /><SkeletonRow /></View>
          ) : board.data.players.length === 0 ? (
            <EmptyState icon={scope === "state" ? Users2 : Trophy} title="No scores yet today" body="Be the first on the board — everyone gets the same 10 questions." />
          ) : (
            board.data.players.map((p, i) => <LeaderRow key={p.id} p={p} first={i === 0} me={p.id === me.data?.profile.id} />)
          )}
        </Card>
        {d?.played ? <Chip label="Come back tomorrow to keep the streak" icon={Flame} tone="danger" className="self-center mt-4" /> : null}
      </Screen>
      {done && d?.played ? <Confetti count={40} /> : null}
    </View>
  );
}
