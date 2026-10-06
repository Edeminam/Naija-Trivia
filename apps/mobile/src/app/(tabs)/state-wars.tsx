import { View } from "react-native";
import { router } from "expo-router";
import { ArrowUp, ArrowDown, Minus, Clock, Globe2, ChevronRight, Map as MapIcon } from "lucide-react-native";
import type { StateWarsRow } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Card, Avatar, Icon, PressableScale, Skeleton, SkeletonRow, ErrorState, EmptyState } from "../../ui";
import { useStateWars } from "../../features/statewars/api";
import { StateMap } from "../../features/statewars/StateMap";
import { useCountdown } from "../../lib/useCountdown";
import { cn } from "../../lib/cn";

function Change({ v }: { v: number | null }) {
  if (v === null || v === 0) return <Icon as={Minus} size={14} tone="faint" />;
  return (
    <View className="flex-row items-center" accessibilityLabel={v > 0 ? `Up ${v}` : `Down ${-v}`}>
      <Icon as={v > 0 ? ArrowUp : ArrowDown} size={14} tone={v > 0 ? "primary" : "danger"} />
      <Txt variant="caption" tone={v > 0 ? "primary" : "danger"} tabular>{Math.abs(v)}</Txt>
    </View>
  );
}

function Row({ r, mine, first }: { r: StateWarsRow; mine: boolean; first: boolean }) {
  return (
    <PressableScale
      scaleTo={0.99}
      onPress={() => router.push({ pathname: "/state/[code]", params: { code: r.code } })}
      accessibilityRole="button"
      accessibilityLabel={`${r.points ? `Rank ${r.rank}` : "Unranked"}, ${r.name}, ${r.points} points${mine ? ", your state" : ""}`}
      className={cn("flex-row items-center gap-3 px-4 py-3", !first && "border-t border-line", mine && "bg-primary-soft")}
    >
      <Txt variant="bodyStrong" tone={r.rank <= 3 && r.points ? "accent" : "muted"} tabular className="w-7 text-center">{r.points ? r.rank : "–"}</Txt>
      <View className="w-6 items-center"><Change v={r.change} /></View>
      <View className="flex-1">
        <Txt variant="bodyStrong" numberOfLines={1}>{r.name}{mine ? " · you" : ""}</Txt>
        <Txt variant="caption" tone="faint" numberOfLines={1}>{r.topPlayer ? `Top: ${r.topPlayer.username}` : r.region}</Txt>
      </View>
      {r.topPlayer ? <Avatar id={r.topPlayer.avatarId} size={28} /> : null}
      <Txt variant="bodyStrong" tabular className="w-16 text-right">{r.points.toLocaleString("en-NG")}</Txt>
    </PressableScale>
  );
}

export default function StateWars() {
  const q = useStateWars();
  const d = q.data;
  const { text } = useCountdown(d?.endsAt);
  const mine = d?.rows.find((r) => r.code === d.myState);
  const diaspora = d?.rows.find((r) => r.code === "DI");
  const anyPoints = !!d?.rows.some((r) => r.points > 0);

  return (
    <Screen title="State Wars" refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <View className="flex-row items-center gap-2 -mt-1 mb-4">
        <Icon as={Clock} size={14} tone="muted" />
        <Txt variant="caption" tone="muted">Week ends in <Txt variant="caption" tabular>{text || "…"}</Txt> · every ranked win adds points</Txt>
      </View>
      {q.isError && !d ? (
        <ErrorState offline={(q.error as any)?.offline} onRetry={() => q.refetch()} />
      ) : !d ? (
        <View className="gap-4"><Skeleton h={300} r={20} /><Skeleton h={72} r={20} /><Card className="px-4"><SkeletonRow /><SkeletonRow /><SkeletonRow /></Card></View>
      ) : (
        <>
          <Card className="p-4">
            <StateMap rows={d.rows} myState={d.myState} onPress={(code) => router.push({ pathname: "/state/[code]", params: { code } })} />
          </Card>
          <View className="flex-row gap-3 mt-3">
            {mine ? (
              <Card className="flex-1 p-4 gap-1" onPress={() => router.push({ pathname: "/state/[code]", params: { code: mine.code } })} accessibilityLabel={`Your state ${mine.name}`}>
                <Txt variant="overline" tone="primary">Your state</Txt>
                <Txt variant="h3" numberOfLines={1}>{mine.name}</Txt>
                <Txt variant="caption" tone="muted" tabular>{mine.points ? `#${mine.rank} · ${mine.points.toLocaleString("en-NG")} pts` : "No points yet this week"}</Txt>
              </Card>
            ) : null}
            {diaspora ? (
              <Card className="flex-1 p-4 gap-1" onPress={() => router.push({ pathname: "/state/[code]", params: { code: "DI" } })} accessibilityLabel="Diaspora team">
                <View className="flex-row items-center gap-1.5"><Icon as={Globe2} size={14} tone="accent" /><Txt variant="overline" tone="accent">Diaspora</Txt></View>
                <Txt variant="h3">Naija abroad</Txt>
                <Txt variant="caption" tone="muted" tabular>{diaspora.points ? `#${diaspora.rank} · ${diaspora.points.toLocaleString("en-NG")} pts` : "No points yet"}</Txt>
              </Card>
            ) : null}
          </View>
          <SectionTitle title="This week's table" />
          {!anyPoints ? (
            <Card className="mb-3"><EmptyState icon={MapIcon} title="Fresh week, open race" body="No state has scored yet. Win a ranked clash to put yours on the board." actionLabel="Play now" onAction={() => router.push("/match/play")} /></Card>
          ) : null}
          <Card className="overflow-hidden">
            {d.rows.map((r, i) => <Row key={r.code} r={r} mine={r.code === d.myState} first={i === 0} />)}
          </Card>
          <View className="flex-row items-center justify-center gap-1 mt-4">
            <Txt variant="caption" tone="faint">Tap a state to see its top 20</Txt>
            <Icon as={ChevronRight} size={14} tone="faint" />
          </View>
        </>
      )}
    </Screen>
  );
}
