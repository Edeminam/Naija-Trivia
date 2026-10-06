import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { HAS_SUPABASE } from "../lib/config";
import { useSession } from "../stores/session";
import { queryClient } from "../lib/queryClient";
import { analytics } from "../services/analytics";

WebBrowser.maybeCompleteAuthSession();

export const authMode = HAS_SUPABASE ? "supabase" : "dev";

export { toE164 } from "./phone";

async function adopt(token: string, userId: string, provider: "dev" | "supabase") {
  await useSession.getState().setSession({ token, userId, provider });
  await queryClient.invalidateQueries();
}

// Keep the server token fresh when Supabase rotates the access token.
supabase?.auth.onAuthStateChange((_e, session) => {
  if (session) void useSession.getState().setSession({ token: session.access_token, userId: session.user.id, provider: "supabase" });
});

export async function playAsGuest() {
  if (supabase) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) throw new Error(error?.message ?? "Couldn't start a guest session");
    await adopt(data.session.access_token, data.user!.id, "supabase");
  } else {
    const r = await api.post<{ token: string; userId: string }>("/auth/dev", { guest: true });
    await adopt(r.token, r.userId, "dev");
  }
  analytics.track("guest_started");
}

/** Dev-only sign in (no Supabase keys). Upgrades the current guest in place if there is one. */
export async function devSignIn(username?: string) {
  const s = useSession.getState();
  if (s.token) {
    const r = await api.post<{ token: string; userId: string }>("/auth/dev/upgrade");
    await adopt(r.token, r.userId, "dev");
    return;
  }
  const r = await api.post<{ token: string; userId: string }>("/auth/dev", { guest: false, username });
  await adopt(r.token, r.userId, "dev");
}

const isAnonymousSession = async () => !!(await supabase?.auth.getUser())?.data.user?.is_anonymous;

export async function sendPhoneOtp(phoneE164: string) {
  if (!supabase) throw new Error("Phone sign-in needs Supabase keys");
  // A guest links the phone to the same account (keeps progress); otherwise a normal OTP sign-in.
  const { error } = (await isAnonymousSession()) ? await supabase.auth.updateUser({ phone: phoneE164 }) : await supabase.auth.signInWithOtp({ phone: phoneE164 });
  if (error) throw new Error(error.message);
}

export async function verifyPhoneOtp(phoneE164: string, code: string) {
  if (!supabase) throw new Error("Phone sign-in needs Supabase keys");
  const linking = await isAnonymousSession();
  const { data, error } = await supabase.auth.verifyOtp({ phone: phoneE164, token: code, type: linking ? "phone_change" : "sms" });
  if (error || !data.session) throw new Error(error?.message ?? "That code didn't work");
  await adopt(data.session.access_token, data.session.user.id, "supabase");
  analytics.track("signed_in", { method: "phone" });
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Google sign-in needs Supabase keys");
  const redirectTo = Linking.createURL("/auth/callback");
  const linking = await isAnonymousSession();
  if (Platform.OS === "web") {
    const { error } = linking ? await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } }) : await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) throw new Error(error.message);
    return;
  }
  const { data, error } = linking
    ? await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } })
    : await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data?.url) throw new Error(error?.message ?? "Google sign-in failed");
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== "success") throw new Error("Sign-in cancelled");
  const params = new URLSearchParams(res.url.split("#")[1] ?? res.url.split("?")[1] ?? "");
  const code = params.get("code");
  if (code) {
    const ex = await supabase.auth.exchangeCodeForSession(code);
    if (ex.error) throw new Error(ex.error.message);
  } else if (params.get("access_token")) {
    await supabase.auth.setSession({ access_token: params.get("access_token")!, refresh_token: params.get("refresh_token") ?? "" });
  }
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new Error("Google sign-in failed");
  await adopt(s.session.access_token, s.session.user.id, "supabase");
  analytics.track("signed_in", { method: "google" });
}

export const appleAvailable = () => (Platform.OS === "ios" ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false));

export async function signInWithApple() {
  if (!supabase) throw new Error("Apple sign-in needs Supabase keys");
  const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME] });
  if (!cred.identityToken) throw new Error("Apple didn't return a token");
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken });
  if (error || !data.session) throw new Error(error?.message ?? "Apple sign-in failed");
  await adopt(data.session.access_token, data.session.user.id, "supabase");
  analytics.track("signed_in", { method: "apple" });
}

export async function signOut() {
  await supabase?.auth.signOut().catch(() => {});
  await useSession.getState().clear();
  queryClient.clear();
}
