import { View } from "react-native";
import { router } from "expo-router";
import { Flame, Gift, CheckCircle2, Snowflake, Play, Trophy, Sparkles, Swords, ChevronRight, Medal, Radio, CalendarClock } from "lucide-react-native";
import { nextLagosMidnight, nextStreakMilestone, categoryBySlug, LAGOS_OFFSET_MS, type MissionProgress, type StreakInfo, type ActiveTheme } from "@ntc/shared";
import { Card, Txt, Icon, Button, ProgressBar, Chip, CoinIcon, Avatar, PressableScale, toast } from "../../ui";
import { CATEGORY_ICONS } from "../icons";
import type { HomeData } from "./api";
import { useCountdown } from "../../lib/useCountdown";
import { useClaimMission, useClaimChest } from "./api";
import { haptic } from "../../lib/haptics";
import { cn } from "../../lib/cn";

export function DailyNaijaCard({ played, score, resetsAt, streak }: { played: boolean; score: number | null; resetsAt: number; streak: StreakInfo }) {
  const { text } = useCountdown(resetsAt);
  return (
    <Card variant="hero" tint="accent" className="p-5" onPress={() => router.push("/daily")} accessibilityLabel={`Daily Naija. ${played ? "Played today" : "Not played yet"}. Streak ${streak.current} days. Resets in ${text}`}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-1">
          <Txt variant="overline" tone="accent">Daily Naija</Txt>
          <Txt variant="h2">{played ? "Done for today 🎉" : "Today's 10 are live"}</Txt>
          <Txt variant="caption" tone="muted">
            {played ? `You scored ${(score ?? 0).toLocaleString("en-NG")} · new set in ` : "Same questions for all of Naija · resets in "}
            <Txt variant="caption" tabular>{text}</Txt>
          </Txt>
        </View>
        <View className="items-center rounded-2xl bg-surface border border-line px-3 py-2 ml-3" accessibilityLabel={`${streak.current} day streak`}>
          <Icon as={Flame} size={22} tone={streak.current > 0 ? "danger" : "faint"} />
          <Txt variant="h3" tabular>{streak.current}</Txt>
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-4">
        {(() => {
          const next = nextStreakMilestone(streak.current);
          return (
            <View className="flex-row items-center gap-1.5 flex-1">
              <Icon as={next ? Flame : Snowflake} size={14} tone={next ? "danger" : streak.freezeAvailable ? "primary" : "faint"} />
              <Txt variant="caption" tone="faint" numberOfLines={1}>
                {next ? `${next.days - streak.current} more day${next.days - streak.current === 1 ? "" : "s"} to +${next.coins} bonus` : streak.freezeAvailable ? (streak.freezesLeft + (streak.freezesOwned ?? 0) > 1 ? `${streak.freezesLeft + (streak.freezesOwned ?? 0)} streak freezes ready` : "Streak freeze ready") : "Freezes used this week"}
              </Txt>
            </View>
          );
        })()}
        {played ? <Chip label="See ranking" icon={Trophy} tone="accent" /> : <Chip label="Play · +20 coins" icon={Play} tone="accent" />}
      </View>
    </Card>
  );
}

function MissionRow({ m }: { m: MissionProgress }) {
  const claim = useClaimMission();
  return (
    <View className="flex-row items-center gap-3 py-3.5" accessibilityLabel={`${m.title}. ${m.progress} of ${m.target}. Reward ${m.reward} coins`}>
      <View className={cn("h-10 w-10 items-center justify-center rounded-xl", m.claimed ? "bg-primary-soft" : "bg-raised")}>
        {m.claimed ? <Icon as={CheckCircle2} tone="primary" /> : <CoinIcon size={20} />}
      </View>
      <View className="flex-1 gap-1.5">
        <View className="flex-row justify-between gap-2">
          <Txt variant="bodyStrong" className={cn("flex-1", m.claimed && "opacity-60")} numberOfLines={1}>{m.title}</Txt>
          <Txt variant="label" tone="muted" tabular>{m.progress}/{m.target}</Txt>
        </View>
        <ProgressBar value={m.progress / m.target} height={6} tone={m.completed ? "primary" : "accent"} />
      </View>
      {m.completed && !m.claimed ? (
        <Button
          label={`+${m.reward}`}
          size="sm"
          variant="accent"
          loading={claim.isPending && claim.variables === m.id}
          onPress={() =>
            claim.mutate(m.id, {
              onSuccess: (r) => {
                haptic.success();
                toast.success(`+${r.reward} coins`, m.title);
              },
              onError: (e: any) => toast.error("Couldn't claim", e.message),
            })
          }
        />
      ) : (
        <Txt variant="label" tone={m.claimed ? "faint" : "accent"} tabular className="w-12 text-right">{m.claimed ? "Done" : `+${m.reward}`}</Txt>
      )}
    </View>
  );
}

