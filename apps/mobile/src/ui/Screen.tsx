import type { ReactNode } from "react";
import { ScrollView, View, RefreshControl, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Txt } from "./Text";
import { IconButton } from "./Button";
import { cn } from "../lib/cn";
import { useTheme } from "../theme/ThemeProvider";
import { SCREEN_PADDING } from "../theme/tokens";

/** Standard screen: safe area, 20pt padding, max content width for tablets/web. */
export function Screen({
  children,
  scroll = true,
  title,
  back,
  right,
  edges = ["top"],
  refreshing,
  onRefresh,
  className,
  contentClassName,
  scrollProps,
}: {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
  back?: boolean;
  right?: ReactNode;
  edges?: ("top" | "bottom")[];
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
  contentClassName?: string;
  scrollProps?: ScrollViewProps;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const header =
    title || back || right ? (
      <View className="flex-row items-center gap-3 pb-3" style={{ minHeight: 48 }}>
        {back ? <IconButton icon={ChevronLeft} label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} /> : null}
        {title ? (
          <Txt variant="h1" className="flex-1" accessibilityRole="header" numberOfLines={1}>
            {title}
          </Txt>
        ) : (
          <View className="flex-1" />
        )}
        {right}
      </View>
    ) : null;
  const pad = { paddingTop: edges.includes("top") ? insets.top + 8 : 8, paddingBottom: edges.includes("bottom") ? insets.bottom + 16 : 24, paddingHorizontal: SCREEN_PADDING };
  if (!scroll) {
    return (
      <View className={cn("flex-1 bg-bg", className)} style={pad}>
        <View className={cn("flex-1 w-full max-w-[640px] self-center", contentClassName)}>
          {header}
          {children}
        </View>
      </View>
    );
  }
  return (
    <ScrollView
      className={cn("flex-1 bg-bg", className)}
      contentContainerStyle={pad}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
      {...scrollProps}
    >
      <View className={cn("w-full max-w-[640px] self-center", contentClassName)}>
        {header}
        {children}
      </View>
    </ScrollView>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-end justify-between mb-3 mt-6">
      <Txt variant="h3" accessibilityRole="header">
        {title}
      </Txt>
      {action && onAction ? (
        <Txt variant="label" tone="primary" onPress={onAction} accessibilityRole="link" suppressHighlighting>
          {action}
        </Txt>
      ) : null}
    </View>
  );
}
