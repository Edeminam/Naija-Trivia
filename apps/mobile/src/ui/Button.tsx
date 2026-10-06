import { ActivityIndicator, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { PressableScale } from "./Pressable";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { useTheme } from "../theme/ThemeProvider";
import { cn } from "../lib/cn";
import { haptic } from "../lib/haptics";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "accent";
type Size = "lg" | "md" | "sm";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  accessibilityHint?: string;
  className?: string;
  testID?: string;
}

const base: Record<Variant, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  secondary: "bg-raised border border-line",
  ghost: "bg-transparent",
  destructive: "bg-danger-soft border border-line",
};

const sizes: Record<Size, string> = {
  lg: "h-14 px-6",
  md: "h-12 px-5",
  sm: "h-10 px-4",
};

export function Button({ label, onPress, variant = "primary", size = "md", icon, iconRight, loading, disabled, full, accessibilityHint, className, testID }: ButtonProps) {
  const { c } = useTheme();
  const inactive = disabled || loading;
  const filled = (variant === "primary" || variant === "accent") && !disabled;
  // Green buttons carry white text; gold (accent) buttons keep dark ink for contrast.
  const tone = disabled ? "faint" : filled ? (variant === "primary" ? "white" : "ink") : variant === "destructive" ? "danger" : variant === "ghost" ? "primary" : "default";
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      className={cn("flex-row items-center justify-center rounded-btn min-h-touch", disabled ? "bg-raised border border-line" : base[variant], sizes[size], full && "self-stretch", className)}
    >
      {loading ? (
        <ActivityIndicator color={tone === "white" ? "#FFFFFF" : tone === "ink" ? c.primaryInk : c.text} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Icon as={icon} size={size === "sm" ? 16 : 18} tone={tone} /> : null}
          <Txt variant={size === "lg" ? "title" : "bodyStrong"} tone={tone} numberOfLines={1}>
            {label}
          </Txt>
          {iconRight ? <Icon as={iconRight} size={size === "sm" ? 16 : 18} tone={tone} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

/** Square icon-only button with an accessible label. */
export function IconButton({ icon, label, onPress, tone = "default", className }: { icon: LucideIcon; label: string; onPress?: () => void; tone?: "default" | "muted" | "primary"; className?: string }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      hitSlop={6}
      className={cn("h-11 w-11 items-center justify-center rounded-btn bg-raised border border-line", className)}
    >
      <Icon as={icon} size={20} tone={tone} />
    </PressableScale>
  );
}
