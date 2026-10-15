import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Flame, Snowflake, Play, Trophy, Users2, Download, WifiOff, CloudUpload, ChevronRight } from "lucide-react-native";
import { stateByCode, addDays, lagosDate, nextStreakMilestone, STREAK_MILESTONES } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Button, Card, Icon, Segmented, SkeletonCard, SkeletonRow, ErrorState, EmptyState, Confetti, Chip, Modal, toast } from "../../ui";
import { useOfflineDaily, downloadOfflineDaily } from "../../features/daily/offline";
import { useDaily, useDailyBoard } from "../../features/daily/api";
import { useMe } from "../../features/me";
import { LeaderRow } from "../../features/LeaderRow";
import { useCountdown } from "../../lib/useCountdown";
import { useOnline } from "../../lib/useNetwork";
import { cn } from "../../lib/cn";

/** Buttons for a day that's in offline mode: play, wait for sync, or re-download on a new device. */
function OfflineActions({ online }: { online: boolean }) {
  const { pack, run, syncing } = useOfflineDaily();
  const [busy, setBusy] = useState(false);
  const today = lagosDate();
  if (pack?.date === today && run?.finished) {
    return (
      <View className="gap-2 items-center">
        <Icon as={CloudUpload} size={28} tone="accent" />
        <Txt variant="bodyStrong" className="text-center">Answers locked in</Txt>
        <Txt variant="caption" tone="muted" className="text-center">{syncing ? "Scoring your run…" : online ? "Sending your answers…" : "We'll score them when you're back online."}</Txt>
      </View>
    );
  }
  if (pack?.date === today) {
    return (
      <View className="gap-2">
        <Button label={run?.answers.length ? `Resume offline · question ${(run?.current ?? 0) + 1}` : "Play offline"} icon={WifiOff} size="lg" full variant="accent" onPress={() => router.push("/daily/offline")} />
        <Txt variant="caption" tone="muted" className="text-center">Saved on this phone · works without data · no speed bonus</Txt>
      </View>
    );
  }
  // Locked to offline on the server but not on this phone (e.g. reinstalled): fetch the set again.
  return (
    <View className="gap-2">
      <Button
        label="Download today's offline Daily"
        icon={Download}
        size="lg"
        full
        variant="accent"
        disabled={!online}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await downloadOfflineDaily();
          } catch (e: any) {
            toast.error("Couldn't download", e.message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Txt variant="caption" tone="muted" className="text-center">Today's Daily was saved for offline play</Txt>
    </View>
  );
}

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
  const offline = useOfflineDaily();
  const savedToday = !!offline.pack && offline.pack.date === lagosDate();
  const [confirmOffline, setConfirmOffline] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <View className="flex-1 bg-bg">
      <Screen title="Daily Naija" back refreshing={daily.isRefetching} onRefresh={() => { void daily.refetch(); void board.refetch(); }}>
        {offline.result ? (
          <Card className="p-4 mb-4 flex-row items-center gap-3" onPress={() => router.push("/daily/offline")} accessibilityLabel="See your offline Daily result">
            <Icon as={CloudUpload} tone="accent" />
            <Txt variant="bodyStrong" className="flex-1">Your offline Daily was scored: {offline.result.score.toLocaleString("en-NG")}</Txt>
            <Icon as={ChevronRight} tone="faint" />
          </Card>
        ) : null}
        {!d ? (
          savedToday ? (
            <Card variant="hero" tint="accent" className="p-5 gap-3"><OfflineActions online={online} /></Card>
          ) : daily.isError ? <ErrorState offline={(daily.error as any)?.offline} onRetry={() => daily.refetch()} /> : <SkeletonCard lines={4} />
        ) : (
          <Card variant="hero" tint="accent" className="p-5 gap-5">
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-danger-soft">
                <Icon as={Flame} size={32} tone={d.streak.current ? "danger" : "faint"} />
              </View>
              <View className="flex-1">
                <Txt variant="display" tabular>{d.streak.current}<Txt variant="h3" tone="muted"> day streak</Txt></Txt>
                <Txt variant="caption" tone="muted">Best {d.streak.best} · {d.streak.freezeAvailable ? `${d.streak.freezesLeft ?? 1} of ${d.streak.freezesPerWeek ?? 1} freeze${(d.streak.freezesPerWeek ?? 1) > 1 ? "s" : ""} left this week` : "No freezes left this week"}</Txt>
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
            {(() => {
              const next = nextStreakMilestone(d.streak.current);
              return next ? (
                <Txt variant="caption" tone="muted" className="text-center">
                  Streak bonuses at {STREAK_MILESTONES.map((m) => m.days).join(", ")} days · next: <Txt variant="caption" tone="accent">{next.days} days, +{next.coins} coins</Txt>
                </Txt>
              ) : null;
            })()}
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
            ) : d.mode === "offline" || savedToday ? (
              <OfflineActions online={online} />
            ) : (
              <View className="gap-2">
                <Button label={d.inProgress ? `Resume · question ${d.nextIndex + 1}` : "Play today's 10"} icon={Play} size="lg" full variant="accent" disabled={!online} onPress={() => router.push("/daily/play")} testID="play-daily" />
                {!d.inProgress ? <Button label="Save for offline" icon={Download} variant="ghost" full disabled={!online} onPress={() => setConfirmOffline(true)} /> : null}
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
      <Modal
        open={confirmOffline}
        onClose={() => setConfirmOffline(false)}
        title="Save today's Daily for offline?"
        body="You'll be able to play today's 10 without data. Answers are scored when you're back online; correct answers earn 100 points each with no speed bonus. Once saved, today's Daily can only be played offline."
        confirmLabel="Save for offline"
        loading={saving}
        onConfirm={async () => {
          setSaving(true);
          try {
            await downloadOfflineDaily();
            toast.success("Saved for offline", "Play it any time today, even without data.");
            setConfirmOffline(false);
          } catch (e: any) {
            toast.error("Couldn't save", e.message);
          } finally {
            setSaving(false);
          }
        }}
      />
    </View>
  );
}
