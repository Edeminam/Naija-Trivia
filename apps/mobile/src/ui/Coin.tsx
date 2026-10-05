import { View } from "react-native";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from "../lib/cn";

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Defs>
        <LinearGradient id="coin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE29A" />
          <Stop offset="0.5" stopColor="#E8B44A" />
          <Stop offset="1" stopColor="#B9831F" />
        </LinearGradient>
      </Defs>
      <Circle cx={12} cy={12} r={11} fill="url(#coin)" />
      <Circle cx={12} cy={12} r={8} fill="none" stroke="#8C5E10" strokeOpacity={0.45} strokeWidth={1.2} />
      {/* stylised ₦ */}
      <Path d="M9 16.5 V7.5 L15 16.5 V7.5 M7.5 10.6 H16.5 M7.5 13.4 H16.5" stroke="#6E470A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Coin balance pill with an animated count-up when the value changes. */
export function CoinCounter({ value, size = "md", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const icon = size === "lg" ? 24 : size === "sm" ? 14 : 18;
  return (
    <View className={cn("flex-row items-center gap-1.5 rounded-chip bg-accent-soft px-3", size === "sm" ? "h-7" : size === "lg" ? "h-11 px-4" : "h-9", className)} accessibilityLabel={`${value} coins`}>
      <CoinIcon size={icon} />
      <AnimatedNumber value={value} variant={size === "lg" ? "h2" : size === "sm" ? "label" : "bodyStrong"} tone="accent" />
    </View>
  );
}
