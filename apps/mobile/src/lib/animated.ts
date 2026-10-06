import { View } from "react-native";
import Animated from "react-native-reanimated";

/**
 * Animated view for `useAnimatedStyle` styles. Not registered with NativeWind's interop (which wraps
 * Reanimated's `Animated.View` so it can take `className`), because on native that interop drops the
 * whole style when an animated style is present. Use plain `style` only — no `className`.
 */
export const AnimatedBox = Animated.createAnimatedComponent(View);
