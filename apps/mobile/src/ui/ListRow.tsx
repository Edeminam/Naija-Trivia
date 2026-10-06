import type { ReactNode } from "react";
import { Switch, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { PressableScale } from "./Pressable";
import { useTheme } from "../theme/ThemeProvider";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/cn";

/** Settings-style row: icon, title, optional subtitle, and a toggle / value / chevron on the right. */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  toggle,
  onToggle,
  right,
  destructive,
  first,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  right?: ReactNode;
  destructive?: boolean;
  first?: boolean;
}) {
  const { c } = useTheme();
  const body = (
    <View className={cn("flex-row items-center gap-3 min-h-[60px] py-3", !first && "border-t border-line")}>
      {icon ? (
        <View className={cn("h-9 w-9 items-center justify-center rounded-[10px]", destructive ? "bg-danger-soft" : "bg-raised")}>
          <Icon as={icon} size={18} tone={destructive ? "danger" : "muted"} />
        </View>
      ) : null}
      <View className="flex-1">
        <Txt variant="bodyStrong" tone={destructive ? "danger" : "default"}>{title}</Txt>
        {subtitle ? <Txt variant="caption" tone="muted">{subtitle}</Txt> : null}
      </View>
      {right}
      {value ? <Txt variant="label" tone="muted">{value}</Txt> : null}
      {toggle !== undefined ? (
        <Switch
          value={toggle}
          onValueChange={(v) => {
            haptic.select();
            onToggle?.(v);
          }}
          trackColor={{ false: c.raised, true: c.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={c.raised}
          accessibilityLabel={title}
        />
      ) : onPress ? (
        <Icon as={ChevronRight} size={18} tone="faint" />
      ) : null}
    </View>
  );
  if (toggle !== undefined || !onPress) return body;
  return (
    <PressableScale scaleTo={0.99} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {body}
    </PressableScale>
  );
}

/** Small segmented control for 2–3 options. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <View className="flex-row rounded-btn bg-raised p-1 gap-1" accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => {
              haptic.select();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            className={cn("flex-1 h-10 items-center justify-center rounded-[10px]", on && "bg-surface border border-line")}
          >
            <Txt variant="label" tone={on ? "default" : "muted"}>{o.label}</Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}
