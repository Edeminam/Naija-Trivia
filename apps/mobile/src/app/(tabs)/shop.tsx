import { useState } from "react";
import { View } from "react-native";
import * as Lucide from "lucide-react-native";
import { Crown, Check, PlayCircle, ShieldCheck, Sparkles, Gift, Infinity as InfinityIcon, Ban, Ticket } from "lucide-react-native";
import { type ProductId, type PowerUpKind } from "@ntc/shared";
import { Screen, SectionTitle, Txt, Card, Button, CoinCounter, CoinIcon, Avatar, Icon, BottomSheet, Segmented, Chip, Skeleton, SkeletonCard, ErrorState, toast } from "../../ui";
import { useShop, useBuyItem, useEquip, useShopRefresh, type ShopData } from "../../features/shop/api";
import { purchases } from "../../features/shop/PurchaseService";
import { ads } from "../../features/ads/AdService";
import { useMe } from "../../features/me";
import { haptic } from "../../lib/haptics";
import { cn } from "../../lib/cn";

const PU_ICON: Record<PowerUpKind, Lucide.LucideIcon> = { fifty: Lucide.Split, extra_time: Lucide.Timer, crowd: Lucide.Users, shield: Lucide.Shield };

type Pending = { productId: ProductId; title: string; detail: string } | null;

function ConfirmSheet({ pending, onClose, onDone }: { pending: Pending; onClose: () => void; onDone: (coins: number) => void }) {
  const [busy, setBusy] = useState(false);
  if (!pending) return null;
  return (
    <BottomSheet open={!!pending} onClose={onClose} title="Confirm purchase">
      <Card variant="raised" className="p-4 gap-1">
        <Txt variant="title">{pending.title}</Txt>
        <Txt variant="caption" tone="muted">{pending.detail}</Txt>
        <Txt variant="h1" tabular className="mt-2">{purchases.priceLabel(pending.productId)}</Txt>
      </Card>
      {purchases.provider === "mock" ? (
        <View className="flex-row items-start gap-2 mt-3">
          <Icon as={ShieldCheck} size={16} tone="primary" />
          <Txt variant="caption" tone="muted" className="flex-1">Demo store: no money is charged. Real builds use Google Play, the App Store or Paystack.</Txt>
        </View>
      ) : null}
      <Button
        label={`Pay ${purchases.priceLabel(pending.productId)}`}
        size="lg"
        full
        className="mt-4"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            const r = await purchases.purchase(pending.productId);
            haptic.success();
            toast.success("Purchase complete", pending.title);
            onDone(r.coins);
            onClose();
          } catch (e: any) {
            toast.error("Purchase failed", e.message);
          } finally {
            setBusy(false);
          }
        }}
        testID="confirm-purchase"
      />
      <Button label="Cancel" variant="ghost" full onPress={onClose} />
    </BottomSheet>
  );
}

function PremiumCard({ data, onBuy }: { data: ShopData; onBuy: (p: Pending) => void }) {
  const [plan, setPlan] = useState<"premium_yearly" | "premium_monthly">("premium_yearly");
  const benefits = [
    { icon: Ban, text: "No ads, ever" },
    { icon: InfinityIcon, text: "Unlimited friend challenges" },
    { icon: Gift, text: "Double daily chest" },
    { icon: Sparkles, text: "Exclusive Premium Gold frame" },
  ];
  return (
    <Card variant="hero" tint="accent" className="p-5 gap-4">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent"><Icon as={Crown} size={24} tone="ink" /></View>
        <View className="flex-1">
          <Txt variant="overline" tone="accent">Naija Trivia Premium</Txt>
          <Txt variant="h2">{data.premium.active ? "You're Premium 👑" : "Play like an Oga"}</Txt>
        </View>
      </View>
      <View className="gap-2.5">
        {benefits.map((b) => (
          <View key={b.text} className="flex-row items-center gap-3">
            <Icon as={b.icon} size={18} tone="accent" />
            <Txt variant="body">{b.text}</Txt>
          </View>
        ))}
      </View>
      {data.premium.active ? (
        <Txt variant="caption" tone="muted">Active until {new Date(data.premium.until!).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}. Extend anytime.</Txt>
      ) : null}
      <Segmented label="Premium plan" value={plan} onChange={setPlan} options={[{ value: "premium_yearly", label: `Yearly · ${purchases.priceLabel("premium_yearly")}` }, { value: "premium_monthly", label: `Monthly · ${purchases.priceLabel("premium_monthly")}` }]} />
      <Button
        label={data.premium.active ? "Extend Premium" : "Go Premium"}
        icon={Crown}
        variant="accent"
        size="lg"
        full
        onPress={() => onBuy({ productId: plan, title: plan === "premium_yearly" ? "Premium · 12 months" : "Premium · 1 month", detail: "No ads, unlimited challenges, double chest, Premium frame." })}
      />
      {plan === "premium_yearly" ? <Txt variant="caption" tone="muted" className="text-center">Works out at {purchases.priceLabel("premium_yearly").replace(/[\d,]+/, (n) => Math.round(Number(n.replace(/,/g, "")) / 12).toLocaleString("en-NG"))}/month — save 30%</Txt> : null}
    </Card>
  );
}

