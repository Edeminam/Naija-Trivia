import { useRef, useState } from "react";
import { FlatList, View, useWindowDimensions, type ViewToken } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Swords, Map as MapIcon, Flame, Zap } from "lucide-react-native";
import { Txt, Button, Card, Avatar, Chip, Icon, LeagueBadge, toast } from "../../ui";
import { playAsGuest } from "../../features/auth";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../lib/motion";
import { SCREEN_PADDING } from "../../theme/tokens";

function ArtClash() {
  return (
    <Card variant="hero" className="p-6 items-center gap-5">
      <View className="flex-row items-center gap-5">
        <View className="items-center gap-2">
          <Avatar id="ada" size={76} league="sharp" stateCode="LA" />
          <Txt variant="label">Ada</Txt>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
          <Txt variant="h3" tone="ink">VS</Txt>
        </View>
        <View className="items-center gap-2">
          <Avatar id="musa" size={76} league="odogwu" stateCode="KN" />
          <Txt variant="label">Musa</Txt>
        </View>
      </View>
      <View className="flex-row gap-2">
        <Chip label="7 questions" tone="primary" />
        <Chip label="10s each" icon={Zap} tone="accent" />
      </View>
    </Card>
  );
}

function ArtStates() {
  const rows = [
    { code: "LA", name: "Lagos", pts: "12,480" },
    { code: "FC", name: "FCT Abuja", pts: "11,902" },
    { code: "RI", name: "Rivers", pts: "10,355" },
  ];
  return (
    <Card variant="hero" tint="accent" className="p-5 gap-3">
      {rows.map((r, i) => (
        <View key={r.code} className="flex-row items-center gap-3 rounded-2xl bg-surface/80 border border-line px-4 py-3">
          <Txt variant="h3" tone={i === 0 ? "accent" : "muted"} tabular className="w-6">
            {i + 1}
          </Txt>
          <Txt variant="bodyStrong" className="flex-1">{r.name}</Txt>
          <Txt variant="label" tone="muted" tabular>{r.pts} pts</Txt>
        </View>
      ))}
    </Card>
  );
}

function ArtDaily() {
  return (
    <Card variant="hero" className="p-6 gap-4 items-center">
      <View className="flex-row items-center gap-4">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-danger-soft">
          <Icon as={Flame} size={40} tone="danger" />
        </View>
        <LeagueBadge league="oga" size={64} />
      </View>
      <View className="flex-row gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} className={cn("h-2 w-5 rounded-full", i < 7 ? "bg-primary" : "bg-raised")} />
        ))}
      </View>
      <Txt variant="label" tone="muted">7-day streak · Oga at the Top</Txt>
    </Card>
  );
}

const SLIDES = [
  { key: "clash", icon: Swords, title: "Clash with Naija, live", body: "1v1 trivia on Nollywood, Afrobeats, football, history, food and more. Fastest correct answer takes the points.", Art: ArtClash },
  { key: "states", icon: MapIcon, title: "Rep your state", body: "Every ranked win adds points to your home state. Climb the weekly State Wars table — 36 states, FCT and Diaspora.", Art: ArtStates },
  { key: "daily", icon: Flame, title: "Daily Naija, every day", body: "10 fresh questions for everyone, once a day. Keep your streak burning and climb from JJC to Agba.", Art: ArtDaily },
];

export default function Intro() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listH, setListH] = useState(0);
  const list = useRef<FlatList>(null);
  const pageW = Math.min(width, 640);
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const guest = async () => {
    setLoading(true);
    try {
      await playAsGuest();
      router.replace({ pathname: "/match/search", params: { mode: "guest" } });
    } catch (e: any) {
      toast.error("Couldn't start", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center justify-between w-full max-w-[640px] self-center" style={{ paddingHorizontal: SCREEN_PADDING }}>
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-primary">
            <Icon as={Swords} size={18} tone="ink" />
          </View>
          <Txt variant="h3">Naija Trivia Clash</Txt>
        </View>
        <Txt variant="label" tone="muted" onPress={() => router.push("/onboarding/sign-in")} accessibilityRole="link" suppressHighlighting>
          Sign in
        </Txt>
      </View>

      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        style={{ flex: 1, width: pageW, alignSelf: "center", marginTop: 8 }}
        onLayout={(e) => setListH(e.nativeEvent.layout.height)}
        renderItem={({ item, index: i }) => (
          <View style={{ width: pageW, height: listH || undefined, paddingHorizontal: SCREEN_PADDING }} className="justify-center gap-8">
            <Animated.View entering={reduce || i > 0 ? undefined : FadeInDown.duration(400)}>
              <item.Art />
            </Animated.View>
            <View className="gap-3">
              <Txt variant="display" accessibilityRole="header">{item.title}</Txt>
              <Txt variant="body" tone="muted" className="text-lg leading-6">{item.body}</Txt>
            </View>
          </View>
        )}
      />

      <View className="w-full max-w-[640px] self-center gap-4" style={{ paddingHorizontal: SCREEN_PADDING }}>
        <View className="flex-row justify-center gap-2" accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.key} className={cn("h-2 rounded-full", i === index ? "w-6 bg-primary" : "w-2 bg-raised")} />
          ))}
        </View>
        <Button label="Play as guest" icon={Swords} size="lg" full loading={loading} onPress={guest} accessibilityHint="Starts a free match right away" testID="play-guest" />
        <Button label="Create account or sign in" variant="secondary" size="lg" full onPress={() => router.push("/onboarding/sign-in")} />
        <Txt variant="caption" tone="faint" className="text-center">
          Guests get one free match. Sign in to keep your coins, rating and streak.
        </Txt>
      </View>
    </View>
  );
}
