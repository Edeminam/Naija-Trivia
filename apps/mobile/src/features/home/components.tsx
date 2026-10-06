import { View } from "react-native";
import { router } from "expo-router";
import { Flame, Gift, CheckCircle2, Snowflake, Play, Trophy } from "lucide-react-native";
import { nextLagosMidnight, type MissionProgress, type StreakInfo } from "@ntc/shared";
import { Card, Txt, Icon, Button, ProgressBar, Chip, CoinIcon, toast } from "../../ui";
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
        <View className="flex-row items-center gap-1.5 flex-1">
          <Icon as={Snowflake} size={14} tone={streak.freezeAvailable ? "primary" : "faint"} />
          <Txt variant="caption" tone="faint" numberOfLines={1}>{streak.freezeAvailable ? "Streak freeze ready" : "Freeze used this week"}</Txt>
        </View>
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
