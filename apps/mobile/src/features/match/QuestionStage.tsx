import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { Zap, Flag, Lightbulb, Shield } from "lucide-react-native";
import { categoryBySlug, POWER_UPS, COSMETICS } from "@ntc/shared";
import { Txt, Card, CircularTimer, AnswerButton, type AnswerState, PressableScale, Icon, IconButton } from "../../ui";
import { useMatch, match } from "./store";
import { CategoryIcon } from "./BanStage";
import { PowerUpSheet } from "./PowerUpSheet";
import { ReportSheet } from "../report/ReportSheet";
import { useReducedMotion } from "../../lib/motion";
import { useMe } from "../me";

const LETTERS = ["A", "B", "C", "D"];

export function QuestionStage() {
  const s = useMatch();
  const me = useMe();
  const reduce = useReducedMotion();
  const [sheet, setSheet] = useState(false);
  const [report, setReport] = useState(false);
  const q = s.question;
  if (!q) return null;
  const reveal = s.stage === "reveal" && s.reveal?.questionId === q.questionId ? s.reveal : null;
  const myId = s.me!;
  const oppId = Object.keys(s.players).find((id) => id !== myId);
  const opp = oppId ? s.players[oppId] : undefined;
  const mine = s.players[myId];
  const myPick = reveal ? (reveal.answers[myId]?.optionId ?? null) : s.myAnswer;
  const oppPick = reveal && oppId ? reveal.answers[oppId]?.optionId : null;
  const cat = categoryBySlug(q.category);
  const hidden = new Set(s.powerUp?.removeOptionIds ?? q.hidden ?? []);
  const crowd = s.powerUp?.kind === "crowd" ? s.powerUp.distribution : undefined;
  const theme = COSMETICS.find((c) => c.id === me.data?.profile.buttonThemeId)?.colors ?? null;

  const stateFor = (id: string): AnswerState => {
    if (reveal) {
      if (id === reveal.correctOptionId) return "correct";
      if (id === myPick || id === oppPick) return "wrong";
      return "disabled";
    }
    if (s.myAnswer) return id === s.myAnswer ? "selected" : "disabled";
    return "idle";
  };

  const usedPowerUp = mine?.powerUpUsed;
  const usedKind = s.powerUp?.kind;
  const myPoints = reveal?.answers[myId]?.points ?? 0;

  return (
    <View className="flex-1 justify-between gap-4 pt-2">
      <Animated.View key={q.questionId} entering={reduce ? undefined : FadeInDown.duration(240)}>
        <Card className="p-5 gap-4" accessible accessibilityLabel={`${cat?.name}. ${q.text}`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 rounded-chip bg-raised px-3 h-8">
              <CategoryIcon slug={q.category} size={15} />
              <Txt variant="label" tone="muted">{cat?.name}</Txt>
            </View>
            {reveal ? (
              <IconButton icon={Flag} label="Report this question" onPress={() => setReport(true)} tone="muted" />
            ) : (
              <CircularTimer deadline={q.localDeadline} duration={q.durationMs} size={56} paused={!!s.myAnswer} />
            )}
          </View>
          <Txt variant="h2" accessibilityRole="header" maxFontSizeMultiplier={1.4}>{q.text}</Txt>
          {q.doubleWahala ? <Txt variant="overline" tone="accent">Double Wahala · points x2</Txt> : null}
        </Card>
      </Animated.View>

      <View className="gap-3">
        {reveal ? (
          <Animated.View entering={reduce ? undefined : FadeInUp.duration(220)} className="flex-row items-start gap-3 rounded-2xl bg-accent-soft p-3.5" accessibilityLiveRegion="polite">
            <Icon as={Lightbulb} size={18} tone="accent" />
            <View className="flex-1">
              <Txt variant="bodyStrong" tone={myPoints > 0 ? "primary" : "danger"}>
                {myPoints > 0 ? `Correct! +${myPoints}` : reveal.answers[myId]?.optionId ? "Not this time" : "Time up"}
              </Txt>
              <Txt variant="caption" className="mt-0.5">
                <Txt variant="caption" tone="accent">Did you know? </Txt>
                {reveal.fact}
              </Txt>
            </View>
          </Animated.View>
        ) : (
          <View className="flex-row items-center justify-between min-h-[40px]">
            <Txt variant="caption" tone="muted" accessibilityLiveRegion="polite">
              {s.myAnswer ? (opp?.answered ? `${opp.username} has answered too` : `Locked in · waiting for ${opp?.username ?? "opponent"}`) : opp?.answered ? `${opp.username} has answered!` : "Tap your answer"}
            </Txt>
            {usedPowerUp ? (
              <View className="flex-row items-center gap-1.5 rounded-chip bg-primary-soft px-3 h-9">
                <Icon as={usedKind === "shield" ? Shield : Zap} size={14} tone="primary" />
                <Txt variant="label" tone="primary">{POWER_UPS.find((p) => p.kind === usedKind)?.name ?? "Used"}</Txt>
              </View>
            ) : (
              <PressableScale
                disabled={!!s.myAnswer || !!s.powerUpPending}
                onPress={() => setSheet(true)}
                accessibilityRole="button"
                accessibilityLabel="Use a power-up"
                className="flex-row items-center gap-1.5 rounded-chip border border-line bg-raised px-3.5 h-10"
              >
                <Icon as={Zap} size={16} tone="accent" />
                <Txt variant="label" tone="accent">{s.powerUpPending ? "Using…" : "Power-up"}</Txt>
              </PressableScale>
            )}
          </View>
        )}
        <View className="gap-2.5">
          {q.options.map((o, i) => (
            <Animated.View key={o.id} entering={reduce ? undefined : FadeIn.delay(60 + i * 40).duration(180)}>
              <AnswerButton
                letter={LETTERS[i]!}
                text={o.text}
                state={stateFor(o.id)}
                hidden={!reveal && hidden.has(o.id)}
                mine={o.id === myPick}
                opponentAvatarId={oppPick === o.id ? opp?.avatarId : null}
                crowd={crowd && !reveal ? (crowd[o.id] ?? 0) : null}
                themeColors={theme}
                onPress={() => match.answer(o.id)}
              />
            </Animated.View>
          ))}
        </View>
      </View>
      <PowerUpSheet open={sheet} onClose={() => setSheet(false)} onPick={(k) => match.powerUp(k)} />
      <ReportSheet open={report} onClose={() => setReport(false)} questionId={q.questionId} questionText={q.text} />
    </View>
  );
}
