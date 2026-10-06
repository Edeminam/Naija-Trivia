import { View } from "react-native";
import { stateByCode, type LeaderboardPlayer } from "@ntc/shared";
import { Avatar, Txt } from "../ui";
import { cn } from "../lib/cn";

const MEDAL = ["#E8B44A", "#B8C2C8", "#C98A55"];

export function LeaderRow({ p, me, unit = "pts", first }: { p: LeaderboardPlayer; me?: boolean; unit?: string; first?: boolean }) {
  return (
    <View className={cn("flex-row items-center gap-3 py-3 px-4", !first && "border-t border-line", me && "bg-primary-soft")} accessibilityLabel={`Rank ${p.rank}, ${p.username}, ${p.points} ${unit}${me ? ", you" : ""}`}>
      <View className="w-7 items-center">
        {p.rank <= 3 ? (
          <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: `${MEDAL[p.rank - 1]}33` }}>
            <Txt variant="label" style={{ color: MEDAL[p.rank - 1] }}>{p.rank}</Txt>
          </View>
        ) : (
          <Txt variant="label" tone="muted" tabular>{p.rank}</Txt>
        )}
      </View>
      <Avatar id={p.avatarId} size={36} league={p.league} frameId={p.frameId} />
      <View className="flex-1">
        <Txt variant="bodyStrong" numberOfLines={1}>{p.username}{me ? " (you)" : ""}</Txt>
        <Txt variant="caption" tone="faint">{stateByCode(p.stateCode)?.name}</Txt>
      </View>
      <Txt variant="bodyStrong" tabular>{p.points.toLocaleString("en-NG")}</Txt>
    </View>
  );
}
