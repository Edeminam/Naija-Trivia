import { useEffect } from "react";
import { View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, AlertCircle, Info } from "lucide-react-native";
import { create } from "zustand";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { PressableScale } from "./Pressable";

type Kind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
}

const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items.filter((i) => i.title !== t.title), { ...t, id: Date.now() + Math.random() }].slice(-3) })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

/** Fire-and-forget toasts from anywhere: toast.success("Saved"). */
export const toast = {
  success: (title: string, body?: string) => useToasts.getState().push({ kind: "success", title, body }),
  error: (title: string, body?: string) => useToasts.getState().push({ kind: "error", title, body }),
  info: (title: string, body?: string) => useToasts.getState().push({ kind: "info", title, body }),
};

function ToastRow({ t }: { t: ToastItem }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), t.kind === "error" ? 4500 : 3000);
    return () => clearTimeout(id);
  }, [t, dismiss]);
  const icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertCircle : Info;
  const tone = t.kind === "success" ? "primary" : t.kind === "error" ? "danger" : "accent";
  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(160)}>
      <PressableScale onPress={() => dismiss(t.id)} accessibilityRole="alert" accessibilityLabel={`${t.title}. ${t.body ?? ""}`} className="flex-row items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3 shadow-lg">
        <Icon as={icon} tone={tone} />
        <View className="flex-1">
          <Txt variant="bodyStrong">{t.title}</Txt>
          {t.body ? (
            <Txt variant="caption" tone="muted">
              {t.body}
            </Txt>
          ) : null}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export function ToastHost() {
  const items = useToasts((s) => s.items);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, gap: 8, alignItems: "center" }}>
      {items.map((t) => (
        <View key={t.id} style={{ width: "100%", maxWidth: 520 }}>
          <ToastRow t={t} />
        </View>
      ))}
    </View>
  );
}
