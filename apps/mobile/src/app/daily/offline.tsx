import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { X, WifiOff, CloudUpload, Check, Lock, Play } from "lucide-react-native";
import { categoryBySlug, lagosDate } from "@ntc/shared";
import { Txt, Card, Button, IconButton, Icon, ProgressBar, AnswerButton, EmptyState, CoinIcon } from "../../ui";
import { CategoryIcon } from "../../features/match/BanStage";
import { useOfflineDaily, resumeOfflineRun, markQuestionShown, recordOfflineAnswer, syncOfflineDaily, clearOfflineResult } from "../../features/daily/offline";
import { useOnline } from "../../lib/useNetwork";
import { haptic } from "../../lib/haptics";
import { useReducedMotion } from "../../lib/motion";
import { SCREEN_PADDING } from "../../theme/tokens";
import { cn } from "../../lib/cn";

const LETTERS = ["A", "B", "C", "D"];
const LOCK_MS = 450;

function Timer({ shownAt, durationMs, onExpire }: { shownAt: number; durationMs: number; onExpire: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, shownAt + durationMs - Date.now()));
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    let fired = false;
    const id = setInterval(() => {
      const l = Math.max(0, shownAt + durationMs - Date.now());
      setLeft(l);
      if (l === 0 && !fired) {
        fired = true;
        expire.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [shownAt, durationMs]);
  return (
    <View className="gap-1.5">
      <ProgressBar value={left / durationMs} tone={left < 3000 ? "danger" : "accent"} height={6} label={`${Math.ceil(left / 1000)} seconds left`} />
      <Txt variant="caption" tone="faint" tabular>{Math.ceil(left / 1000)}s</Txt>
    </View>
  );
}

/** Daily Naija without a connection: answers are locked in on the phone and scored when you're back online. */
export default function OfflineDaily() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const online = useOnline();
  const { pack, run, result, syncing, syncError, hydrated } = useOfflineDaily();
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);

  // Resuming after the app was closed mid-question counts that question as unanswered.
  useEffect(() => {
    if (hydrated && run && !run.finished && run.answers.length > 0) {
      void resumeOfflineRun().then(() => setStarted(true));
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = pack && run && !run.finished ? pack.questions[run.current] : null;
  useEffect(() => {
    if (started && q && run?.shownAt === null) void markQuestionShown();
  }, [started, q, run?.shownAt]);

  // Try to submit as soon as we're online with a finished run.
  useEffect(() => {
    if (online && run?.finished) void syncOfflineDaily();
  }, [online, run?.finished]);

  const answer = async (optionId: string | null) => {
    if (locked !== null || !q) return;
    setLocked(optionId ?? "timeout");
    if (optionId) haptic.tap();
    await new Promise((r) => setTimeout(r, LOCK_MS));
    await recordOfflineAnswer(optionId);
    setLocked(null);
  };

  const body = (() => {
    if (!hydrated) return null;

    // Scored result (shown once, after syncing).
    if (result && !pack) {
      return (
        <Animated.View entering={reduce ? undefined : FadeIn} className="gap-4">
          <Card variant="hero" tint="accent" className="p-5 gap-3 items-center">
            <Txt variant="overline" tone="accent">Offline Daily scored</Txt>
            <Txt variant="display" tabular>{result.score.toLocaleString("en-NG")}</Txt>
            <Txt variant="body" tone="muted">{result.correct}/10 right · no speed bonus offline</Txt>
            <View className="flex-row items-center gap-2"><CoinIcon size={18} /><Txt variant="bodyStrong">+{result.rewards.coins} coins</Txt></View>
            {result.rewards.streak.advanced ? <Txt variant="caption" tone="muted">{result.rewards.streak.current}-day streak 🔥</Txt> : null}
          </Card>
          <Card className="px-4">
            {result.results.map((r, i) => (
              <View key={r.index} className={cn("flex-row items-center gap-3 py-3", i > 0 && "border-t border-line")}>
                <View className={cn("h-7 w-7 items-center justify-center rounded-full", r.correct ? "bg-primary" : "bg-danger")}>
                  <Icon as={r.correct ? Check : X} size={14} tone={r.correct ? "ink" : "white"} />
                </View>
                <View className="flex-1">
                  <Txt variant="label" numberOfLines={2}>{r.text ?? `Question ${r.index + 1}`}</Txt>
                  {r.correctText ? <Txt variant="caption" tone="primary" numberOfLines={1}>✓ {r.correctText}</Txt> : null}
                </View>
                <Txt variant="label" tabular>{r.points}</Txt>
              </View>
            ))}
          </Card>
          <Button label="Done" size="lg" full onPress={() => { void clearOfflineResult(); router.replace("/daily"); }} />
        </Animated.View>
      );
    }

    if (!pack || !run) {
      return <EmptyState icon={WifiOff} title="No offline Daily saved" body="While you're online, open Daily Naija and tap “Save for offline”." actionLabel="Back" onAction={() => router.back()} />;
    }

    // Finished: waiting to sync.
    if (run.finished) {
      return (
        <Card variant="hero" tint="accent" className="p-5 gap-3 items-center">
          <Icon as={CloudUpload} size={36} tone="accent" />
          <Txt variant="h2" className="text-center">All 10 answers locked in</Txt>
          <Txt variant="body" tone="muted" className="text-center">
            {syncing ? "Scoring your run…" : online ? "Sending your answers…" : "We'll score them as soon as you're back online. Just keep the app installed."}
          </Txt>
          {syncError ? <Txt variant="caption" tone="danger" className="text-center">{syncError}</Txt> : null}
          {online && !syncing ? <Button label="Try again" variant="secondary" onPress={() => void syncOfflineDaily()} /> : null}
          <Button label="Home" variant="ghost" onPress={() => router.replace("/home")} />
        </Card>
      );
    }

    // Intro before the first question.
    if (!started) {
      const stale = pack.date !== lagosDate();
      return (
        <Card variant="hero" tint="accent" className="p-5 gap-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft"><Icon as={WifiOff} size={24} tone="accent" /></View>
            <View className="flex-1">
              <Txt variant="overline" tone="accent">Offline Daily · {new Date(`${pack.date}T12:00:00Z`).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" })}</Txt>
              <Txt variant="h2">Ready when you are</Txt>
            </View>
          </View>
          <View className="gap-2">
            {[
              "10 questions, 10 seconds each — no connection needed.",
              "Your answers are locked in. You'll see what you got right once you're back online.",
              "Correct answers score 100 points; the speed bonus needs a connection.",
              "Closing the app mid-question counts that question as unanswered.",
            ].map((t) => (
              <View key={t} className="flex-row gap-2"><Icon as={Lock} size={14} tone="muted" /><Txt variant="caption" tone="muted" className="flex-1">{t}</Txt></View>
            ))}
          </View>
          {stale ? <Txt variant="caption" tone="danger">This set was for an earlier day. You can still play it and submit within two days.</Txt> : null}
          <Button label={run.answers.length ? `Resume · question ${run.current + 1}` : "Start"} icon={Play} size="lg" full variant="accent" onPress={() => setStarted(true)} />
        </Card>
      );
    }

    if (!q || run.shownAt === null) return null;
    const cat = categoryBySlug(q.category);
    return (
      <Animated.View key={q.index} entering={reduce ? undefined : FadeInDown.duration(220)} className="flex-1 gap-4">
        <Timer shownAt={run.shownAt} durationMs={pack.durationMs} onExpire={() => void answer(null)} />
        <Card className="p-5 gap-3">
          <View className="flex-row items-center gap-2">
            <CategoryIcon slug={q.category} size={16} />
            <Txt variant="caption" tone="muted">{cat?.name}</Txt>
          </View>
          <Txt variant="h2">{q.text}</Txt>
        </Card>
        <View className="gap-3">
          {q.options.map((o, i) => (
            <AnswerButton
              key={o.id}
              letter={LETTERS[i]!}
              text={o.text}
              state={locked === null ? "idle" : locked === o.id ? "selected" : "disabled"}
              onPress={() => void answer(o.id)}
            />
          ))}
        </View>
        {locked !== null ? <Txt variant="caption" tone="muted" className="text-center">{locked === "timeout" ? "Time's up" : "Locked in"}</Txt> : null}
      </Animated.View>
    );
  })();

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }}>
      <View className="flex-1 w-full max-w-[560px] self-center gap-3" style={{ paddingHorizontal: SCREEN_PADDING }}>
        <View className="flex-row items-center justify-between h-12">
          <IconButton icon={X} label="Leave" onPress={() => router.back()} />
          <Txt variant="overline" tone="accent">{run && !run.finished && started ? `Offline · ${run.current + 1}/${pack?.questions.length ?? 10}` : "Daily Naija · offline"}</Txt>
          <View className="w-11" />
        </View>
        {body}
      </View>
    </View>
  );
}