export function MissionsCard({ missions }: { missions: MissionProgress[] }) {
  return (
    <Card className="px-4 py-1">
      {missions.map((m, i) => (
        <View key={m.id} className={cn(i > 0 && "border-t border-line")}>
          <MissionRow m={m} />
        </View>
      ))}
    </Card>
  );
}

export function ChestCard({ available, amount }: { available: boolean; amount: number }) {
  const claim = useClaimChest();
  const { text } = useCountdown(available ? null : nextLagosMidnight());
  return (
    <Card className="p-4 flex-row items-center gap-3">
      <View className={cn("h-12 w-12 items-center justify-center rounded-2xl", available ? "bg-accent-soft" : "bg-raised")}>
        <Icon as={Gift} size={24} tone={available ? "accent" : "faint"} />
      </View>
      <View className="flex-1">
        <Txt variant="bodyStrong">Daily chest</Txt>
        <Txt variant="caption" tone="muted">{available ? `${amount} free coins inside` : `Next chest in ${text}`}</Txt>
      </View>
      <Button
        label={available ? "Open" : "Opened"}
        size="sm"
        variant={available ? "accent" : "secondary"}
        disabled={!available}
        loading={claim.isPending}
        onPress={() =>
          claim.mutate(undefined, {
            onSuccess: (r) => {
              haptic.success();
              toast.success(`+${r.amount} coins`, "Chest opened");
            },
            onError: (e: any) => toast.error("Chest", e.message),
          })
        }
      />
    </Card>
  );
}

const LAGOS_END_OF = (date: string) => Date.parse(`${date}T23:59:59Z`) - LAGOS_OFFSET_MS;

/** This week's theme: the featured category is in every clash and part of Daily Naija. */
export function ThemeCard({ theme }: { theme: ActiveTheme }) {
  const { text } = useCountdown(LAGOS_END_OF(theme.endsOn));
  const cat = categoryBySlug(theme.category);
  return (
    <Card className="p-4 flex-row items-center gap-3 overflow-hidden" accessibilityLabel={`${theme.name}. ${theme.tagline}. Ends in ${text}`}>
      <View className={cn("h-12 w-12 items-center justify-center rounded-2xl", theme.special ? "bg-accent-soft" : "bg-primary-soft")}>
        <Icon as={CATEGORY_ICONS[theme.category] ?? Sparkles} size={24} tone={theme.special ? "accent" : "primary"} />
      </View>
      <View className="flex-1 gap-0.5">
        <Txt variant="overline" tone={theme.special ? "accent" : "primary"}>{theme.special ? "Special week" : "This week"} · ends in <Txt variant="overline" tone={theme.special ? "accent" : "primary"} tabular>{text}</Txt></Txt>
        <Txt variant="bodyStrong">{theme.name}</Txt>
        <Txt variant="caption" tone="muted" numberOfLines={2}>{theme.special ? `${theme.tagline} Wins pay 50% more coins.` : `${cat?.name ?? "This category"} is in every clash and in Daily Naija.`}</Txt>
      </View>
    </Card>
  );
}

