import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { categoryBySlug } from "@ntc/shared";
import { Txt, PressableScale, Icon, ProgressBar, Chip } from "../../ui";
import { cn } from "../../lib/cn";
import { useMatch, match } from "./store";
import { useReducedMotion } from "../../lib/motion";
import { CATEGORY_ICONS, FALLBACK_ICON } from "../icons";

export function CategoryIcon({ slug, size = 22, color }: { slug: string; size?: number; color?: string }) {
  const def = categoryBySlug(slug);
  const Cmp = CATEGORY_ICONS[slug as keyof typeof CATEGORY_ICONS] ?? FALLBACK_ICON;
  return <Icon as={Cmp} size={size} color={color ?? def?.tint} />;
}

export function BanStage() {
  const { banOptions, banDeadline, myBan } = useMatch();
  const reduce = useReducedMotion();
  const [left, setLeft] = useState(Math.max(0, banDeadline - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, banDeadline - Date.now())), 100);
    return () => clearInterval(id);
  }, [banDeadline]);
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(250)} className="flex-1 gap-5 pt-4">
      <View className="gap-1">
        <Txt variant="h1" accessibilityRole="header">Ban a category</Txt>
        <Txt variant="body" tone="muted">{myBan ? "Locked in. Waiting for your opponent…" : "Pick the one you'd rather not face. Questions come from the rest."}</Txt>
      </View>
      <View className="gap-2">
        <ProgressBar value={left / 5000} tone={left < 2000 ? "danger" : "accent"} height={6} label={`${Math.ceil(left / 1000)} seconds to ban`} />
        <Txt variant="caption" tone="faint" tabular>{Math.ceil(left / 1000)}s · auto-ban if you don't pick</Txt>
      </View>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {banOptions.map((o, i) => {
          const def = categoryBySlug(o.slug);
          const banned = myBan === o.categoryId;
          return (
            <Animated.View key={o.categoryId} entering={reduce ? undefined : ZoomIn.delay(i * 60).springify().damping(16)} className="w-[48.5%]">
              <PressableScale
                disabled={!!myBan}
                onPress={() => match.ban(o.categoryId)}
                accessibilityRole="button"
                accessibilityLabel={`Ban ${o.name}`}
                accessibilityState={{ selected: banned, disabled: !!myBan }}
                className={cn("h-32 rounded-card border-2 p-4 justify-between", banned ? "border-danger bg-danger-soft" : "border-line bg-surface", myBan && !banned && "opacity-60")}
              >
                <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${def?.tint}22` }}>
                  <CategoryIcon slug={o.slug} />
                </View>
                <Txt variant="bodyStrong" numberOfLines={2}>{o.name}</Txt>
                {banned ? (
                  <Animated.View entering={reduce ? undefined : ZoomIn.springify()} className="absolute top-3 right-3 h-8 w-8 items-center justify-center rounded-full bg-danger">
                    <Icon as={X} size={18} tone="white" />
                  </Animated.View>
                ) : null}
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

export function ReadyStage() {
  const { categories, players, me, banOptions } = useMatch();
  const opp = Object.values(players).find((p) => p.id !== me);
  const oppBan = banOptions.find((b) => b.categoryId === opp?.banned);
  return (
    <Animated.View entering={FadeIn.duration(250)} className="flex-1 items-center justify-center gap-5">
      {oppBan ? <Txt variant="body" tone="muted">{opp?.username} banned <Txt variant="bodyStrong">{oppBan.name}</Txt></Txt> : null}
      <Txt variant="h1" className="text-center">Questions from</Txt>
      <View className="flex-row flex-wrap justify-center gap-2">
        {categories.map((s) => (
          <Chip key={s} label={categoryBySlug(s)?.name ?? s} tone="primary" />
        ))}
      </View>
    </Animated.View>
  );
}
