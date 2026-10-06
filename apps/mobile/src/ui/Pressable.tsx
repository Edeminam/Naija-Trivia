import { forwardRef, useState, type ReactNode } from "react";
import { Pressable as RNPressable, StyleSheet, type PressableProps, type View, type AccessibilityActionEvent, type GestureResponderEvent } from "react-native";
import Animated from "react-native-reanimated";
import { motion } from "../theme/tokens";
import { useReducedMotion } from "../lib/motion";

export interface PressableScaleProps extends Omit<PressableProps, "children"> {
  className?: string;
  scaleTo?: number;
  children?: ReactNode;
}

/**
 * Pressable with a press-in scale to 0.97 (skipped under Reduce Motion).
 *
 * Structure: the visible element is a Reanimated `Animated.View` (it takes NativeWind classes on every
 * platform) and carries the scale as a plain style with a Reanimated CSS transition — NativeWind drops
 * classes on native when they're combined with a `useAnimatedStyle` style. A transparent core `Pressable`
 * covers it to receive touches.
 * The Animated.View is the single accessible element and supports the "activate" action, so screen
 * readers and tests trigger the same `onPress`.
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  {
    scaleTo = motion.pressScale,
    className,
    style,
    children,
    onPress,
    onPressIn,
    onPressOut,
    onLongPress,
    disabled,
    hitSlop,
    accessibilityRole,
    accessibilityLabel,
    accessibilityHint,
    accessibilityState,
    testID,
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const scale = pressed && !reduce && !disabled ? scaleTo : 1;
  const pressStyle = { transform: [{ scale }], transitionProperty: "transform", transitionDuration: pressed ? motion.fast : motion.base, transitionTimingFunction: "ease-out" };
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === "activate" && !disabled) onPress?.(e as unknown as GestureResponderEvent);
  };
  return (
    <Animated.View
      ref={ref as any}
      className={className}
      style={[typeof style === "function" ? undefined : (style as any), pressStyle as any]}
      accessible
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled || accessibilityState?.disabled }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={onAction}
      testID={testID}
    >
      {children}
      <RNPressable
        {...rest}
        style={StyleSheet.absoluteFill}
        disabled={disabled}
        pointerEvents={disabled ? "none" : "auto"}
        hitSlop={hitSlop}
        accessible={false}
        importantForAccessibility="no"
        // A transparent, non-accessible view gets flattened away on Android (Fabric) and stops receiving
        // touches — keep it as a real view.
        collapsable={false}
        onPress={disabled ? undefined : onPress}
        onLongPress={disabled ? undefined : onLongPress}
        onPressIn={(e) => {
          setPressed(true);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          setPressed(false);
          onPressOut?.(e);
        }}
      />
    </Animated.View>
  );
});
