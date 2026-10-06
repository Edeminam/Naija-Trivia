import { useCallback, useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Lightbulb, Flag } from "lucide-react-native";
import { categoryBySlug, REVEAL_MS, type SoloQuestion, type SoloAnswerResult } from "@ntc/shared";
import { Txt, Card, CircularTimer, AnswerButton, type AnswerState, Icon, IconButton, ErrorState, ProgressBar, AnimatedNumber } from "../../ui";
import { CategoryIcon } from "../match/BanStage";
import { ReportSheet } from "../report/ReportSheet";
import { haptic } from "../../lib/haptics";
import { sfx } from "../../lib/sound";
import { useReducedMotion } from "../../lib/motion";
import { ApiError } from "../../lib/api";

const LETTERS = ["A", "B", "C", "D"];

export interface SoloApi {
  next: () => Promise<{ question: SoloQuestion | null; timedOut: SoloAnswerResult | null; finished: boolean }>;
  answer: (index: number, optionId: string | null) => Promise<SoloAnswerResult & { rewards?: any }>;
}

/**
 * Server-timed solo play (Daily Naija + Friend Challenge). The server stamps when each question was
 * served and validates the answer time; the client only renders the countdown.
 */
export function SoloPlayer({ api, title, onFinished }: { api: SoloApi; title: string; onFinished: (last: (SoloAnswerResult & { rewards?: any }) | null) => void }) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState<(SoloQuestion & { localDeadline: number }) | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<SoloAnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [report, setReport] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await api.next();
      if (r.finished || !r.question) return onFinished(r.timedOut);
      const offset = r.question.serverNow - Date.now();
      setQ({ ...r.question, localDeadline: r.question.deadlineAt - offset });
      setPicked(null);
      setResult(null);
      if (r.timedOut) setScore(r.timedOut.totalScore);
    } catch (e) {
      setError(e as ApiError);
    }
  }, [api, onFinished]);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (optionId: string | null) => {
    if (!q || busy.current || result) return;
    busy.current = true;
    setPicked(optionId);
    if (optionId) {
      haptic.tap();
      sfx.play("tap");
    }
    try {
      const r = await api.answer(q.index, optionId);
      setResult(r);
      setScore(r.totalScore);
      if (r.correct) {
        haptic.success();
        sfx.play("correct");
      } else {
        haptic.error();
        sfx.play("wrong");
      }
      setTimeout(() => {
        busy.current = false;
        if (r.done) onFinished(r);
        else void load();
      }, REVEAL_MS + 700);
    } catch (e) {
      busy.current = false;
      // The question moved on server-side (e.g. reload) → just fetch the current one.
      if ((e as ApiError).status === 409) return void load();
      setError(e as ApiError);
    }
  };

  if (error) return <ErrorState offline={error.offline} body={error.offline ? undefined : error.message} onRetry={load} />;
  if (!q)
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );

  const cat = categoryBySlug(q.category);
  const stateFor = (id: string): AnswerState => {
    if (result) return id === result.correctOptionId ? "correct" : id === picked ? "wrong" : "disabled";
    if (picked) return id === picked ? "selected" : "disabled";
    return "idle";
  };

  return (
    <View className="flex-1 justify-between gap-4">
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Txt variant="overline" tone="faint">{title} · {q.index + 1}/{q.total}</Txt>
          <View className="flex-row items-baseline gap-1">
            <AnimatedNumber value={score} variant="h3" />
            <Txt variant="caption" tone="faint">pts</Txt>
          </View>
        </View>
        <ProgressBar value={(q.index + (result ? 1 : 0)) / q.total} height={5} label="Progress" />
      </View>
      <Animated.View key={q.questionId} entering={reduce ? undefined : FadeInDown.duration(240)}>
        <Card className="p-5 gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 rounded-chip bg-raised px-3 h-8">
              <CategoryIcon slug={q.category} size={15} />
              <Txt variant="label" tone="muted">{cat?.name}</Txt>
            </View>
            {result ? (
              <IconButton icon={Flag} label="Report this question" tone="muted" onPress={() => setReport(true)} />
            ) : (
              <CircularTimer deadline={q.localDeadline} duration={q.durationMs} size={56} paused={!!picked} onExpire={() => !picked && submit(null)} />
            )}
          </View>
          <Txt variant="h2" accessibilityRole="header">{q.text}</Txt>
        </Card>
      </Animated.View>
      <View className="gap-3">
        {result ? (
          <Animated.View entering={reduce ? undefined : FadeInUp.duration(220)} className="flex-row items-start gap-3 rounded-2xl bg-accent-soft p-3.5" accessibilityLiveRegion="polite">
            <Icon as={Lightbulb} size={18} tone="accent" />
            <View className="flex-1">
              <Txt variant="bodyStrong" tone={result.correct ? "primary" : "danger"}>{result.correct ? `Correct! +${result.points}` : picked ? "Not this time" : "Time up"}</Txt>
              <Txt variant="caption" className="mt-0.5"><Txt variant="caption" tone="accent">Did you know? </Txt>{result.fact}</Txt>
            </View>
          </Animated.View>
        ) : (
          <Txt variant="caption" tone="muted">{picked ? "Checking…" : "Tap your answer"}</Txt>
        )}
        <View className="gap-2.5">
          {q.options.map((o, i) => (
            <AnswerButton key={o.id} letter={LETTERS[i]!} text={o.text} state={stateFor(o.id)} mine={o.id === picked} onPress={() => submit(o.id)} />
          ))}
        </View>
      </View>
      <ReportSheet open={report} onClose={() => setReport(false)} questionId={q.questionId} questionText={q.text} />
    </View>
  );
}
