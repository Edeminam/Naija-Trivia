import { View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { PressableScale } from "./Pressable";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { cn } from "../lib/cn";
import { haptic } from "../lib/haptics";

type Tone = "default" | "primary" | "accent" | "danger";

const toneCls: Record<Tone, string> = {
  default: "bg-raised border-line",
  primary: "bg-primary-soft border-transparent",
  accent: "bg-accent-soft border-transparent",
  danger: "bg-danger-soft border-transparent",
};
const textTone = { default: "muted", primary: "primary", accent: "accent", danger: "danger" } as const;

export function Chip({ label, icon, tone = "default", selected, onPress, className }: { label: string; icon?: LucideIcon; tone?: Tone; selected?: boolean; onPress?: () => void; className?: string }) {
  const t: Tone = selected ? "primary" : tone;
  const body = (
    <View className={cn("flex-row items-center gap-1.5 rounded-chip border px-3 h-8", toneCls[t], className)}>
      {icon ? <Icon as={icon} size={14} tone={textTone[t]} /> : null}
      <Txt variant="label" tone={textTone[t]} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.select();
        onPress();
      }}
    >
      {body}
    </PressableScale>
  );
}
