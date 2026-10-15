import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { Check, X, ArrowRight } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { usernameError, stateByCode, type MeResponse } from "@ntc/shared";
import { Screen, Txt, Button, Input, Icon, Avatar, toast } from "../../ui";
import { AvatarPicker } from "../../features/profile/AvatarPicker";
import { StatePicker } from "../../features/profile/StatePicker";
import { api } from "../../lib/api";
import { useMe } from "../../features/me";
import { useTheme } from "../../theme/ThemeProvider";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../lib/motion";
import { analytics } from "../../services/analytics";

type Check = { state: "idle" | "checking" | "ok" | "bad"; msg?: string | null };

function useUsernameCheck(name: string): Check {
  const [res, setRes] = useState<Check>({ state: "idle" });
  useEffect(() => {
    if (!name) return setRes({ state: "idle" });
    const problem = usernameError(name);
    if (problem) return setRes({ state: "bad", msg: problem });
    setRes({ state: "checking" });
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ available: boolean; reason: string | null }>(`/username-available?u=${encodeURIComponent(name)}`);
        setRes(r.available ? { state: "ok", msg: "Nice — it's yours" } : { state: "bad", msg: r.reason ?? "Taken" });
      } catch {
        setRes({ state: "idle", msg: "Couldn't check right now" });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [name]);
  return res;
}

const STEPS = ["Username", "Avatar", "Home state"];

export default function ProfileSetup() {
  const me = useMe();
  const qc = useQueryClient();
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [avatarId, setAvatarId] = useState("ada");
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const check = useUsernameCheck(username);

  useEffect(() => {
    const p = me.data?.profile;
    if (!p) return;
    if (p.username && p.username !== "Guest") setUsername((u) => u || p.username);
    setAvatarId(p.avatarId);
    if (p.stateCode && p.onboarded) setStateCode(p.stateCode);
  }, [me.data]);

  const canNext = step === 0 ? check.state === "ok" : step === 1 ? !!avatarId : !!stateCode;

  const finish = async () => {
    setSaving(true);
    try {
      const r = await api.post<MeResponse>("/me/onboarding", { username, avatarId, stateCode });
      qc.setQueryData(["me"], r);
      analytics.track("onboarding_completed", { state: stateCode });
      router.replace("/home");
    } catch (e: any) {
      toast.error("Couldn't save", e.message);
      if (e.code === "username_taken") setStep(0);
    } finally {
      setSaving(false);
    }
  };

  const titles = ["Pick a username", "Choose your look", "Where you dey rep?"];
  const subs = [
    "This is how opponents will see you. Keep it clean.",
    "You can change this any time in your profile.",
    "Your ranked wins add points to this state in State Wars.",
  ];

  return (
    <Screen edges={["top", "bottom"]} scroll={false}>
      <View className="flex-row gap-2 mb-6 mt-2" accessibilityLabel={`Step ${step + 1} of 3: ${STEPS[step]}`}>
        {STEPS.map((s, i) => (
          <View key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-raised")} />
        ))}
      </View>
      <View className="flex-row items-center gap-4 mb-6">
        <Avatar id={avatarId} size={56} stateCode={step === 2 ? stateCode : null} />
        <View className="flex-1">
          <Txt variant="overline" tone="faint">Step {step + 1} of 3</Txt>
          <Txt variant="h1" accessibilityRole="header">{titles[step]}</Txt>
        </View>
      </View>
      <Txt variant="body" tone="muted" className="mb-5">{subs[step]}</Txt>

      <Animated.View key={step} entering={reduce ? undefined : FadeInRight.duration(220)} exiting={reduce ? undefined : FadeOutLeft.duration(150)} className="flex-1">
        {step === 0 ? (
          <Input
            label="Username"
            placeholder="e.g. jollof_king"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={16}
            value={username}
            onChangeText={(t) => setUsername(t.replace(/\s/g, ""))}
            error={check.state === "bad" ? check.msg : null}
            success={check.state === "ok" ? check.msg : null}
            hint="3–16 characters: letters, numbers and _"
            returnKeyType="next"
            onSubmitEditing={() => canNext && setStep(1)}
            right={
              check.state === "checking" ? <ActivityIndicator color={c.muted} /> : check.state === "ok" ? <Icon as={Check} tone="primary" /> : check.state === "bad" ? <Icon as={X} tone="danger" /> : null
            }
            testID="username-input"
          />
        ) : step === 1 ? (
          <AvatarPicker value={avatarId} onChange={setAvatarId} />
        ) : (
          <View className="flex-1">
            <StatePicker value={stateCode} onChange={setStateCode} height={320} />
            {stateCode ? <Txt variant="label" tone="primary" className="mt-3">Repping {stateByCode(stateCode)?.name} 💪🏾</Txt> : null}
          </View>
        )}
      </Animated.View>

      <View className="gap-2 pt-4">
        <Button label={step < 2 ? "Continue" : "Let's clash"} iconRight={ArrowRight} size="lg" full disabled={!canNext} loading={saving} onPress={() => (step < 2 ? setStep(step + 1) : finish())} testID="onboarding-next" />
        {step > 0 ? <Button label="Back" variant="ghost" full onPress={() => setStep(step - 1)} /> : null}
      </View>
    </Screen>
  );
}
