import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";

/** Let NativeWind `className` work on Reanimated + third-party components. */
cssInterop(Animated.View, { className: "style" });
cssInterop(Animated.Text, { className: "style" });
cssInterop(Animated.ScrollView, { className: "style", contentContainerClassName: "contentContainerStyle" });
cssInterop(LinearGradient, { className: "style" });
