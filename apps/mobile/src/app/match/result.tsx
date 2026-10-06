import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router, Redirect } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { RotateCcw, Share2, Home as HomeIcon, Check, X, Minus, Flag, Bot, TrendingUp, TrendingDown, MapPin, Sparkles, UserPlus } from "lucide-react-native";
import { LEAGUES, leagueProgress, stateByCode, categoryBySlug } from "@ntc/shared";
import { Screen, Txt, Button, Card, Avatar, AnimatedNumber, ProgressBar, LeagueBadge, CoinIcon, Icon, IconButton, Confetti, AdirePattern, Chip, toast } from "../../ui";
import { useMatch, match } from "../../features/match/store";
import { ReportSheet } from "../../features/report/ReportSheet";
import { shareMatch } from "../../features/share/share";
import { ads } from "../../features/ads/AdService";
import { queryClient } from "../../lib/queryClient";
import { api } from "../../lib/api";
import { SERVER_URL } from "../../lib/config";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../lib/motion";

function Reward({ icon, label, value, prefix = "+", tone = "default", delay }: { icon: React.ReactNode; label: string; value: number; prefix?: string; tone?: "default" | "primary" | "danger" | "accent"; delay: number }) {
  return (
    <View className="flex-1 items-center gap-1.5 rounded-2xl bg-raised py-3.5" accessibilityLabel={`${label} ${value >= 0 ? prefix : ""}${value}`}>
      {icon}
      <AnimatedNumber value={value} delay={delay} duration={900} variant="h2" tone={tone} format={(n) => `${n > 0 && prefix ? prefix : ""}${n.toLocaleString("en-NG")}`} />
      <Txt variant="caption" tone="muted">{label}</Txt>
    </View>
  );
}

