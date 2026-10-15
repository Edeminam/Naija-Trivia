import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { Smartphone, Terminal } from "lucide-react-native";
import { Screen, Txt, Button, Input, Card, Icon, toast } from "../../ui";
import { authMode, toE164, sendPhoneOtp, signInWithGoogle, signInWithApple, appleAvailable, devSignIn } from "../../features/auth";
import { useTheme } from "../../theme/ThemeProvider";
import { usernameError } from "@ntc/shared";
import { queryClient } from "../../lib/queryClient";
import { api } from "../../lib/api";
import type { MeResponse } from "@ntc/shared";

async function routeAfterSignIn() {
  const me = await queryClient.fetchQuery({ queryKey: ["me"], queryFn: () => api.get<MeResponse>("/me") });
  router.replace(me.profile.onboarded ? "/home" : "/onboarding/profile");
}

export default function SignIn() {
  const { name } = useTheme();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  const [devName, setDevName] = useState("");
  const e164 = toE164(phone);
  useEffect(() => {
    void appleAvailable().then(setApple);
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e: any) {
      if (!/cancel/i.test(e?.message ?? "")) toast.error("Sign-in failed", e.message);
    } finally {
      setBusy(null);
    }
  };

  const devValid = devName.length === 0 || !usernameError(devName);

  return (
    <Screen back edges={["top", "bottom"]}>
      <View className="gap-2 mt-2 mb-8">
        <Txt variant="display" accessibilityRole="header">Welcome to the clash</Txt>
        <Txt variant="body" tone="muted">Sign in to save your coins, rating and streak across devices.</Txt>
      </View>

      {authMode === "supabase" ? (
        <View className="gap-4">
          <Input
            label="Phone number"
            placeholder="803 123 4567"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
            maxLength={15}
            prefix={
              <View className="flex-row items-center gap-2 pr-3 mr-3 border-r border-line">
                <Txt variant="bodyStrong">🇳🇬</Txt>
                <Txt variant="bodyStrong" tone="muted">+234</Txt>
              </View>
            }
            hint="We'll text you a 6-digit code."
            error={phone.length > 9 && !e164 ? "Enter a valid Nigerian mobile number" : null}
          />
          <Button
            label="Send code"
            icon={Smartphone}
            size="lg"
            full
            disabled={!e164}
            loading={busy === "phone"}
            onPress={() =>
              run("phone", async () => {
                await sendPhoneOtp(e164!);
                router.push({ pathname: "/onboarding/otp", params: { phone: e164! } });
              })
            }
          />
          <View className="flex-row items-center gap-3 my-2">
            <View className="flex-1 h-px bg-line" />
            <Txt variant="caption" tone="faint">or</Txt>
            <View className="flex-1 h-px bg-line" />
          </View>
          <Button label="Continue with Google" variant="secondary" size="lg" full loading={busy === "google"} onPress={() => run("google", async () => { await signInWithGoogle(); if (Platform.OS !== "web") await routeAfterSignIn(); })} />
          {apple ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={name === "dark" ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={{ height: 56, width: "100%" }}
              onPress={() => run("apple", async () => { await signInWithApple(); await routeAfterSignIn(); })}
            />
          ) : null}
        </View>
      ) : (
        <Card className="p-5 gap-4">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
              <Icon as={Terminal} tone="accent" />
            </View>
            <View className="flex-1">
              {__DEV__ ? (
                <>
                  <Txt variant="title">Local dev mode</Txt>
                  <Txt variant="caption" tone="muted">Supabase keys aren't set, so phone, Google and Apple sign-in are off. Use a quick local account instead.</Txt>
                </>
              ) : (
                <>
                  <Txt variant="title">Quick sign-in</Txt>
                  <Txt variant="caption" tone="muted">Pick a username to keep your coins, rating and streak on this device.</Txt>
                </>
              )}
            </View>
          </View>
          <Input label="Username (optional)" placeholder="e.g. jollof_king" autoCapitalize="none" autoCorrect={false} value={devName} onChangeText={setDevName} error={devValid ? null : "3–16 letters, numbers or _"} />
          <Button
            label={__DEV__ ? "Quick sign-in (dev)" : "Continue"}
            size="lg"
            full
            disabled={!devValid}
            loading={busy === "dev"}
            testID="dev-sign-in"
            onPress={() =>
              run("dev", async () => {
                await devSignIn(devName || undefined);
                await routeAfterSignIn();
              })
            }
          />
        </Card>
      )}
      <Txt variant="caption" tone="faint" className="text-center mt-8">
        By continuing you agree to play fair and keep it respectful. No tribe, religion or region bashing.
      </Txt>
    </Screen>
  );
}
