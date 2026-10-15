import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Radio, Play, Trophy, CalendarClock, Users } from "lucide-react-native";
import { LIVE_EVENT_PRIZES, LIVE_EVENT_FINISH_COINS, categoryBySlug } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Button, Card, Chip, Icon, CoinIcon, ErrorState, EmptyState, SkeletonCard, Confetti } from "../../../ui";
import { useLiveEvent } from "../../../features/events/api";
import { useMe } from "../../../features/me";
import { LeaderRow } from "../../../features/LeaderRow";
import { useCountdown } from "../../../lib/useCountdown";
import { useOnline } from "../../../lib/useNetwork";

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 >= 11 && n % 100 <= 13 ? 0 : Math.min(n % 10, 4) % 4] ?? "th"}`;

export default function LiveEvent() {
  const { id, done } = useLocalSearchParams<{ id: string; done?: string }>();
  const q = useLiveEvent(id);
  const me = useMe();
  const online = useOnline();
  const e = q.data;
  const { text } = useCountdown(e ? (e.phase === "upcoming" ? e.startsAt : e.endsAt) : null);
  const myId = me.data?.profile.id;
  const prizeTop = LIVE_EVENT_PRIZES.slice(0, 3);

  return (
    <View className="flex-1 bg-bg">
      <Screen title="Live event" back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
        {!e ? (
          q.isError ? <ErrorState offline={(q.error as any)?.offline} onRetry={() => q.refetch()} /> : <SkeletonCard lines={4} />
        ) : (
          <>
            <Card variant="hero" tint={e.phase === "live" ? "accent" : "primary"} className="p-5 gap-4">
              <View className="flex-row items-center gap-2">
                {e.phase === "live" ? (
                  <Chip label="Live now" icon={Radio} tone="danger" />
                ) : e.phase === "upcoming" ? (
                  <Chip label="Coming up" icon={CalendarClock} tone="primary" />
                ) : (
                  <Chip label="Ended" />
                )}
                {e.category ? <Chip label={categoryBySlug(e.category)?.name ?? e.category} /> : null}
              </View>
              <View className="gap-1">
                <Txt variant="h1">{e.name}</Txt>
                <Txt variant="body" tone="muted">{e.tagline}</Txt>
              </View>
              <Txt variant="caption" tone="muted">
                {e.phase === "upcoming" ? (
                  <>Starts {new Date(e.startsAt).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · in <Txt variant="caption" tabular>{text}</Txt></>
                ) : e.phase === "live" ? (
                  <>Ends in <Txt variant="caption" tabular>{text}</Txt> · {e.players.toLocaleString("en-NG")} played so far</>
                ) : (
                  <>{e.players.toLocaleString("en-NG")} players took part</>
                )}
              </Txt>

              {e.me?.played ? (
                <View className="flex-row gap-2.5">
                  {[
                    { v: e.me.score?.toLocaleString("en-NG") ?? "0", l: "Your score" },
                    { v: e.me.rank ? `#${e.me.rank}` : "—", l: e.phase === "ended" ? "Final place" : "Right now" },
                    { v: e.me.prize ? `+${e.me.prize}` : "—", l: "Prize coins" },
                  ].map((t) => (
                    <View key={t.l} className="flex-1 rounded-2xl bg-surface border border-line py-3.5 px-2 items-center gap-0.5">
                      <Txt variant="h2" tabular numberOfLines={1}>{t.v}</Txt>
                      <Txt variant="caption" tone="muted" numberOfLines={1}>{t.l}</Txt>
                    </View>
                  ))}
                </View>
              ) : e.phase === "live" ? (
                <View className="gap-2">
                  <Button
                    label={e.me?.inProgress ? `Resume · question ${e.me.nextIndex + 1}` : "Play now"}
                    icon={Play}
                    size="lg"
                    full
                    variant="accent"
                    disabled={!online}
                    onPress={() => router.push({ pathname: "/event/[id]/play", params: { id: e.id } })}
                  />
                  <Txt variant="caption" tone="muted" className="text-center">10 questions · one attempt · +{LIVE_EVENT_FINISH_COINS} coins for finishing</Txt>
                </View>
              ) : e.phase === "upcoming" ? (
                <Txt variant="caption" tone="muted">We&apos;ll send a notification when it starts if reminders are on.</Txt>
              ) : null}
              {e.phase === "live" && e.me?.played ? <Txt variant="caption" tone="muted" className="text-center">Places are final when the event ends. Prizes land in your wallet then.</Txt> : null}
            </Card>

            <SectionTitle title="Prizes" />
            <Card className="p-4 gap-3">
              <View className="flex-row gap-2.5">
                {prizeTop.map((p, i) => (
                  <View key={i} className="flex-1 items-center gap-1 rounded-2xl bg-raised py-3">
                    <Txt variant="label" tone="accent">{ordinal(i + 1)}</Txt>
                    <View className="flex-row items-center gap-1"><CoinIcon size={16} /><Txt variant="bodyStrong" tabular>{p}</Txt></View>
                  </View>
                ))}
              </View>
              <Txt variant="caption" tone="muted" className="text-center">4th–{LIVE_EVENT_PRIZES.length}th: {LIVE_EVENT_PRIZES[3]} coins · ties go to the faster player</Txt>
            </Card>

            <SectionTitle title={e.phase === "ended" ? "Final leaderboard" : "Leaderboard"} />
            <Card className="overflow-hidden">
              {e.board.length ? (
                e.board.map((p, i) => <LeaderRow key={p.id} p={p} me={p.id === myId} first={i === 0} />)
              ) : (
                <EmptyState icon={e.phase === "upcoming" ? Users : Trophy} title={e.phase === "upcoming" ? "Not started" : "No scores yet"} body={e.phase === "upcoming" ? "The board opens when the event goes live." : "First to finish sets the bar."} className="py-6" />
              )}
            </Card>
          </>
        )}
      </Screen>
      {done && e?.me?.played ? <Confetti count={40} /> : null}
    </View>
  );
}
