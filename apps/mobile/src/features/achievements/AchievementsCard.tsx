import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Swords, Target, Star, Flame, Shield, Crown, Users, Trophy, Send, MapPin, LayoutGrid, Lock, type LucideIcon } from "lucide-react-native";
import { ACHIEVEMENTS, type AchievementProgress } from "@ntc/shared";
import { Card, Txt, Icon, Button, ProgressBar, toast } from "../../ui";
import { api } from "../../lib/api";
import { meKey } from "../me";
import { haptic } from "../../lib/haptics";
import { cn } from "../../lib/cn";

/** Explicit map (namespace imports would bundle every lucide icon). */
const ICONS: Record<string, LucideIcon> = { swords: Swords, target: Target, star: Star, flame: Flame, shield: Shield, crown: Crown, users: Users, trophy: Trophy, send: Send, "map-pin": MapPin, "layout-grid": LayoutGrid };

export const achievementTitle = (slug: string) => ACHIEVEMENTS.find((a) => a.slug === slug)?.title ?? slug;

function useClaimAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.post<{ reward: number; coins: number }>(`/achievements/${slug}/claim`),
    onSuccess: (r) => {
      qc.setQueryData(meKey, (old: any) => (old ? { ...old, profile: { ...old.profile, coins: r.coins } } : old));
      void qc.invalidateQueries({ queryKey: ["profile-stats", "me"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

/** Claimable first, then in-progress (closest first), then claimed. */
function order(list: AchievementProgress[]) {
  const rank = (a: AchievementProgress) => (a.unlocked && !a.claimed ? 0 : !a.unlocked ? 1 : 2);
  return [...list].sort((a, b) => rank(a) - rank(b) || b.progress / b.target - a.progress / a.target);
}

export function AchievementsCard({ list, preview = 5 }: { list: AchievementProgress[]; preview?: number }) {
  const claim = useClaimAchievement();
  const [all, setAll] = useState(false);
  const sorted = order(list);
  const shown = all ? sorted : sorted.slice(0, preview);
  return (
    <Card className="px-4 py-1">
      {shown.map((a, i) => {
        const def = ACHIEVEMENTS.find((d) => d.slug === a.slug);
        if (!def) return null;
        const ready = a.unlocked && !a.claimed;
        return (
          <View key={a.slug} className={cn("flex-row items-center gap-3 py-3.5", i > 0 && "border-t border-line")} accessibilityLabel={`${def.title}. ${def.description}. ${a.claimed ? "Claimed" : a.unlocked ? "Ready to claim" : `${a.progress} of ${a.target}`}. Reward ${def.reward} coins`}>
            <View className={cn("h-11 w-11 items-center justify-center rounded-2xl", a.unlocked ? "bg-accent-soft" : "bg-raised")}>
              <Icon as={a.unlocked ? (ICONS[def.icon] ?? Trophy) : Lock} size={20} tone={a.unlocked ? "accent" : "faint"} />
            </View>
            <View className="flex-1 gap-1">
              <Txt variant="bodyStrong" numberOfLines={1} className={cn(a.claimed && "opacity-60")}>{def.title}</Txt>
              <Txt variant="caption" tone="muted" numberOfLines={1}>{def.description}</Txt>
              {!a.unlocked && a.target > 1 ? <ProgressBar value={a.progress / a.target} height={4} tone="accent" label={`${a.progress} of ${a.target}`} /> : null}
            </View>
            {ready ? (
              <Button
                label={`+${def.reward}`}
                size="sm"
                variant="accent"
                loading={claim.isPending && claim.variables === a.slug}
                onPress={() =>
                  claim.mutate(a.slug, {
                    onSuccess: (r) => {
                      haptic.success();
                      toast.success(`+${r.reward} coins`, def.title);
                    },
                    onError: (e: any) => toast.error("Couldn't claim", e.message),
                  })
                }
              />
            ) : (
              <Txt variant="label" tone={a.claimed ? "faint" : "accent"} tabular className="w-14 text-right">{a.claimed ? "Done" : `+${def.reward}`}</Txt>
            )}
          </View>
        );
      })}
      {sorted.length > preview ? (
        <View className="border-t border-line py-2">
          <Button label={all ? "Show less" : `Show all ${sorted.length}`} variant="ghost" size="sm" full onPress={() => setAll((v) => !v)} />
        </View>
      ) : null}
    </Card>
  );
}
