import { View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Swords, Users, Trophy, ChevronRight, WifiOff, UserPlus } from "lucide-react-native";
import { LAGOS_OFFSET_MS, leagueForRating, leagueProgress, LEAGUES } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Button, Card, Avatar, CoinCounter, Chip, LeagueBadge, ProgressBar, SkeletonCard, Skeleton, ErrorState, Icon, PressableScale } from "../../ui";
import { useMe } from "../../features/me";
import { useHome } from "../../features/home/api";
import { DailyNaijaCard, MissionsCard, ChestCard } from "../../features/home/components";
import { useOnline } from "../../lib/useNetwork";
import { useReducedMotion } from "../../lib/motion";

function greeting() {
  const h = new Date(Date.now() + LAGOS_OFFSET_MS).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function HomeSkeleton() {
  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-3">
        <Skeleton w={52} h={52} r={26} />
        <View className="flex-1 gap-2">
          <Skeleton w="50%" h={14} />
          <Skeleton w="30%" h={12} />
        </View>
        <Skeleton w={84} h={36} r={18} />
      </View>
      <Skeleton h={210} r={20} />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
    </View>
  );
}

export default function Home() {
  const me = useMe();
  const home = useHome();
  const online = useOnline();
  const reduce = useReducedMotion();
  const p = me.data?.profile;
  const enter = (i: number) => (reduce ? undefined : FadeInDown.delay(60 * i).duration(260));

  if (!p) {
    return (
      <Screen>
        {me.isError ? <ErrorState offline={(me.error as any)?.offline} onRetry={() => me.refetch()} /> : <HomeSkeleton />}
      </Screen>
    );
  }
  const league = leagueForRating(p.rating);
  const next = LEAGUES[LEAGUES.indexOf(league) + 1];

  return (
    <Screen refreshing={home.isRefetching} onRefresh={() => { void me.refetch(); void home.refetch(); }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-5">
        <PressableScale onPress={() => router.push("/profile")} accessibilityLabel="Your profile" accessibilityRole="button">
          <Avatar id={p.avatarId} size={52} league={league.id} frameId={p.frameId} />
        </PressableScale>
        <View className="flex-1">
          <Txt variant="caption" tone="muted">{greeting()},</Txt>
          <Txt variant="h3" numberOfLines={1}>{p.isGuest ? "Guest player" : p.username}</Txt>
          <View className="flex-row items-center gap-2 mt-1">
            <Txt variant="label" tone="primary">{league.name}</Txt>
            {next ? <View className="w-16"><ProgressBar value={leagueProgress(p.rating)} height={4} label={`${Math.round(leagueProgress(p.rating) * 100)}% of the way to ${next.name}`} /></View> : null}
          </View>
        </View>
        <CoinCounter value={p.coins} />
      </View>

      {!online ? (
        <Card className="p-4 mb-4 flex-row items-center gap-3 border-accent">
          <Icon as={WifiOff} tone="accent" />
          <View className="flex-1">
            <Txt variant="bodyStrong">You're offline</Txt>
            <Txt variant="caption" tone="muted">Showing your last saved data. Matches need a connection.</Txt>
          </View>
        </Card>
      ) : null}

      {p.isGuest ? (
        <Card className="p-4 mb-4 flex-row items-center gap-3" onPress={() => router.push("/onboarding/sign-in")} accessibilityLabel="Sign in to save progress">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft"><Icon as={UserPlus} tone="primary" /></View>
          <View className="flex-1">
            <Txt variant="bodyStrong">{p.guestMatchUsed ? "Free match done — nice one!" : "Playing as guest"}</Txt>
            <Txt variant="caption" tone="muted">Sign in to keep your coins, rating and streak.</Txt>
          </View>
          <Icon as={ChevronRight} tone="faint" />
        </Card>
      ) : null}

      {/* Hero CTA */}
      <Animated.View entering={enter(0)}>
        <Card variant="hero" className="p-5 gap-5">
          <View className="flex-row items-center gap-4">
            <LeagueBadge league={league.id} size={56} />
            <View className="flex-1 gap-1">
              <Txt variant="overline" tone="primary">{league.name} · {p.rating} rating</Txt>
              <Txt variant="h1">Ready to clash?</Txt>
              {next ? <Txt variant="caption" tone="muted">{next.min - p.rating} to {next.name}</Txt> : <Txt variant="caption" tone="muted">Top of the pile. Agba!</Txt>}
            </View>
          </View>
          <ProgressBar value={leagueProgress(p.rating)} height={6} label="League progress" />
          <View className="gap-3">
            <Button
              label="Play Clash"
              icon={Swords}
              size="lg"
              full
              disabled={!online || (p.isGuest && p.guestMatchUsed)}
              onPress={() => router.push({ pathname: "/match/play", params: { mode: p.isGuest ? "guest" : "ranked" } })}
              accessibilityHint="Finds an opponent in seconds"
              testID="play-clash"
            />
            <Button label="Challenge a Friend" icon={Users} variant="secondary" full disabled={!online || p.isGuest} onPress={() => router.push("/challenge/new")} />
          </View>
        </Card>
      </Animated.View>

      {home.data?.stateRank ? (
        <Animated.View entering={enter(1)} className="mt-4 flex-row">
          <Chip
            label={home.data.stateRank.points > 0 ? `${home.data.stateRank.name} is #${home.data.stateRank.rank} this week` : `${home.data.stateRank.name} hasn't scored yet — win one for them`}
            icon={Trophy}
            tone="accent"
            onPress={() => router.push("/state-wars")}
          />
        </Animated.View>
      ) : null}

      {home.isError && !home.data ? (
        <Card className="mt-4"><ErrorState offline={(home.error as any)?.offline} onRetry={() => home.refetch()} /></Card>
      ) : !home.data ? (
        <View className="gap-4 mt-6">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </View>
      ) : (
        <>
          <SectionTitle title="Daily Naija" />
          <Animated.View entering={enter(2)}>
            <DailyNaijaCard played={home.data.daily.played} score={home.data.daily.score} resetsAt={home.data.daily.resetsAt} streak={home.data.streak} />
          </Animated.View>
          <View className="mt-3">
            <ChestCard available={home.data.chest.available} amount={home.data.chest.amount} />
          </View>
          <SectionTitle title="Today's missions" />
          <Animated.View entering={enter(3)}>
            <MissionsCard missions={home.data.missions} />
          </Animated.View>
        </>
      )}
    </Screen>
  );
}