export default function Shop() {
  const shop = useShop();
  const me = useMe();
  const buy = useBuyItem();
  const equip = useEquip();
  const refresh = useShopRefresh();
  const [pending, setPending] = useState<Pending>(null);
  const [adBusy, setAdBusy] = useState(false);
  const d = shop.data;
  const coins = me.data?.profile.coins ?? d?.coins ?? 0;

  const buyItem = (kind: "power_up" | "cosmetic", itemId: string, name: string) =>
    buy.mutate(
      { kind, itemId },
      {
        onSuccess: () => {
          haptic.success();
          toast.success(`${name} added`, kind === "power_up" ? "Use it in your next clash." : "Equip it below.");
        },
        onError: (e: any) => toast.error("Couldn't buy", e.message),
      },
    );

  return (
    <View className="flex-1 bg-bg">
      <Screen title="Shop" right={<CoinCounter value={coins} />} refreshing={shop.isRefetching} onRefresh={() => shop.refetch()}>
        {shop.isError && !d ? (
          <ErrorState offline={(shop.error as any)?.offline} onRetry={() => shop.refetch()} />
        ) : !d ? (
          <View className="gap-4"><Skeleton h={320} r={20} /><SkeletonCard lines={3} /><SkeletonCard lines={3} /></View>
        ) : (
          <>
            <PremiumCard data={d} onBuy={setPending} />

            {!d.premium.active ? (
              <Card className="p-4 mt-4 flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-soft"><Icon as={PlayCircle} tone="primary" /></View>
                <View className="flex-1">
                  <Txt variant="bodyStrong">Free coins</Txt>
                  <Txt variant="caption" tone="muted">Watch a short ad · up to 5 a day</Txt>
                </View>
                <Button
                  label="+25"
                  size="sm"
                  variant="secondary"
                  loading={adBusy}
                  onPress={async () => {
                    setAdBusy(true);
                    try {
                      const r = await ads.showRewarded("shop_free_coins");
                      if (r.rewarded && r.coins != null) {
                        refresh(r.coins);
                        haptic.success();
                        toast.success(`+${r.amount} coins`, "Thanks for watching!");
                      }
                    } catch (e: any) {
                      toast.error("No reward", e.message);
                    } finally {
                      setAdBusy(false);
                    }
                  }}
                />
              </Card>
            ) : null}

            <SectionTitle title="Power-ups" />
            <Txt variant="caption" tone="muted" className="-mt-2 mb-3">One per match. You also get 1 free power-up every day.</Txt>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {d.powerUps.map((p) => (
                <Card key={p.kind} className="w-[48.5%] p-4 gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft"><Icon as={PU_ICON[p.kind]} tone="primary" /></View>
                    {p.owned ? <Chip label={`×${p.owned}`} tone="primary" /> : null}
                  </View>
                  <View className="gap-0.5 flex-1">
                    <Txt variant="bodyStrong">{p.name}</Txt>
                    <Txt variant="caption" tone="muted">{p.description}</Txt>
                  </View>
                  <Button
                    label={`${p.cost}`}
                    size="sm"
                    variant="secondary"
                    full
                    disabled={coins < p.cost}
                    loading={buy.isPending && buy.variables?.itemId === `pu_${p.kind}`}
                    onPress={() => buyItem("power_up", `pu_${p.kind}`, p.name)}
                    accessibilityHint={`Costs ${p.cost} coins`}
                  />
                </Card>
              ))}
            </View>

            <SectionTitle title="Avatar frames" />
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {d.cosmetics.filter((c) => c.kind === "frame").map((c) => {
                const equipped = d.equipped.frameId === c.id;
                return (
                  <Card key={c.id} className={cn("w-[48.5%] p-4 items-center gap-2", equipped && "border-primary")}>
                    <Avatar id={me.data?.profile.avatarId ?? "ada"} size={64} frameId={c.id} />
                    <Txt variant="bodyStrong">{c.name}</Txt>
                    {c.owned ? (
                      <Button label={equipped ? "Equipped" : "Equip"} icon={equipped ? Check : undefined} size="sm" variant={equipped ? "ghost" : "secondary"} full disabled={equipped} onPress={() => equip.mutate({ frameId: c.id }, { onSuccess: () => toast.success("Frame equipped") })} />
                    ) : c.premiumOnly ? (
                      <Chip label="Premium" icon={Crown} tone="accent" />
                    ) : (
                      <Button label={`${c.cost}`} size="sm" variant="secondary" full disabled={coins < c.cost} onPress={() => buyItem("cosmetic", c.id, c.name)} />
                    )}
                  </Card>
                );
              })}
            </View>

            <SectionTitle title="Answer button themes" />
            <View className="gap-3">
              {d.cosmetics.filter((c) => c.kind === "button_theme").map((c) => {
                const equipped = d.equipped.buttonThemeId === c.id;
                return (
                  <Card key={c.id} className={cn("p-3 flex-row items-center gap-3", equipped && "border-primary")}>
                    <View className="h-12 flex-1 flex-row items-center gap-3 rounded-btn border-2 px-3" style={{ backgroundColor: c.colors[0], borderColor: c.colors[1] }}>
                      <View className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: c.colors[1] }}><Txt variant="label" style={{ color: "#F4F6F5" }}>A</Txt></View>
                      <Txt variant="bodyStrong" style={{ color: "#F4F6F5" }}>{c.name}</Txt>
                    </View>
                    {c.owned ? (
                      <Button label={equipped ? "On" : "Use"} size="sm" variant={equipped ? "ghost" : "secondary"} disabled={equipped} onPress={() => equip.mutate({ buttonThemeId: c.id }, { onSuccess: () => toast.success("Theme applied") })} />
                    ) : (
                      <View className="flex-row items-center gap-1"><Button label={`${c.cost}`} size="sm" variant="secondary" disabled={coins < c.cost} onPress={() => buyItem("cosmetic", c.id, c.name)} /></View>
                    )}
                  </Card>
                );
              })}
              {d.equipped.buttonThemeId ? <Button label="Use default buttons" variant="ghost" size="sm" onPress={() => equip.mutate({ buttonThemeId: null })} /> : null}
            </View>

            <SectionTitle title="Coin packs" />
            <View className="gap-3">
              {d.products.filter((p) => p.kind === "coins").map((p) => (
                <Card key={p.id} className="p-4 flex-row items-center gap-3" onPress={() => setPending({ productId: p.id, title: p.name, detail: `${p.coins?.toLocaleString("en-NG")} coins` })} accessibilityLabel={`${p.name}, ${p.coins} coins for ${purchases.priceLabel(p.id)}`}>
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft"><CoinIcon size={28} /></View>
                  <View className="flex-1 gap-1">
                    <Txt variant="bodyStrong" numberOfLines={1}>{p.coins?.toLocaleString("en-NG")} coins</Txt>
                    <View className="flex-row items-center gap-2">
                      <Txt variant="caption" tone="muted">{p.name}</Txt>
                      {p.badge ? <View className="rounded-chip bg-accent-soft px-2 py-0.5"><Txt variant="overline" tone="accent">{p.badge}</Txt></View> : null}
                    </View>
                  </View>
                  <Txt variant="title" tabular>{purchases.priceLabel(p.id)}</Txt>
                </Card>
              ))}
              <Card className="p-4 flex-row items-center gap-3" onPress={() => setPending({ productId: "season_pass", title: "Season Pass", detail: "3 of every power-up + Eko Nights frame this season" })} accessibilityLabel="Season pass">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft"><Icon as={Ticket} size={24} tone="primary" /></View>
                <View className="flex-1">
                  <Txt variant="bodyStrong">Season Pass</Txt>
                  <Txt variant="caption" tone="muted">12 power-ups + Eko Nights frame</Txt>
                </View>
                <Txt variant="title" tabular>{purchases.priceLabel("season_pass")}</Txt>
              </Card>
            </View>
            <Txt variant="caption" tone="faint" className="text-center mt-6">Prices in naira. Purchases are tied to your account.</Txt>
          </>
        )}
      </Screen>
      <ConfirmSheet pending={pending} onClose={() => setPending(null)} onDone={(c) => refresh(c)} />
    </View>
  );
}