export function IncomingChallenges({ items }: { items: HomeData["incomingChallenges"] }) {
  if (!items?.length) return null;
  return (
    <Card className="overflow-hidden">
      {items.map((c, i) => (
        <PressableScale key={c.code} scaleTo={0.99} onPress={() => router.push({ pathname: "/c/[code]", params: { code: c.code } })} accessibilityRole="button" accessibilityLabel={`${c.from.username} challenged you. Score to beat ${c.scoreToBeat}${c.stake ? `, winner takes ${c.stake * 2} coins` : ""}`} className={cn("flex-row items-center gap-3 p-4", i > 0 && "border-t border-line")}>
          <Avatar id={c.from.avatarId} size={44} league={c.from.league} frameId={c.from.frameId} />
          <View className="flex-1">
            <Txt variant="overline" tone="danger">Challenge for you</Txt>
            <Txt variant="bodyStrong" numberOfLines={2}>{c.from.username} challenged you</Txt>
            <Txt variant="caption" tone="muted">Score to beat: <Txt variant="caption" tabular>{c.scoreToBeat.toLocaleString("en-NG")}</Txt>{c.stake ? <Txt variant="caption" tone="accent"> · {c.stake * 2} coins on it</Txt> : null}</Txt>
          </View>
          <Chip label="Play" icon={Swords} tone="primary" />
        </PressableScale>
      ))}
    </Card>
  );
}

export function RivalCard({ rival }: { rival: NonNullable<HomeData["rival"]> }) {
  const r = rival.record;
  const played = r.wins + r.losses + r.draws;
  const line = !played ? "No games yet. Settle it!" : r.wins > r.losses ? `You lead ${r.wins}–${r.losses}` : r.wins < r.losses ? `${rival.friend.username} leads ${r.losses}–${r.wins}` : `Level at ${r.wins}–${r.losses}`;
  return (
    <Card className="p-4 flex-row items-center gap-3" onPress={() => router.push("/friends")} accessibilityLabel={`Your rival ${rival.friend.username}. ${line}`}>
      <Avatar id={rival.friend.avatarId} size={48} league={rival.friend.league} frameId={rival.friend.frameId} />
      <View className="flex-1">
        <Txt variant="overline" tone="accent">Your rival</Txt>
        <Txt variant="bodyStrong" numberOfLines={1}>{rival.friend.username}</Txt>
        <Txt variant="caption" tone="muted">{line}{r.draws ? ` · ${r.draws} drawn` : ""}</Txt>
      </View>
      <Icon as={ChevronRight} tone="faint" />
    </Card>
  );
}

export function AchievementsNudge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <Card className="p-4 flex-row items-center gap-3" onPress={() => router.push("/profile")} accessibilityLabel={`${count} achievements ready to claim`}>
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft"><Icon as={Medal} tone="accent" /></View>
      <View className="flex-1">
        <Txt variant="bodyStrong">{count === 1 ? "1 achievement unlocked" : `${count} achievements unlocked`}</Txt>
        <Txt variant="caption" tone="muted">Claim your coins on your profile</Txt>
      </View>
      <Icon as={ChevronRight} tone="faint" />
    </Card>
  );
}

export function LiveEventCard({ event }: { event: NonNullable<HomeData["liveEvent"]> }) {
  const { text } = useCountdown(event.live ? event.endsAt : event.startsAt);
  return (
    <Card
      variant={event.live ? "hero" : "default"}
      tint={event.live ? "accent" : undefined}
      className="p-4 flex-row items-center gap-3"
      onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
      accessibilityLabel={`${event.name}. ${event.live ? `Live now, ends in ${text}` : `Starts in ${text}`}`}
    >
      <View className={cn("h-12 w-12 items-center justify-center rounded-2xl", event.live ? "bg-danger-soft" : "bg-primary-soft")}>
        <Icon as={event.live ? Radio : CalendarClock} size={24} tone={event.live ? "danger" : "primary"} />
      </View>
      <View className="flex-1 gap-0.5">
        <Txt variant="overline" tone={event.live ? "danger" : "primary"}>
          {event.live ? "● Live now · ends in " : "Live event · starts in "}<Txt variant="overline" tone={event.live ? "danger" : "primary"} tabular>{text}</Txt>
        </Txt>
        <Txt variant="bodyStrong">{event.name}</Txt>
        <Txt variant="caption" tone="muted" numberOfLines={2}>{event.played ? "You're on the board. Check your place." : event.tagline}</Txt>
      </View>
      <Icon as={ChevronRight} tone="faint" />
    </Card>
  );
}
