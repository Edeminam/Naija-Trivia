import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useSession } from "../stores/session";
import { useMe } from "../features/me";
import { useTheme } from "../theme/ThemeProvider";
import { ErrorState } from "../ui";

/** Splash router: signed in → Home (or finish onboarding), else → Onboarding. */
export default function Index() {
  const token = useSession((s) => s.token);
  const me = useMe();
  const { c } = useTheme();
  if (!token) return <Redirect href="/onboarding" />;
  if (me.data) return <Redirect href={me.data.profile.onboarded || me.data.profile.isGuest ? "/home" : "/onboarding/profile"} />;
  if (me.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ErrorState offline={(me.error as any)?.offline} onRetry={() => me.refetch()} />
      </View>
    );
  }
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator color={c.primary} />
    </View>
  );
}
