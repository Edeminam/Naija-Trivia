import { useMemo } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { IconButton, Txt } from "../../../ui";
import { SoloPlayer, type SoloApi } from "../../../features/solo/SoloPlayer";
import { api } from "../../../lib/api";
import { SCREEN_PADDING } from "../../../theme/tokens";

export default function ChallengePlay() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const soloApi = useMemo<SoloApi>(
    () => ({
      next: () => api.post(`/challenges/${code}/next`),
      answer: (index, optionId) => api.post(`/challenges/${code}/answer`, { index, optionId }),
    }),
    [code],
  );
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }}>
      <View className="flex-1 w-full max-w-[560px] self-center gap-3" style={{ paddingHorizontal: SCREEN_PADDING }}>
        <View className="flex-row items-center justify-between h-12">
          <IconButton icon={X} label="Leave" onPress={() => router.back()} />
          <Txt variant="overline" tone="primary">Friend challenge · {code}</Txt>
          <View className="w-11" />
        </View>
        <SoloPlayer
          api={soloApi}
          title="Challenge"
          onFinished={() => {
            void qc.invalidateQueries();
            router.replace({ pathname: "/c/[code]", params: { code: code!, done: "1" } });
          }}
        />
      </View>
    </View>
  );
}