export default function Result() {
  const s = useMatch();
  const reduce = useReducedMotion();
  const [report, setReport] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const r = s.result;
  const myId = s.me;

  // Prefetch the next match in the background: fresh profile/home data and a warm server connection.
  useEffect(() => {
    void queryClient.prefetchQuery({ queryKey: ["me"], queryFn: () => api.get("/me") });
    void queryClient.prefetchQuery({ queryKey: ["home"], queryFn: () => api.get("/home") });
    void fetch(`${SERVER_URL}/health`).catch(() => {});
  }, []);


  const data = useMemo(() => {
    if (!r || !myId) return null;
    const mine = r.players[myId];
    const oppId = Object.keys(s.players).find((id) => id !== myId)!;
    return { mine, oppId, opp: s.players[oppId], me: s.players[myId] };
  }, [r, myId, s.players]);

  // Rematch accepted: the store already joined the new room.
  if (["found", "banning", "ready"].includes(s.stage)) return <Redirect href={{ pathname: "/match/play", params: { rematch: "1" } }} />;
  if (!r || !data?.mine) return <Redirect href="/home" />;
  const { mine, opp, me, oppId } = data;
  const win = mine.result === "win";
  const promoted = mine.leagueAfter !== mine.leagueBefore && mine.ratingDelta > 0;
  const margin = Math.abs(mine.score - (opp?.score ?? 0));
  const headline = win ? (margin < 150 ? "Won by a whisker!" : "You won!") : mine.result === "draw" ? "It's a draw" : margin < 150 ? "Close one" : "Not your day";
  const sub = win
    ? r.isBot
      ? "Practice opponent beaten."
      : `You outsmarted ${opp?.username}.`
    : mine.result === "draw"
      ? "Same score, same speed. Wow."
      : margin < 150
        ? "Shake it off — run it back?"
        : "Every Agba started as a JJC. Go again.";
  const leagueAfter = LEAGUES.find((l) => l.id === mine.leagueAfter)!;
  const isGuest = r.mode === "guest";

  const goHome = async () => {
    setBusy("home");
    await ads.showInterstitial().catch(() => {});
    await match.reset();
    router.replace("/home");
  };
  const rematch = async () => {
    setBusy("rematch");
    await ads.showInterstitial().catch(() => {});
    if (s.rematch.opponentLeft) {
      await match.reset();
      router.replace("/match/play");
      return;
    }
    match.requestRematch();
  };

  const waitingOpp = s.rematch.waiting && !r.isBot && !s.rematch.requested.includes(oppId);
  const oppWants = s.rematch.requested.includes(oppId) && !s.rematch.waiting;

  return (
    <View className="flex-1 bg-bg">
      <Screen edges={["top", "bottom"]}>
        <Card variant="hero" tint={win ? "primary" : "accent"} className="p-6 items-center gap-4">
          <Animated.View entering={reduce ? undefined : ZoomIn.springify().damping(12)} className="items-center gap-1">
            <Txt variant="overline" tone={win ? "primary" : "accent"}>{r.isBot ? "Practice match" : isGuest ? "Guest match" : "Ranked match"}</Txt>
            <Txt variant="display" style={{ fontSize: 40, lineHeight: 46 }} accessibilityRole="header">{headline}</Txt>
            <Txt variant="body" tone="muted">{sub}</Txt>
          </Animated.View>
          <View className="flex-row items-center w-full">
            <View className="flex-1 items-center gap-2">
              <Avatar id={me?.avatarId ?? "ada"} size={64} league={mine.leagueAfter} frameId={me?.frameId || null} />
              <Txt variant="label" tone="muted" numberOfLines={1}>You</Txt>
              <AnimatedNumber value={mine.score} variant="h1" duration={1100} />
            </View>
            <Txt variant="h2" tone="faint">–</Txt>
            <View className="flex-1 items-center gap-2">
              <Avatar id={opp?.avatarId ?? "musa"} size={64} league={opp?.league} />
              <View className="flex-row items-center gap-1">
                {r.isBot ? <Icon as={Bot} size={14} tone="faint" /> : null}
                <Txt variant="label" tone="muted" numberOfLines={1}>{opp?.username}</Txt>
              </View>
              <AnimatedNumber value={opp?.score ?? 0} variant="h1" duration={1100} />
            </View>
          </View>
          {r.isBot ? <Chip label="Practice opponent · half rating & state points" icon={Bot} /> : null}
          {mine.shieldSaved ? <Chip label="Shield saved your rating" tone="primary" /> : null}
        </Card>

        <Animated.View entering={reduce ? undefined : FadeInDown.delay(150).duration(260)} className="flex-row gap-2.5 mt-4">
          <Reward icon={<CoinIcon size={22} />} label="Coins" value={mine.coins} tone="accent" delay={300} />
          <Reward icon={<Icon as={Sparkles} tone="primary" />} label="XP" value={mine.xp} tone="primary" delay={450} />
          {!isGuest ? (
            <Reward
              icon={<Icon as={mine.ratingDelta >= 0 ? TrendingUp : TrendingDown} tone={mine.ratingDelta >= 0 ? "primary" : "danger"} />}
              label="Rating"
              value={mine.ratingDelta}
              tone={mine.ratingDelta >= 0 ? "primary" : "danger"}
              delay={600}
            />
          ) : null}
          {!isGuest ? <Reward icon={<Icon as={MapPin} tone="accent" />} label={stateByCode(me?.stateCode)?.code ?? "State"} value={mine.statePoints} tone="accent" delay={750} /> : null}
        </Animated.View>

        {!isGuest ? (
          <Card className="p-4 mt-4 flex-row items-center gap-4">
            <LeagueBadge league={mine.leagueAfter} size={48} />
            <View className="flex-1 gap-2">
              <View className="flex-row justify-between">
                <Txt variant="bodyStrong">{promoted ? `Promoted to ${leagueAfter.name}! 🎉` : leagueAfter.name}</Txt>
                <Txt variant="label" tone="muted" tabular>{mine.ratingAfter}</Txt>
              </View>
              <ProgressBar value={leagueProgress(mine.ratingAfter)} delay={500} label="League progress" />
              {mine.levelAfter > mine.levelBefore ? <Txt variant="caption" tone="primary">Level up! You're now level {mine.levelAfter}.</Txt> : null}
            </View>
          </Card>
        ) : (
          <Card className="p-4 mt-4 flex-row items-center gap-3" onPress={() => router.push("/onboarding/sign-in")} accessibilityLabel="Sign in to keep playing">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft"><Icon as={UserPlus} tone="primary" /></View>
            <View className="flex-1">
              <Txt variant="bodyStrong">That was your free match</Txt>
              <Txt variant="caption" tone="muted">Sign in to keep these coins, get a rating and rep your state.</Txt>
            </View>
          </Card>
        )}

        <Txt variant="h3" className="mt-6 mb-3">Question by question</Txt>
        <Card className="px-4 overflow-hidden">
          <AdirePattern id="result-pattern" />
          {r.rounds.map((rd, i) => {
            const a = rd.answers[myId!];
            const b = rd.answers[oppId];
            return (
              <View key={rd.round} className={cn("flex-row items-center gap-3 py-3", i > 0 && "border-t border-line")} accessibilityLabel={`Question ${rd.round}: ${rd.text}. Answer ${rd.correctText}. You ${a?.points ?? 0}, opponent ${b?.points ?? 0}`}>
                <View className={cn("h-8 w-8 items-center justify-center rounded-full", a?.correct ? "bg-primary" : a?.optionId ? "bg-danger" : "bg-raised")}>
                  <Icon as={a?.correct ? Check : a?.optionId ? X : Minus} size={16} tone={a?.correct ? "ink" : a?.optionId ? "white" : "faint"} />
                </View>
                <View className="flex-1">
                  <Txt variant="caption" tone="faint">{rd.round === 7 ? "Q7 · Double Wahala" : `Q${rd.round}`} · {categoryBySlug(rd.category)?.short}</Txt>
                  <Txt variant="label" numberOfLines={2}>{rd.text}</Txt>
                  <Txt variant="caption" tone="primary" numberOfLines={1}>✓ {rd.correctText}</Txt>
                </View>
                <View className="items-end w-14">
                  <Txt variant="bodyStrong" tabular tone={a?.points ? "default" : "faint"}>{a?.points ?? 0}</Txt>
                  <Txt variant="caption" tone="faint" tabular>{b?.points ?? 0}</Txt>
                </View>
                <IconButton icon={Flag} label={`Report question ${rd.round}`} tone="muted" className="h-9 w-9" onPress={() => setReport({ id: rd.questionId, text: rd.text })} />
              </View>
            );
          })}
        </Card>

        <View className="gap-3 mt-6">
          {oppWants ? <Txt variant="label" tone="primary" className="text-center">{opp?.username} wants a rematch!</Txt> : null}
          {s.rematch.opponentLeft && !r.isBot ? <Txt variant="caption" tone="muted" className="text-center">{opp?.username} left — rematch will find you a new opponent.</Txt> : null}
          {!isGuest ? (
            <Button
              label={waitingOpp ? `Waiting for ${opp?.username}…` : s.rematch.opponentLeft && !r.isBot ? "Find new match" : "Rematch"}
              icon={RotateCcw}
              size="lg"
              full
              loading={busy === "rematch" && !waitingOpp && !s.rematch.opponentLeft}
              disabled={waitingOpp}
              onPress={rematch}
            />
          ) : (
            <Button label="Sign in to keep playing" icon={UserPlus} size="lg" full onPress={() => router.push("/onboarding/sign-in")} />
          )}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Share"
                icon={Share2}
                variant="secondary"
                full
                loading={busy === "share"}
                onPress={async () => {
                  setBusy("share");
                  try {
                    await shareMatch(r.matchId, win);
                  } catch (e: any) {
                    toast.error("Couldn't share", e.message);
                  } finally {
                    setBusy(null);
                  }
                }}
              />
            </View>
            <View className="flex-1">
              <Button label="Home" icon={HomeIcon} variant="secondary" full loading={busy === "home"} onPress={goHome} />
            </View>
          </View>
        </View>
      </Screen>
      {win || promoted ? <Confetti /> : null}
      <ReportSheet open={!!report} onClose={() => setReport(null)} questionId={report?.id ?? null} questionText={report?.text} matchId={r.matchId} />
    </View>
  );
}
