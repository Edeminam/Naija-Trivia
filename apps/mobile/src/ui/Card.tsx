import { View, StyleSheet, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AdirePattern } from "./AdirePattern";
import { PressableScale } from "./Pressable";
import { cn } from "../lib/cn";
import { useTheme } from "../theme/ThemeProvider";

interface CardProps extends ViewProps {
  className?: string;
  variant?: "default" | "hero" | "outline" | "raised";
  onPress?: () => void;
  accessibilityLabel?: string;
  /** hero tint: green (default) or gold */
  tint?: "primary" | "accent";
}

/** Surface container, radius 20. `hero` adds the brand gradient + adire pattern. */
export function Card({ className, variant = "default", onPress, children, tint = "primary", accessibilityLabel, ...rest }: CardProps) {
  const { c, name } = useTheme();
  const cls = cn(
    "rounded-card overflow-hidden",
    variant === "default" && "bg-surface border border-line",
    variant === "raised" && "bg-raised border border-line",
    variant === "outline" && "border border-line",
    variant === "hero" && "border border-line",
    className,
  );
  const inner = (
    <>
      {variant === "hero" ? (
        <>
          <LinearGradient
            colors={
              tint === "primary"
                ? name === "dark" ? ["#0F3A24", "#11241A", c.surface] : ["#D6F3E3", "#EAF7EF", c.surface]
                : name === "dark" ? ["#3A2C10", "#221B10", c.surface] : ["#FBEBC8", "#FDF5E4", c.surface]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AdirePattern />
        </>
      ) : null}
      {children}
    </>
  );
  if (onPress) {
    return (
      <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} className={cls} {...(rest as any)}>
        {inner}
      </PressableScale>
    );
  }
  return (
    <View className={cls} {...rest}>
      {inner}
    </View>
  );
}
