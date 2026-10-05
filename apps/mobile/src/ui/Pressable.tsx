import { forwardRef } from "react";
import { Pressable as RNPressable, type PressableProps, type View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { motion } from "../theme/tokens";
import { useReducedMotion } from "../lib/motion";

import { cssInterop } from "nativewind";

const APressable = Animated.createAnimatedComponent(RNPressable);
cssInterop(APressable, { className: "style" });

export interface PressableScaleProps extends PressableProps {
  className?: string;
  scaleTo?: number;
}

/** Pressable with a spring press-in to 0.97 (skipped under Reduce Motion). */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale({ scaleTo = motion.pressScale, style, onPressIn, onPressOut, disabled, ...rest }, ref) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      ref={ref}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduce && !disabled) s.value = withSpring(scaleTo, motion.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, motion.press);
        onPressOut?.(e);
      }}
      style={[anim, style as any]}
      {...rest}
    />
  );
});
