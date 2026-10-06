import { useEffect, type ReactNode } from "react";
import { AnimatedBox } from "../lib/animated";
import { Modal as RNModal, Pressable, View, KeyboardAvoidingView, Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "./Text";
import { motion } from "../theme/tokens";
import { useReducedMotion } from "../lib/motion";
import { useTheme, useThemeVars } from "../theme/ThemeProvider";

/** Drag-to-dismiss bottom sheet over a dimmed backdrop. */
export function BottomSheet({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title?: string; subtitle?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { c } = useTheme();
  const tv = useThemeVars();
  const y = useSharedValue(600);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (open) {
      y.value = reduce ? 0 : withTiming(0, { duration: motion.slow, easing: motion.easeOut });
      fade.value = withTiming(1, { duration: motion.base });
    }
  }, [open, reduce, y, fade]);

  const close = () => {
    fade.value = withTiming(0, { duration: motion.fast });
    y.value = withTiming(600, { duration: motion.base }, (done) => done && runOnJS(onClose)());
  };

  const pan = Gesture.Pan()
    .onChange((e) => {
      y.value = Math.max(0, y.value + e.changeY);
    })
    .onEnd((e) => {
      if (y.value > 120 || e.velocityY > 900) {
        fade.value = withTiming(0, { duration: motion.fast });
        y.value = withTiming(600, { duration: motion.base }, (done) => done && runOnJS(onClose)());
      } else y.value = withTiming(0, { duration: motion.base });
    });

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <RNModal visible={open} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={[{ flex: 1 }, tv]}>
        <AnimatedBox style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, backgroundColor: c.overlay }, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel="Close sheet" />
        </AnimatedBox>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", zIndex: 1 }} pointerEvents="box-none">
          <AnimatedBox style={[{ width: "100%", maxWidth: 560, alignSelf: "center" }, sheet]} accessibilityViewIsModal>
          <View style={{ paddingBottom: insets.bottom + 16, backgroundColor: c.surface, borderColor: c.line }} className="rounded-t-[28px] border-t px-5 pt-2">
            <GestureDetector gesture={pan}>
              <View className="items-center py-2" accessibilityLabel="Drag down to close">
                <View className="h-1.5 w-10 rounded-full bg-raised" />
              </View>
            </GestureDetector>
            {title ? (
              <View className="mb-4 mt-1 gap-1">
                <Txt variant="h2" accessibilityRole="header">
                  {title}
                </Txt>
                {subtitle ? (
                  <Txt variant="body" tone="muted">
                    {subtitle}
                  </Txt>
                ) : null}
              </View>
            ) : null}
            {children}
          </View>
          </AnimatedBox>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </RNModal>
  );
}
