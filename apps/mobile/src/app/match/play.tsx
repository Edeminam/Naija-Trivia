import { useEffect, useState } from "react";
import { View, BackHandler, ActivityIndicator, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { X, WifiOff } from "lucide-react-native";
import { Txt, Button, IconButton, Modal, Card, Icon, ErrorState, toast } from "../../ui";
import { useMatch, match } from "../../features/match/store";
import { Arena } from "../../features/match/Arena";
import { SearchStatus } from "../../features/match/SearchStage";
import { BanStage, ReadyStage } from "../../features/match/BanStage";
import { RoundIntro, DoubleWahalaIntro } from "../../features/match/Intro";
import { QuestionStage } from "../../features/match/QuestionStage";
import { useMe } from "../../features/me";
import { useTheme } from "../../theme/ThemeProvider";
import { SCREEN_PADDING } from "../../theme/tokens";

function ConnectionBanner() {
  const reconnecting = useMatch((s) => s.reconnecting);
  if (!reconnecting) return null;
  return (
    <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutUp.duration(150)} className="absolute left-0 right-0 items-center z-10" style={{ top: 4 }} accessibilityLiveRegion="assertive">
      <View className="flex-row items-center gap-2 rounded-chip bg-accent px-4 h-9">
        <ActivityIndicator size="small" color="#03140B" />
        <Txt variant="label" tone="ink">Reconnecting… your seat is held for 20s</Txt>
      </View>
    </Animated.View>
  );
}

export default function Play() {
  const { mode, rematch } = useLocalSearchParams<{ mode?: "ranked" | "guest"; rematch?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const me = useMe();
  const s = useMatch();
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    // A rematch arrives with its room already joined; otherwise start searching.
    if (!rematch) void match.search(mode === "guest" ? "guest" : "ranked");
    return () => {
      // Keep the finished match alive for the result screen.
      if (useMatch.getState().stage !== "result") void match.reset();
    };
  }, [mode, rematch]);

  // Result arrives → dedicated result screen.
  useEffect(() => {
    if (s.stage === "result" && s.result) router.replace("/match/result");
  }, [s.stage, s.result]);

  useEffect(() => {
    if (s.error && s.stage !== "error") {
      toast.error(s.error);
      match.clearError();
    }
  }, [s.error, s.stage]);

  const inGame = ["banning", "ready", "intro", "question", "reveal"].includes(s.stage);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (inGame) setConfirmLeave(true);
      else void leave();
      return true;
    });
    return () => sub.remove();
  }, [inGame]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = async () => {
    setConfirmLeave(false);
    await match.reset();
    router.canGoBack() ? router.back() : router.replace("/home");
  };

  const myId = s.me;
  const fallbackMe = me.data?.profile;
  const mine = (myId && s.players[myId]) || (fallbackMe ? { id: fallbackMe.id, username: fallbackMe.username, avatarId: fallbackMe.avatarId, stateCode: fallbackMe.stateCode, rating: fallbackMe.rating, league: fallbackMe.league, level: fallbackMe.level, frameId: fallbackMe.frameId ?? "", isBot: false, score: 0, answered: false, connected: true, banned: "", powerUpUsed: false } : null);
  const opp = Object.values(s.players).find((p) => p.id !== (myId ?? fallbackMe?.id)) ?? null;
  const compact = ["banning", "ready", "intro", "question", "reveal"].includes(s.stage);
  const gain = s.stage === "reveal" && myId ? (s.reveal?.answers[myId]?.points ?? null) : null;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }}>
      <View className="flex-1 w-full max-w-[560px] self-center" style={{ paddingHorizontal: SCREEN_PADDING }}>
        <View className="flex-row items-center justify-between h-12">
          <IconButton icon={X} label={inGame ? "Leave match" : "Cancel search"} onPress={() => (inGame ? setConfirmLeave(true) : leave())} />
          <Txt variant="overline" tone="faint">{s.mode === "guest" ? "Guest match" : s.isBot && compact ? "Practice" : "Ranked"}</Txt>
          <View className="w-11" />
        </View>
        <ConnectionBanner />

        {s.stage === "error" ? (
          <View className="flex-1 justify-center">
            <ErrorState title="Match didn't start" body={s.error ?? undefined} onRetry={() => match.search(s.mode)} />
            <Button label="Back home" variant="ghost" full onPress={leave} />
          </View>
        ) : (
          <>
            <Arena me={mine} opp={opp} compact={compact} round={s.round || 1} total={s.total} double={s.round === 7} gainMe={gain} />
            {s.connectionLost ? (
              <Card className="p-4 mt-3 flex-row items-center gap-3 border-danger">
                <Icon as={WifiOff} tone="danger" />
                <View className="flex-1">
                  <Txt variant="bodyStrong">Connection lost</Txt>
                  <Txt variant="caption" tone="muted">Missed questions count as timeouts. Your result is still saved.</Txt>
                </View>
                <Button label="Home" size="sm" variant="secondary" onPress={leave} />
              </Card>
            ) : null}
            <View className="flex-1">
              {s.stage === "searching" || s.stage === "found" || s.stage === "idle" ? (
                <View className="flex-1 justify-end pb-6 gap-6">
                  <SearchStatus />
                  {s.stage !== "found" ? <Button label="Cancel" variant="secondary" full onPress={leave} /> : <ActivityIndicator color={c.primary} />}
                </View>
              ) : s.stage === "banning" ? (
                <BanStage />
              ) : s.stage === "ready" ? (
                <ReadyStage />
              ) : s.stage === "intro" ? (
                s.doubleIntro ? <DoubleWahalaIntro /> : <RoundIntro round={s.round} total={s.total} />
              ) : s.stage === "question" || s.stage === "reveal" ? (
                <QuestionStage />
              ) : (
                <View className="flex-1 items-center justify-center gap-3">
                  <ActivityIndicator color={c.primary} />
                  <Txt variant="body" tone="muted">Tallying scores…</Txt>
                </View>
              )}
            </View>
          </>
        )}
      </View>
      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave this match?"
        body="Remaining questions count as timeouts, so you'll likely lose rating."
        confirmLabel="Leave match"
        destructive
        onConfirm={leave}
        cancelLabel="Keep playing"
      />
    </View>
  );
}
