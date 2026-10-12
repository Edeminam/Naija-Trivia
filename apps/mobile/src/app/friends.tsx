import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Search, Swords, Users, X, Check, UserMinus } from "lucide-react-native";
import { LEAGUES, type FriendItem, type HeadToHead, type PublicProfile } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Card, Avatar, Button, IconButton, Input, Segmented, EmptyState, ErrorState, SkeletonRow, Icon, Modal, toast } from "../ui";
import { useMe } from "../features/me";
import { useFriends, usePlayerSearch, useFriendAction, useChallengeFriend } from "../features/friends/api";
import { FriendButton } from "../features/friends/FriendButton";
import { haptic } from "../lib/haptics";
import { cn } from "../lib/cn";

const leagueName = (p: PublicProfile) => LEAGUES.find((l) => l.id === p.league)?.name ?? "";

/** "You lead 3–2" style head-to-head line. */
export function recordLine(r: HeadToHead) {
  const played = r.wins + r.losses + r.draws;
  if (!played) return "No games yet";
  const score = `${r.wins}–${r.losses}${r.draws ? `–${r.draws}` : ""}`;
  return r.wins > r.losses ? `You lead ${score}` : r.wins < r.losses ? `They lead ${score}` : `Level at ${score}`;
}

function ChallengeButton({ friend }: { friend: PublicProfile }) {
  const challenge = useChallengeFriend();
  return (
    <IconButton
      icon={Swords}
      label={`Challenge ${friend.username}`}
      tone="primary"
      onPress={() =>
        challenge.mutate(friend.id, {
          onSuccess: (c) => {
            haptic.select();
            toast.success(`Challenge for ${friend.username}`, "Play your round first. They'll be notified when you finish.");
            router.push({ pathname: "/c/[code]/play", params: { code: c.code } });
          },
          onError: (e: any) => toast.error("Couldn't create challenge", e.message),
        })
      }
    />
  );
}

function BoardRow({ rank, item, me, first, onRemove }: { rank: number; item: { profile: PublicProfile; record?: HeadToHead; weekPoints?: number }; me: boolean; first: boolean; onRemove?: () => void }) {
  return (
    <View className={cn("flex-row items-center gap-3 px-4 py-3", !first && "border-t border-line", me && "bg-primary-soft")} accessibilityLabel={`Rank ${rank}, ${item.profile.username}${me ? ", you" : ""}, ${item.profile.rating} rating`}>
      <Txt variant="label" tone={rank <= 3 ? "accent" : "muted"} tabular className="w-6 text-center">{rank}</Txt>
      <Avatar id={item.profile.avatarId} size={40} league={item.profile.league} frameId={item.profile.frameId} />
      <View className="flex-1">
        <Txt variant="bodyStrong" numberOfLines={1}>{item.profile.username}{me ? " (you)" : ""}</Txt>
        <Txt variant="caption" tone="faint" numberOfLines={1}>{leagueName(item.profile)} · {item.profile.rating}</Txt>
        {item.record ? <Txt variant="caption" tone="muted" numberOfLines={1}>{recordLine(item.record)}</Txt> : null}
      </View>
      {!me ? (
        <View className="flex-row items-center">
          {onRemove ? <IconButton icon={UserMinus} label={`Remove ${item.profile.username}`} tone="muted" onPress={onRemove} /> : null}
          <ChallengeButton friend={item.profile} />
        </View>
      ) : null}
    </View>
  );
}

