import { useMemo } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { IconButton, Txt, toast } from "../../../ui";
import { SoloPlayer, type SoloApi } from "../../../features/solo/SoloPlayer";
import { api } from "../../../lib/api";
import { SCREEN_PADDING } from "../../../theme/tokens";

export default function EventPlay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const soloApi = useMemo<SoloApi>(
    () => ({
      next: () => api.post(`/events/${id}/next`),
      answer: (index, optionId) => api.post(`/events/${id}/answer`, { index, optionId }),
    }),
    [id],
  );
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }}>
      <View className="flex-1 w-full max-w-[560px] self-center gap-3" style={{ paddingHorizontal: SCREEN_PADDING }}>
        <View className="flex-row items-center justify-between h-12">
          <IconButton icon={X} label="Pause and leave" onPress={() => router.back()} />
          <Txt variant="overline" tone="danger">● Live event</Txt>
          <View className="w-11" />
        </View>
        <SoloPlayer
          api={soloApi}
          title="Event"
          onFinished={(last) => {
            if (last?.rewards) toast.success(`+${last.rewards.coins} coins for finishing`, "Top 10 win more when the event ends.");
            void qc.invalidateQueries();
            router.replace({ pathname: "/event/[id]", params: { id: id!, done: "1" } });
          }}
        />
      </View>
    </View>
  );
}
