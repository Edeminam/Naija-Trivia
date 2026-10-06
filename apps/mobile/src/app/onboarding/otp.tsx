import { useEffect, useRef, useState } from "react";
import { TextInput, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Txt, Button, toast } from "../../ui";
import { verifyPhoneOtp, sendPhoneOtp } from "../../features/auth";
import { useTheme } from "../../theme/ThemeProvider";
import { cn } from "../../lib/cn";
import { queryClient } from "../../lib/queryClient";
import { api } from "../../lib/api";
import type { MeResponse } from "@ntc/shared";
import { fonts } from "../../theme/tokens";

const LEN = 6;

export default function Otp() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { c } = useTheme();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const verify = async (value = code) => {
    if (value.length !== LEN) return;
    setBusy(true);
    try {
      await verifyPhoneOtp(phone!, value);
      const me = await queryClient.fetchQuery({ queryKey: ["me"], queryFn: () => api.get<MeResponse>("/me") });
      router.replace(me.profile.onboarded ? "/home" : "/onboarding/profile");
    } catch (e: any) {
      toast.error("Wrong code", e.message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back edges={["top", "bottom"]}>
      <View className="gap-2 mt-2 mb-8">
        <Txt variant="display" accessibilityRole="header">Enter the code</Txt>
        <Txt variant="body" tone="muted">Sent to {phone}. It expires in 10 minutes.</Txt>
      </View>
      <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Verification code" className="flex-row justify-between gap-2">
        {Array.from({ length: LEN }).map((_, i) => (
          <View key={i} className={cn("flex-1 aspect-[0.85] max-w-[56px] items-center justify-center rounded-btn border-2 bg-surface", code.length === i ? "border-primary" : "border-line")}>
            <Txt variant="h1" tabular>{code[i] ?? ""}</Txt>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={(t) => {
          const v = t.replace(/\D/g, "").slice(0, LEN);
          setCode(v);
          if (v.length === LEN) void verify(v);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={LEN}
        style={{ position: "absolute", opacity: 0, height: 1, width: 1, color: c.text, fontFamily: fonts.body }}
        accessibilityLabel="Verification code input"
      />
      <Button label="Verify" size="lg" full className="mt-8" loading={busy} disabled={code.length !== LEN} onPress={() => verify()} />
      <Button
        label={resendIn ? `Resend code in ${resendIn}s` : "Resend code"}
        variant="ghost"
        full
        disabled={resendIn > 0}
        onPress={async () => {
          try {
            await sendPhoneOtp(phone!);
            setResendIn(30);
            toast.success("New code sent");
          } catch (e: any) {
            toast.error("Couldn't resend", e.message);
          }
        }}
      />
    </Screen>
  );
}