export default function Friends() {
  const me = useMe();
  const q = useFriends();
  const act = useFriendAction();
  const [tab, setTab] = useState<"board" | "requests">("board");
  const [term, setTerm] = useState("");
  const search = usePlayerSearch(term);
  const [removing, setRemoving] = useState<FriendItem | null>(null);
  const d = q.data;
  const myProfile = me.data?.profile;
  const board = d && myProfile ? [...d.friends.map((f) => ({ ...f, me: false })), { profile: myProfile as PublicProfile, me: true }].sort((a, b) => b.profile.rating - a.profile.rating) : [];
  const requestCount = d?.incoming.length ?? 0;

  return (
    <Screen title="Friends" back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <Input
        placeholder="Find players by username"
        value={term}
        onChangeText={setTerm}
        autoCapitalize="none"
        autoCorrect={false}
        prefix={<View className="mr-2"><Icon as={Search} size={18} tone="faint" /></View>}
        right={term ? <IconButton icon={X} label="Clear search" tone="muted" onPress={() => setTerm("")} /> : undefined}
      />
      {term.trim().length >= 2 ? (
        <Card className="mt-3 overflow-hidden">
          {search.isLoading ? (
            <View className="px-4"><SkeletonRow /></View>
          ) : !search.data?.players.length ? (
            <Txt variant="caption" tone="muted" className="p-4 text-center">No players found for “{term.trim()}”.</Txt>
          ) : (
            search.data.players.map((r, i) => (
              <View key={r.profile.id} className={cn("flex-row items-center gap-3 px-4 py-3", i > 0 && "border-t border-line")}>
                <Avatar id={r.profile.avatarId} size={40} league={r.profile.league} frameId={r.profile.frameId} />
                <View className="flex-1">
                  <Txt variant="bodyStrong" numberOfLines={1}>{r.profile.username}</Txt>
                  <Txt variant="caption" tone="faint">{leagueName(r.profile)} · {r.profile.rating}</Txt>
                </View>
                <FriendButton id={r.profile.id} name={r.profile.username} status={r.status} />
              </View>
            ))
          )}
        </Card>
      ) : null}

      <View className="mt-5">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Friends view"
          options={[
            { value: "board", label: "Leaderboard" },
            { value: "requests", label: requestCount ? `Requests (${requestCount})` : "Requests" },
          ]}
        />
      </View>

      {q.isError && !d ? (
        <ErrorState offline={(q.error as any)?.offline} onRetry={() => q.refetch()} className="mt-4" />
      ) : !d ? (
        <Card className="px-4 mt-4"><SkeletonRow /><SkeletonRow /><SkeletonRow /></Card>
      ) : tab === "board" ? (
        d.friends.length === 0 ? (
          <Card className="mt-4">
            <EmptyState icon={Users} title="No friends yet" body="Search for a username above, or tap “Add friend” after a match. Then challenge them and see who's the real Agba." />
          </Card>
        ) : (
          <>
            <SectionTitle title="Ranked by rating" />
            <Card className="overflow-hidden">
              {board.map((b, i) => (
                <BoardRow key={b.profile.id} rank={i + 1} item={b} me={b.me} first={i === 0} onRemove={b.me ? undefined : () => setRemoving(b as FriendItem)} />
              ))}
            </Card>
            <Txt variant="caption" tone="faint" className="text-center mt-3">Tap ⚔️ to send a friend 7 questions. Records count ranked clashes and challenges.</Txt>
          </>
        )
      ) : (
        <>
          <SectionTitle title="Requests for you" />
          {d.incoming.length === 0 ? (
            <Txt variant="caption" tone="muted">No requests right now.</Txt>
          ) : (
            <Card className="overflow-hidden">
              {d.incoming.map((r, i) => (
                <View key={r.profile.id} className={cn("flex-row items-center gap-3 px-4 py-3", i > 0 && "border-t border-line")}>
                  <Avatar id={r.profile.avatarId} size={40} league={r.profile.league} frameId={r.profile.frameId} />
                  <View className="flex-1">
                    <Txt variant="bodyStrong" numberOfLines={1}>{r.profile.username}</Txt>
                    <Txt variant="caption" tone="faint">{leagueName(r.profile)} · {r.profile.rating}</Txt>
                  </View>
                  <IconButton icon={X} label={`Decline ${r.profile.username}`} tone="muted" onPress={() => act.mutate({ id: r.profile.id, action: "remove" })} />
                  <Button label="Accept" icon={Check} size="sm" onPress={() => act.mutate({ id: r.profile.id, action: "accept" }, { onSuccess: () => toast.success(`You and ${r.profile.username} are now friends`) })} />
                </View>
              ))}
            </Card>
          )}
          {d.outgoing.length ? (
            <>
              <SectionTitle title="Sent" />
              <Card className="overflow-hidden">
                {d.outgoing.map((r, i) => (
                  <View key={r.profile.id} className={cn("flex-row items-center gap-3 px-4 py-3", i > 0 && "border-t border-line")}>
                    <Avatar id={r.profile.avatarId} size={36} />
                    <Txt variant="bodyStrong" numberOfLines={1} className="flex-1">{r.profile.username}</Txt>
                    <Button label="Cancel" size="sm" variant="ghost" onPress={() => act.mutate({ id: r.profile.id, action: "remove" })} />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.profile.username}?`}
        body="You'll stop seeing each other on your friends leaderboards. Your match history stays."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removing) act.mutate({ id: removing.profile.id, action: "remove" }, { onSuccess: () => toast.success("Friend removed") });
          setRemoving(null);
        }}
      />
    </Screen>
  );
}
