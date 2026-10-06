import { useMemo } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { IconButton, Txt, toast } from "../../ui";
import { SoloPlayer, type SoloApi } from "../../features/solo/SoloPlayer";
import { api } from "../../lib/api";
import { SCREEN_PADDING } from "../../theme/tokens";
import { scheduleDailyReminders } from "../../features/notifications";
import { usePrefs } from "../../stores/prefs";

export default function DailyPlay() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const soloApi = useMemo<SoloApi>(
    () => ({
      next: () => api.post("/daily/next"),
      answer: (index, optionId) => api.post("/daily/answer", { index, optionId }),
    }),
    [],
  );
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }}>
      <View className="flex-1 w-full max-w-[560px] self-center gap-3" style={{ paddingHorizontal: SCREEN_PADDING }}>
        <View className="flex-row items-center justify-between h-12">
          <IconButton icon={X} label="Pause and leave" onPress={() => router.back()} />
          <Txt variant="overline" tone="accent">Daily Naija</Txt>
          <View className="w-11" />
        </View>
        <SoloPlayer
          api={soloApi}
          title="Daily"
          onFinished={(last) => {
            const rw = last?.rewards;
            if (rw) toast.success(`+${rw.coins} coins · ${rw.streak.current}-day streak 🔥`, rw.streak.usedFreeze ? "Your weekly freeze saved the streak." : "See you tomorrow!");
            void qc.invalidateQueries();
            if (usePrefs.getState().notifications) void scheduleDailyReminders(true).catch(() => {});
            router.replace({ pathname: "/daily", params: { done: "1" } });
          }}
        />
      </View>
    </View>
  );
}
