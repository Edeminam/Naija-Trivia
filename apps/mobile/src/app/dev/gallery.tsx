import { useState } from "react";
import { View } from "react-native";
import { Trophy, Zap, Swords, Inbox, Flame, Moon, Sun } from "lucide-react-native";
import { AVATARS, LEAGUES } from "@ntc/shared";
import {
  Screen, SectionTitle, Txt, Button, IconButton, Card, Chip, ProgressBar, Skeleton, SkeletonCard, SkeletonRow, EmptyState, ErrorState,
  Avatar, LeagueBadge, CoinCounter, CircularTimer, AnswerButton, ScoreBar, BottomSheet, Modal, toast, AnimatedNumber,
} from "../../ui";
import { usePrefs } from "../../stores/prefs";
import { useTheme } from "../../theme/ThemeProvider";

/** Storybook-style gallery of every design-system component (route: /dev/gallery). */
export default function Gallery() {
  const [sheet, setSheet] = useState(false);
  const [modal, setModal] = useState(false);
  const [coins, setCoins] = useState(1250);
  const [deadline, setDeadline] = useState(() => Date.now() + 10_000);
  const { name } = useTheme();
  const setPrefs = usePrefs((s) => s.set);
  return (
    <Screen title="Design system" back right={<IconButton icon={name === "dark" ? Sun : Moon} label="Toggle theme" onPress={() => setPrefs({ theme: name === "dark" ? "light" : "dark" })} />}>
      <SectionTitle title="Type" />
      <Card className="p-5 gap-2">
        <Txt variant="display">Display 34</Txt>
        <Txt variant="h1">Heading 28</Txt>
        <Txt variant="h2">Heading 22</Txt>
        <Txt variant="title">Title 17</Txt>
        <Txt variant="body">Body 15 — Who sang 'African Queen'?</Txt>
        <Txt variant="caption" tone="muted">Caption 13 muted</Txt>
        <Txt variant="overline" tone="faint">Overline</Txt>
        <AnimatedNumber value={coins} variant="h1" tone="accent" />
      </Card>

      <SectionTitle title="Buttons" />
      <View className="gap-3">
        <Button label="Play Clash" icon={Swords} size="lg" full />
        <Button label="Challenge a Friend" variant="secondary" full />
        <View className="flex-row gap-3">
          <Button label="Ghost" variant="ghost" />
          <Button label="Delete" variant="destructive" />
          <Button label="Loading" loading />
        </View>
        <Button label="Disabled" disabled full />
      </View>

      <SectionTitle title="Chips & badges" />
      <View className="flex-row flex-wrap gap-2">
        <Chip label="Lagos is #3 this week" icon={Trophy} tone="accent" />
        <Chip label="Nollywood" selected onPress={() => {}} />
        <Chip label="Football" onPress={() => {}} />
        <Chip label="Streak 7" icon={Flame} tone="danger" />
        <CoinCounter value={coins} />
        <CoinCounter value={coins} size="sm" />
      </View>
      <View className="flex-row flex-wrap gap-4 mt-4">
        {LEAGUES.map((l) => (
          <LeagueBadge key={l.id} league={l.id} size={52} showName />
        ))}
      </View>

      <SectionTitle title="Avatars" />
      <View className="flex-row flex-wrap gap-4">
        {AVATARS.map((a, i) => (
          <Avatar key={a.id} id={a.id} size={64} league={LEAGUES[i % LEAGUES.length]!.id} stateCode={i === 0 ? "LA" : i === 3 ? "EN" : undefined} />
        ))}
        <Avatar id="ada" size={64} frameId="frame_ankara" />
      </View>

      <SectionTitle title="Progress & timer" />
      <Card className="p-5 gap-4">
        <ProgressBar value={0.62} label="League progress" />
        <ProgressBar value={0.3} tone="accent" />
        <View className="flex-row flex-wrap items-center gap-4">
          <CircularTimer deadline={deadline} duration={10_000} />
          <Button label="Restart timer" variant="secondary" size="sm" onPress={() => setDeadline(Date.now() + 10_000)} />
          <Button label="+250 coins" variant="secondary" size="sm" onPress={() => setCoins((c) => c + 250)} />
        </View>
      </Card>

      <SectionTitle title="Score bar" />
      <Card className="p-4">
        <ScoreBar me={{ username: "you", avatarId: "ada", league: "sharp", score: 742, answered: true }} opponent={{ username: "Kunle_Bot", avatarId: "tunde", league: "learner", score: 610, connected: false }} round={4} total={7} />
      </Card>

      <SectionTitle title="Answer buttons" />
      <View className="gap-2.5">
        <AnswerButton letter="A" text="2Baba" state="correct" mine />
        <AnswerButton letter="B" text="D'banj" state="wrong" opponentAvatarId="tunde" />
        <AnswerButton letter="C" text="Wande Coal" state="idle" onPress={() => {}} crowd={18} />
        <AnswerButton letter="D" text="Timaya" state="selected" />
        <AnswerButton letter="D" text="Removed by 50/50" state="idle" hidden />
        <AnswerButton letter="D" text="Disabled" state="disabled" />
      </View>

      <SectionTitle title="Cards" />
      <Card variant="hero" className="p-5 gap-2">
        <Txt variant="overline" tone="primary">Hero card</Txt>
        <Txt variant="h2">Adire pattern lives here</Txt>
        <Txt variant="body" tone="muted">Only on hero cards and result screens.</Txt>
      </Card>
      <Card variant="hero" tint="accent" className="p-5 gap-2 mt-3">
        <Txt variant="overline" tone="accent">Gold hero</Txt>
        <Txt variant="h2">Daily Naija</Txt>
      </Card>

      <SectionTitle title="Loading" />
      <View className="gap-3">
        <SkeletonCard lines={3} />
        <SkeletonRow />
        <Skeleton h={48} r={14} />
      </View>

      <SectionTitle title="Empty & error" />
      <Card>
        <EmptyState icon={Inbox} title="No matches yet" body="Play your first clash and your history will show here." actionLabel="Play now" onAction={() => {}} />
      </Card>
      <Card className="mt-3">
        <ErrorState onRetry={() => toast.info("Retrying…")} />
      </Card>
      <Card className="mt-3">
        <ErrorState offline onRetry={() => {}} />
      </Card>

      <SectionTitle title="Overlays" />
      <View className="flex-row flex-wrap gap-3">
        <Button label="Bottom sheet" variant="secondary" onPress={() => setSheet(true)} />
        <Button label="Modal" variant="secondary" onPress={() => setModal(true)} />
        <Button label="Toast" variant="secondary" icon={Zap} onPress={() => toast.success("Correct!", "+186 points")} />
        <Button label="Error toast" variant="secondary" onPress={() => toast.error("Connection lost", "Reconnecting…")} />
      </View>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Report question" subtitle="Tell us what's wrong.">
        <View className="gap-2">
          {["The answer is wrong", "Question is unclear", "Typo"].map((r) => (
            <Chip key={r} label={r} onPress={() => setSheet(false)} />
          ))}
        </View>
      </BottomSheet>
      <Modal open={modal} onClose={() => setModal(false)} title="Leave match?" body="You'll lose this match and rating." confirmLabel="Leave" destructive onConfirm={() => setModal(false)} />
    </Screen>
  );
}
