import { Redirect, Tabs } from "expo-router";
import { TabBar } from "../../ui";
import { useSession } from "../../stores/session";
import { useTheme } from "../../theme/ThemeProvider";

export default function TabsLayout() {
  const token = useSession((s) => s.token);
  const { c } = useTheme();
  if (!token) return <Redirect href="/onboarding" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg }, animation: "fade" }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="leagues" />
      <Tabs.Screen name="state-wars" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
