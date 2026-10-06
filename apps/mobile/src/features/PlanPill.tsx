import { router } from "expo-router";
import { Crown } from "lucide-react-native";
import { Txt, Icon, PressableScale } from "../ui";
import { cn } from "../lib/cn";

/**
 * Shows whether the player is on Premium or the free plan. Tapping opens the Shop
 * (to upgrade, or to see the expiry date and extend).
 */
export function PlanPill({ premium, className }: { premium: boolean; className?: string }) {
  return (
    <PressableScale
      onPress={() => router.push("/shop")}
      accessibilityRole="button"
      accessibilityLabel={premium ? "Premium plan active" : "Free plan. Go Premium"}
      hitSlop={6}
      className={cn("flex-row items-center gap-1 rounded-chip px-2 h-6", premium ? "bg-accent" : "bg-raised border border-line", className)}
    >
      {premium ? <Icon as={Crown} size={12} tone="ink" /> : null}
      <Txt variant="overline" tone={premium ? "ink" : "muted"} style={{ fontSize: 10 }}>
        {premium ? "Premium" : "Free"}
      </Txt>
    </PressableScale>
  );
}

export const premiumUntilLabel = (until: string | null | undefined) =>
  until ? new Date(until).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "";
