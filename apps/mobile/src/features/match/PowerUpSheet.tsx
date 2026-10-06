import { View } from "react-native";
import * as Lucide from "lucide-react-native";
import { POWER_UPS, type PowerUpKind } from "@ntc/shared";
import { BottomSheet, Txt, PressableScale, Icon, CoinIcon } from "../../ui";
import { useMe } from "../me";
import { cn } from "../../lib/cn";

const ICONS: Record<PowerUpKind, Lucide.LucideIcon> = { fifty: Lucide.Split, extra_time: Lucide.Timer, crowd: Lucide.Users, shield: Lucide.Shield };

/** One power-up per match: inventory first, then the free daily one, then coins. */
export function PowerUpSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (k: PowerUpKind) => void }) {
  const me = useMe();
  const inv = me.data?.inventory ?? [];
  const free = me.data?.profile.freePowerUpAvailable;
  const coins = me.data?.profile.coins ?? 0;
  return (
    <BottomSheet open={open} onClose={onClose} title="Use a power-up" subtitle="One per match. Choose wisely.">
      <View className="gap-2.5">
        {POWER_UPS.map((p) => {
          const owned = inv.find((i) => i.itemId === `pu_${p.kind}`)?.quantity ?? 0;
          const affordable = owned > 0 || free || coins >= p.cost;
          return (
            <PressableScale
              key={p.kind}
              disabled={!affordable}
              onPress={() => {
                onPick(p.kind);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}. ${p.description}. ${owned ? `${owned} owned` : free ? "Free today" : `${p.cost} coins`}`}
              className={cn("flex-row items-center gap-3 rounded-2xl border border-line bg-raised p-3.5", !affordable && "opacity-40")}
            >
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
                <Icon as={ICONS[p.kind]} tone="primary" />
              </View>
              <View className="flex-1">
                <Txt variant="bodyStrong">{p.name}</Txt>
                <Txt variant="caption" tone="muted">{p.description}</Txt>
              </View>
              {owned > 0 ? (
                <Txt variant="label" tone="primary">×{owned}</Txt>
              ) : free ? (
                <View className="rounded-chip bg-primary px-2.5 py-1"><Txt variant="overline" tone="ink">Free</Txt></View>
              ) : (
                <View className="flex-row items-center gap-1"><CoinIcon size={14} /><Txt variant="label" tone="accent" tabular>{p.cost}</Txt></View>
              )}
            </PressableScale>
          );
        })}
      </View>
      <Txt variant="caption" tone="faint" className="mt-3 text-center">You get one free power-up every day.</Txt>
    </BottomSheet>
  );
}
