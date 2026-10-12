import { View } from "react-native";
import { router } from "expo-router";
import { Settings, Crown, Medal, History, Swords, MapPin, Bot, Users } from "lucide-react-native";
import { categoryBySlug, stateByCode, leagueForRating, leagueProgress, LEAGUES, type MatchHistoryItem } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Card, Avatar, LeagueBadge, ProgressBar, IconButton, EmptyState, ErrorState, SkeletonCard, Skeleton, Icon, Chip, AdirePattern } from "../../ui";
import { useMe } from "../../features/me";
import { useProfileStats } from "../../features/profile/api";
import { cn } from "../../lib/cn";

const TIER_COLOR = { bronze: "#C98A55", silver: "#B8C2C8", gold: "#E8B44A" } as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1 py-3">
      <Txt variant="h2" tabular>{value}</Txt>
      <Txt variant="caption" tone="muted">{label}</Txt>
    </View>
  );
}

function MatchRow({ m }: { m: MatchHistoryItem }) {
  const tone = m.result === "win" ? "primary" : m.result === "loss" ? "danger" : "muted";
  const label = m.result === "win" ? "Win" : m.result === "loss" ? "Loss" : "Draw";
  const date = new Date(m.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  return (
    <View className="flex-row items-center gap-3 py-3" accessibilityLabel={`${label} against ${m.opponent?.username ?? "opponent"}, ${m.myScore} to ${m.oppScore}`}>
      <Avatar id={m.opponent?.avatarId ?? "ada"} size={40} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Txt variant="bodyStrong" numberOfLines={1} className="shrink">{m.opponent?.username ?? "Opponent"}</Txt>
          {m.isBot ? <Icon as={Bot} size={14} tone="faint" /> : m.type === "friend" ? <Icon as={Users} size={14} tone="faint" /> : null}
        </View>
        <Txt variant="caption" tone="faint">{m.isBot ? "Practice opponent" : m.type === "friend" ? "Friend challenge" : "Ranked"} · {date}</Txt>
      </View>
      <View className="items-end">
        <Txt variant="bodyStrong" tone={tone}>{label}</Txt>
        <Txt variant="caption" tone="muted" tabular>
          {m.myScore}–{m.oppScore}
          {m.ratingDelta ? `  ${m.ratingDelta > 0 ? "+" : ""}${m.ratingDelta}` : ""}
        </Txt>
      </View>
    </View>
  );
}

export default function Profile() {
  const me = useMe();
  const stats = useProfileStats();
  const p = me.data?.profile;
  const s = stats.data;

  return (
    <Screen
      title="Profile"
      right={<IconButton icon={Settings} label="Settings" onPress={() => router.push("/settings")} />}
      refreshing={stats.isRefetching}
      onRefresh={() => { void me.refetch(); void stats.refetch(); }}
    >
      {!p ? (
        me.isError ? <ErrorState onRetry={() => me.refetch()} /> : <Skeleton h={220} r={20} />
      ) : (
        <Card className="p-5 items-center gap-3 overflow-hidden">
          <AdirePattern id="profile-pattern" />
          <Avatar id={p.avatarId} size={96} league={leagueForRating(p.rating).id} frameId={p.frameId} />
          <View className="items-center gap-1">
            <Txt variant="h1">{p.isGuest ? "Guest player" : p.username}</Txt>
            <View className="flex-row items-center gap-1.5">
              <Icon as={MapPin} size={14} tone="muted" />
              <Txt variant="label" tone="muted">{stateByCode(p.stateCode)?.name ?? "No state yet"}</Txt>
            </View>
          </View>
          <View className="flex-row gap-2 flex-wrap justify-center">
            <Chip label={leagueForRating(p.rating).name} tone="primary" />
            <Chip label={p.title} />
            {!p.isGuest ? <Chip label={p.isPremium ? "Premium" : "Free plan"} icon={p.isPremium ? Crown : undefined} tone={p.isPremium ? "accent" : "default"} onPress={() => router.push("/shop")} /> : null}
          </View>
          {(() => {
            const cur = leagueForRating(p.rating);
            const next = LEAGUES[LEAGUES.indexOf(cur) + 1];
            return (
              <View className="w-full gap-1.5 mt-2">
                <View className="flex-row justify-between">
                  <Txt variant="caption" tone="muted">{next ? `Next league: ${next.name}` : "Top league"}</Txt>
                  {next ? <Txt variant="caption" tone="muted" tabular>{next.min - p.rating} rating to go</Txt> : null}
                </View>
                <ProgressBar value={next ? leagueProgress(p.rating) : 1} label="League progress" />
              </View>
            );
          })()}
        </Card>
      )}

      {stats.isError && !s ? (
        <Card className="mt-4"><ErrorState offline={(stats.error as any)?.offline} onRetry={() => stats.refetch()} /></Card>
      ) : !s ? (
        <View className="gap-4 mt-4"><SkeletonCard lines={2} /><SkeletonCard lines={5} /></View>
      ) : (
        <>
          <Card className="mt-4 flex-row items-center px-2">
            <View className="items-center px-3 py-2">
              <LeagueBadge league={s.profile.league} size={44} />
            </View>
            <View className="flex-1 flex-row">
              <Stat label="Rating" value={String(s.profile.rating)} />
              <View className="w-px bg-line my-3" />
              <Stat label="Win rate" value={s.matches ? `${Math.round(s.winRate * 100)}%` : "—"} />
              <View className="w-px bg-line my-3" />
              <Stat label="Matches" value={String(s.matches)} />
            </View>
          </Card>
          <Txt variant="caption" tone="faint" className="mt-2 text-center">{LEAGUES.find((l) => l.id === s.profile.league)?.name} league · {s.wins}W {s.losses}L {s.draws}D</Txt>

          <SectionTitle title="Stats by category" />
          <Card className="p-4 gap-4">
            {s.categories.every((c) => c.answered === 0) ? (
              <EmptyState icon={Swords} title="No answers yet" body="Play a few clashes and your strongest categories will show here." actionLabel="Play now" onAction={() => router.push("/match/play")} className="py-4" />
            ) : (
              s.categories.map((c) => {
                const def = categoryBySlug(c.slug)!;
                return (
                  <View key={c.slug} className="gap-1.5" accessibilityLabel={`${def.name}: ${Math.round(c.accuracy * 100)} percent correct from ${c.answered} answers`}>
                    <View className="flex-row justify-between">
                      <Txt variant="label">{def.name}</Txt>
                      <Txt variant="label" tone="muted" tabular>{c.answered ? `${Math.round(c.accuracy * 100)}% · ${c.answered}` : "—"}</Txt>
                    </View>
                    <View className="h-2.5 rounded-full bg-raised overflow-hidden">
                      <View className="h-full rounded-full" style={{ width: `${c.accuracy * 100}%`, backgroundColor: def.tint }} />
                    </View>
                  </View>
                );
              })
            )}
          </Card>

          <SectionTitle title="Mastery badges" />
          <Card className="p-4">
            {s.badges.length === 0 ? (
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-raised"><Icon as={Medal} tone="faint" /></View>
                <Txt variant="caption" tone="muted" className="flex-1">Hit 60% accuracy over 20 answers in a category to earn bronze. Silver at 70%/50, gold at 80%/100.</Txt>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {s.badges.map((b) => (
                  <View key={b.slug} className="items-center gap-1.5 w-[30%]" accessibilityLabel={`${b.tier} badge in ${categoryBySlug(b.slug)?.name}`}>
                    <View className="h-14 w-14 items-center justify-center rounded-full border-2" style={{ borderColor: TIER_COLOR[b.tier], backgroundColor: `${TIER_COLOR[b.tier]}22` }}>
                      <Icon as={Medal} size={26} color={TIER_COLOR[b.tier]} />
                    </View>
                    <Txt variant="caption" className="text-center" numberOfLines={1}>{categoryBySlug(b.slug)?.short}</Txt>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <SectionTitle title="Season finishes" />
          <Card className="p-4">
            {/* Cached stats from before season history existed have no `seasons`. */}
            {!s.seasons?.length ? (
              <View className="flex-row items-center gap-3">
                <LeagueBadge league="jjc" size={40} />
                <Txt variant="caption" tone="muted" className="flex-1">When this season ends, the league you finish in is kept here for good (one ranked match is enough to count).</Txt>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {s.seasons.map((r) => {
                  const l = LEAGUES.find((x) => x.id === r.league) ?? LEAGUES[0]!;
                  return (
                    <View key={r.season} className="items-center gap-1 w-[30%]" accessibilityLabel={`Season ${r.season}: finished in ${l.name} at ${r.rating}`}>
                      <LeagueBadge league={r.league} size={44} />
                      <Txt variant="caption" className="text-center" numberOfLines={1}>{l.name}</Txt>
                      <Txt variant="overline" tone="muted">Season {r.season}</Txt>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          <SectionTitle title="Last 20 matches" />
          <Card className="px-4">
            {s.history.length === 0 ? (
              <EmptyState icon={History} title="No matches yet" body="Your last 20 clashes will appear here." className="py-6" />
            ) : (
              s.history.map((m, i) => (
                <View key={m.id} className={cn(i > 0 && "border-t border-line")}>
                  <MatchRow m={m} />
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
