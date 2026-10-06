import { useState } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Volume2, Vibrate, Bell, Wifi, Sparkles, MessageCircle, LogOut, Trash2, MapPin, UserCircle2, ShieldCheck, Crown } from "lucide-react-native";
import { stateByCode, type MeResponse } from "@ntc/shared";
import { Screen, SectionTitle, Card, ListRow, Segmented, Txt, Modal, BottomSheet, Button, toast } from "../ui";
import { usePrefs } from "../stores/prefs";
import { useMe } from "../features/me";
import { signOut } from "../features/auth";
import { premiumUntilLabel } from "../features/PlanPill";
import { enableNotifications, disableNotifications } from "../features/notifications";
import { StatePicker } from "../features/profile/StatePicker";
import { AvatarPicker } from "../features/profile/AvatarPicker";
import { api } from "../lib/api";

export default function SettingsScreen() {
  const prefs = usePrefs();
  const me = useMe();
  const qc = useQueryClient();
  const p = me.data?.profile;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheet, setSheet] = useState<null | "state" | "avatar">(null);
  const [draft, setDraft] = useState<string | null>(null);

  const saveProfile = async (patch: { stateCode?: string; avatarId?: string }) => {
    try {
      const r = await api.patch<MeResponse>("/me", patch);
      qc.setQueryData(["me"], r);
      toast.success("Saved");
    } catch (e: any) {
      toast.error("Couldn't save", e.message);
    }
  };

  return (
    <Screen title="Settings" back>
      <SectionTitle title="Appearance" />
      <Card className="p-4 gap-3">
        <Txt variant="label" tone="muted">Theme</Txt>
        <Segmented label="Theme" value={prefs.theme} onChange={(theme) => prefs.set({ theme })} options={[{ value: "system", label: "System" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
        <Txt variant="label" tone="muted" className="mt-2">Pidgin flavour in copy</Txt>
        <Segmented label="Pidgin flavour" value={prefs.pidginFlavour} onChange={(pidginFlavour) => prefs.set({ pidginFlavour })} options={[{ value: "off", label: "Off" }, { value: "light", label: "Light" }, { value: "full", label: "Full" }]} />
      </Card>

      <SectionTitle title="Gameplay" />
      <Card className="px-4">
        <ListRow first icon={Volume2} title="Sound effects" toggle={prefs.sound} onToggle={(sound) => prefs.set({ sound })} />
        <ListRow icon={Vibrate} title="Haptics" subtitle={Platform.OS === "web" ? "Available on phones" : undefined} toggle={prefs.haptics} onToggle={(haptics) => prefs.set({ haptics })} />
        <ListRow icon={Sparkles} title="Reduce motion" subtitle="Calmer transitions, no confetti" toggle={prefs.reduceMotion} onToggle={(reduceMotion) => prefs.set({ reduceMotion })} />
        <ListRow icon={Wifi} title="Data saver" subtitle="Hides non-essential images" toggle={prefs.dataSaver} onToggle={(dataSaver) => prefs.set({ dataSaver })} />
      </Card>

      <SectionTitle title="Notifications" />
      <Card className="px-4">
        <ListRow
          first
          icon={Bell}
          title="Reminders & alerts"
          subtitle="7pm Daily Naija reminder, challenge results, season ending. Max 1 promo a day."
          toggle={prefs.notifications}
          onToggle={async (on) => {
            if (on) {
              const ok = await enableNotifications();
              if (!ok && Platform.OS !== "web") return toast.error("Notifications are blocked", "Turn them on in your phone settings.");
              if (Platform.OS === "web") toast.info("Reminders work in the mobile app");
            } else await disableNotifications();
            prefs.set({ notifications: on });
          }}
        />
      </Card>

      {p && !p.isGuest ? (
        <>
          <SectionTitle title="Account" />
          <Card className="px-4">
            <ListRow first icon={UserCircle2} title="Avatar" onPress={() => { setDraft(p.avatarId); setSheet("avatar"); }} />
            <ListRow icon={MapPin} title="Home state" value={stateByCode(p.stateCode)?.name} onPress={() => { setDraft(p.stateCode); setSheet("state"); }} />
            <ListRow icon={MessageCircle} title="Username" value={p.username} />
            <ListRow
              icon={Crown}
              title="Plan"
              value={p.isPremium ? "Premium" : "Free"}
              subtitle={p.isPremium ? `Active until ${premiumUntilLabel(p.premiumUntil)}` : "Go Premium for no ads, unlimited challenges and more"}
              onPress={() => router.push("/shop")}
            />
          </Card>
        </>
      ) : null}

      <SectionTitle title="More" />
      <Card className="px-4">
        <ListRow first icon={ShieldCheck} title="Fair play" subtitle="Server-checked timers and answers. Bots are always labelled." />
        <ListRow icon={LogOut} title="Sign out" onPress={async () => { await signOut(); router.replace("/onboarding"); }} />
        <ListRow icon={Trash2} title="Delete account" destructive onPress={() => setConfirmDelete(true)} />
      </Card>
      <Txt variant="caption" tone="faint" className="text-center mt-6">Naija Trivia Clash · v1.0.0</Txt>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete your account?"
        body="This permanently removes your profile, coins, rating, streak and match history. It can't be undone."
        confirmLabel="Delete forever"
        destructive
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await api.del("/me");
            await signOut();
            router.replace("/onboarding");
            toast.info("Account deleted", "Sorry to see you go.");
          } catch (e: any) {
            toast.error("Couldn't delete", e.message);
          } finally {
            setDeleting(false);
            setConfirmDelete(false);
          }
        }}
      />
      <BottomSheet open={sheet === "state"} onClose={() => setSheet(null)} title="Home state" subtitle="Changing state moves your future points, not past ones.">
        <StatePicker value={draft} onChange={setDraft} height={300} />
        <Button label="Save" full className="mt-4" disabled={!draft} onPress={() => { setSheet(null); void saveProfile({ stateCode: draft! }); }} />
      </BottomSheet>
      <BottomSheet open={sheet === "avatar"} onClose={() => setSheet(null)} title="Choose avatar">
        <AvatarPicker value={draft ?? "ada"} onChange={setDraft} />
        <Button label="Save" full className="mt-5" onPress={() => { setSheet(null); void saveProfile({ avatarId: draft! }); }} />
      </BottomSheet>
    </Screen>
  );
}
