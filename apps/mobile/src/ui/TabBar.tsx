import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Home, Shield, Map, ShoppingBag, User, type LucideIcon } from "lucide-react-native";
import { PressableScale } from "./Pressable";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/cn";
import { useTheme } from "../theme/ThemeProvider";

const META: Record<string, { label: string; icon: LucideIcon }> = {
  home: { label: "Home", icon: Home },
  leagues: { label: "Leagues", icon: Shield },
  "state-wars": { label: "State Wars", icon: Map },
  shop: { label: "Shop", icon: ShoppingBag },
  profile: { label: "Profile", icon: User },
};

function Tab({ active, label, icon, onPress }: { active: boolean; label: string; icon: LucideIcon; onPress: () => void }) {
  const { c } = useTheme();
  const pill = useAnimatedStyle(() => ({ opacity: withSpring(active ? 1 : 0, { damping: 20 }), transform: [{ scale: withSpring(active ? 1 : 0.8, { damping: 16 }) }] }));
  return (
    <PressableScale
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      className="flex-1 items-center justify-center gap-1 min-h-touch py-1.5"
    >
      <View className="items-center justify-center h-8 w-14">
        <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, backgroundColor: c.primarySoft }, pill]} />
        <Icon as={icon} size={22} tone={active ? "primary" : "faint"} />
      </View>
      <Txt variant="caption" className={cn("text-xs font-body-sb", active ? "text-primary-text" : "text-ink-faint")} numberOfLines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

interface BottomTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
}

/** Custom tab bar: solid surface, active pill, 48pt targets. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-t border-line bg-surface" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      <View className="flex-row px-2 pt-1.5 w-full max-w-[640px] self-center">
        {state.routes.map((route, i) => {
          const meta = META[route.name];
          if (!meta) return null;
          return (
            <Tab
              key={route.key}
              active={state.index === i}
              label={meta.label}
              icon={meta.icon}
              onPress={() => {
                const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (state.index !== i && !e.defaultPrevented) navigation.navigate(route.name);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
