import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Users } from "lucide-react-native";
import { stateByCode } from "@ntc/shared";
import { Screen, Card, Txt, SkeletonRow, ErrorState, EmptyState, AdirePattern } from "../../ui";
import { useStateTop, useStateWars } from "../../features/statewars/api";
import { LeaderRow } from "../../features/LeaderRow";
import { useMe } from "../../features/me";

export default function StateDetail() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const q = useStateTop(code);
  const wars = useStateWars();
  const me = useMe();
  const st = stateByCode(code);
  const row = wars.data?.rows.find((r) => r.code === code);
  return (
    <Screen title={st?.name ?? "State"} back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <Card variant="hero" className="p-5 flex-row items-center gap-4">
        <View className="flex-1 gap-1">
          <Txt variant="overline" tone="primary">{st?.region}</Txt>
          <Txt variant="h1">{row?.points ? `#${row.rank} in Naija` : "Not ranked yet"}</Txt>
          <Txt variant="caption" tone="muted" tabular>{(row?.points ?? 0).toLocaleString("en-NG")} points · {row?.players ?? 0} players this week</Txt>
        </View>
      </Card>
      <Txt variant="h3" className="mt-6 mb-3">Top 20 this week</Txt>
      <Card className="overflow-hidden">
        {q.isError && !q.data ? (
          <ErrorState offline={(q.error as any)?.offline} onRetry={() => q.refetch()} />
        ) : !q.data ? (
          <View className="px-4"><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></View>
        ) : q.data.players.length === 0 ? (
          <EmptyState icon={Users} title={`No ${st?.name ?? ""} wins yet`} body="Ranked wins this week will show up here. Be the first name on the list." />
        ) : (
          q.data.players.map((p, i) => <LeaderRow key={p.id} p={p} first={i === 0} me={p.id === me.data?.profile.id} />)
        )}
      </Card>
    </Screen>
  );
}
