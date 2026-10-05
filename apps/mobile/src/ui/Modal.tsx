import type { ReactNode } from "react";
import { Modal as RNModal, View, Pressable } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { Txt } from "./Text";
import { Button } from "./Button";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../lib/motion";

/** Centered confirmation dialog. */
export function Modal({
  open,
  onClose,
  title,
  body,
  children,
  confirmLabel,
  onConfirm,
  cancelLabel = "Cancel",
  destructive,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  children?: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  return (
    <RNModal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={reduce ? undefined : FadeIn.duration(150)} style={{ flex: 1, backgroundColor: c.overlay, justifyContent: "center", padding: 24 }}>
        <Pressable style={{ position: "absolute", inset: 0 } as any} onPress={onClose} accessibilityLabel="Close dialog" />
        <Animated.View entering={reduce ? undefined : ZoomIn.springify().damping(18)} className="w-full max-w-[420px] self-center rounded-card border border-line bg-surface p-6 gap-3" accessibilityViewIsModal>
          <Txt variant="h2" accessibilityRole="header">
            {title}
          </Txt>
          {body ? (
            <Txt variant="body" tone="muted">
              {body}
            </Txt>
          ) : null}
          {children}
          <View className="mt-3 gap-2">
            {confirmLabel ? <Button label={confirmLabel} onPress={onConfirm} variant={destructive ? "destructive" : "primary"} loading={loading} full /> : null}
            <Button label={cancelLabel} onPress={onClose} variant="ghost" full />
          </View>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
}
