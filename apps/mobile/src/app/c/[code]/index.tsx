import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Swords, Clock, Trophy, Play, Hourglass, Home, RotateCcw, UserPlus } from "lucide-react-native";
import { categoryBySlug, stateByCode } from "@ntc/shared";
import { Screen, Txt, Button, Card, Chip, Avatar, Icon, ErrorState, SkeletonCard, EmptyState, Confetti, toast } from "../../../ui";
import { useChallenge } from "../../../features/challenge/api";
import { ShareActions } from "../../../features/challenge/ShareActions";
import { useSession } from "../../../stores/session";
import { useMe } from "../../../features/me";
import { playAsGuest } from "../../../features/auth";
import { useCountdown } from "../../../lib/useCountdown";
import { FriendButton } from "../../../features/friends/FriendButton";
import { cn } from "../../../lib/cn";
import type { ApiError } from "../../../lib/api";

export default function ChallengeLanding() {
  const { code, done } = useLocalSearchParams<{ code: string; done?: string }>();
  const token = useSession((s) => s.token);
  const me = useMe();
  const q = useChallenge(code);
  const c = q.data;
  const [busy, setBusy] = useState(false);
  const { text } = useCountdown(c ? Date.parse(c.expiresAt) : null);
  const myId = me.data?.profile.id;
  const isCreator = !!c && c.createdBy.id === myId;
  const creatorEntry = c?.entries.find((e) => e.player.id === c.createdBy.id);
  const mine = c?.myEntry;
  const finishedEntries = c?.entries.filter((e) => e.finished).sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.totalMs - b.totalMs) ?? [];
  const iWon = !!mine?.finished && finishedEntries[0]?.player.id === myId && finishedEntries.length > 1;

  const play = async () => {
    setBusy(true);
    try {
      if (!token) await playAsGuest();
      router.push({ pathname: "/c/[code]/play", params: { code: code! } });
    } catch (e: any) {
      toast.error("Couldn't start", e.message);
    } finally {
      setBusy(false);
    }
  };

  const err = q.error as ApiError | null;
  return (
    <View className="flex-1 bg-bg">
      <Screen back={!!token} title={token ? "Challenge" : undefined}>
        {!token ? (
          <View className="flex-row items-center gap-2 mb-4">
            <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-primary"><Icon as={Swords} size={18} tone="ink" /></View>
            <Txt variant="h3">Naija Trivia Clash</Txt>
          </View>
        ) : null}
        {err && !c ? (
          err.status === 404 ? (
            <EmptyState icon={Swords} title="Challenge not found" body="Check the link, or start your own clash." actionLabel="Go home" onAction={() => router.replace("/")} />
          ) : (
            <ErrorState offline={err.offline} onRetry={() => q.refetch()} />
          )
        ) : !c ? (
          <View className="gap-4"><SkeletonCard lines={3} /><SkeletonCard lines={3} /></View>
        ) : (
          <View className="gap-5">
            <Card variant="hero" tint={c.expired ? "accent" : "primary"} className="p-5 gap-4 items-center">
              <Avatar id={c.createdBy.avatarId} size={84} league={c.createdBy.league} frameId={c.createdBy.frameId} stateCode={c.createdBy.stateCode} />
              <View className="items-center gap-1">
                <Txt variant="overline" tone={c.expired ? "accent" : "primary"}>{isCreator ? "Your challenge" : mine?.finished ? "Challenge result" : "You've been challenged"}</Txt>
                <Txt variant="h1" className="text-center">
                  {isCreator
                    ? finishedEntries.length > 1 ? (finishedEntries[0]?.player.id === myId ? "You're holding the crown" : `${finishedEntries[0]?.player.username} took the top spot`) : "Waiting on your friends"
                    : mine?.finished
                      ? iWon ? `You beat ${c.createdBy.username}!` : `${finishedEntries[0]?.player.username ?? c.createdBy.username} wins this one`
                      : `${c.createdBy.username} says you no fit!`}
                </Txt>
                <Txt variant="body" tone="muted" className="text-center">
                  {stateByCode(c.createdBy.stateCode)?.name} · {c.createdBy.rating} rating
                </Txt>
              </View>
              {token && !isCreator && !me.data?.profile.isGuest ? <FriendButton id={c.createdBy.id} name={c.createdBy.username} /> : null}
              <View className="flex-row flex-wrap justify-center gap-2">
                {c.categories.map((s) => <Chip key={s} label={categoryBySlug(s)?.name ?? s} tone="primary" />)}
              </View>
              {creatorEntry?.finished && !isCreator ? (
                <View className="items-center rounded-2xl bg-surface border border-line px-6 py-3">
                  <Txt variant="caption" tone="muted">Score to beat</Txt>
                  <Txt variant="display" tabular>{creatorEntry.score?.toLocaleString("en-NG")}</Txt>
                </View>
              ) : null}
              <View className="flex-row items-center gap-2">
                <Icon as={c.expired ? Hourglass : Clock} size={16} tone="muted" />
                <Txt variant="caption" tone="muted">{c.expired ? "This challenge has expired" : <>Expires in <Txt variant="caption" tabular>{text}</Txt></>}</Txt>
              </View>
            </Card>

            {mine?.finished ? (
              <Card className={cn("p-4 items-center gap-1", iWon ? "border-primary" : "")}>
                <Txt variant="h2">{iWon ? "You're on top! 🏆" : finishedEntries.length > 1 ? "Played!" : "Score locked in"}</Txt>
                <Txt variant="body" tone="muted">You scored {mine.score.toLocaleString("en-NG")}</Txt>
              </Card>
            ) : !c.expired || mine ? (
              <View className="gap-2">
                <Button label={mine ? `Resume · question ${mine.nextIndex + 1}` : token ? "Accept challenge" : "Accept & play as guest"} icon={Play} size="lg" full loading={busy} onPress={play} testID="accept-challenge" />
                {!token ? <Button label="I have an account" icon={UserPlus} variant="ghost" full onPress={() => router.push("/onboarding/sign-in")} /> : null}
              </View>
            ) : null}

            <View>
              <Txt variant="h3" className="mb-3">Leaderboard</Txt>
              <Card className="overflow-hidden">
                {finishedEntries.length === 0 ? (
                  <EmptyState icon={Trophy} title="No scores yet" body="First to finish sets the bar." className="py-6" />
                ) : (
                  finishedEntries.map((e, i) => (
                    <View key={e.player.id} className={cn("flex-row items-center gap-3 px-4 py-3", i > 0 && "border-t border-line", e.player.id === myId && "bg-primary-soft")}>
                      <Txt variant="label" tone={i === 0 ? "accent" : "muted"} className="w-5">{i + 1}</Txt>
                      <Avatar id={e.player.avatarId} size={36} league={e.player.league} />
                      <View className="flex-1">
                        <Txt variant="bodyStrong" numberOfLines={1}>{e.player.username}{e.player.id === myId ? " (you)" : ""}</Txt>
                        <Txt variant="caption" tone="faint">{e.correct}/7 correct · {(e.totalMs / 1000).toFixed(1)}s</Txt>
                      </View>
                      <Txt variant="bodyStrong" tabular>{e.score?.toLocaleString("en-NG")}</Txt>
                    </View>
                  ))
                )}
              </Card>
            </View>

            {isCreator || mine?.finished ? (
              <View className="gap-3">
                <Txt variant="h3">Bring more people in</Txt>
                <ShareActions c={c} />
              </View>
            ) : null}
            {mine?.finished && !isCreator ? (
              me.data?.profile.isGuest ? (
                <Button label="Sign in to challenge them back" icon={UserPlus} variant="secondary" full onPress={() => router.push("/onboarding/sign-in")} />
              ) : (
                <Button label="Challenge them back" icon={RotateCcw} variant="secondary" full onPress={() => router.push("/challenge/new")} />
              )
            ) : null}
            {token ? <Button label="Home" icon={Home} variant="ghost" full onPress={() => router.replace("/home")} /> : null}
          </View>
        )}
      </Screen>
      {done && iWon ? <Confetti /> : null}
    </View>
  );
}
